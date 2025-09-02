/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import { setGlobalOptions } from "firebase-functions";
import { onRequest } from "firebase-functions/https";
import * as admin from "firebase-admin";
import Parser from "rss-parser";
import * as cheerio from "cheerio";
import * as crypto from "crypto";
import sourcesPayload from "./seed/sources.json";
import clubsPayload from "./seed/clubs.json";
export { cleanupOldArticles } from "./cleanup";

if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();

// Feature flags
const USE_SELF_HTML = process.env.USE_SELF_HTML === "1"; // prefer internal renderer over Firecrawl
const ENABLE_HEADLESS = process.env.ENABLE_HEADLESS === "1"; // allow Puppeteer fallback

function hostToName(u: string) {
  try {
    return new URL(u).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

async function fetchHtmlDirect(url: string): Promise<string | null> {
  try {
    const resp = await fetch(url, {
      redirect: "follow",
      headers: {
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
          "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "accept-language": "en-US,en;q=0.9",
      },
    });
    if (!resp.ok) return null;
    return await resp.text();
  } catch {
    return null;
  }
}

async function renderWithPuppeteer(url: string): Promise<string | null> {
  if (!ENABLE_HEADLESS) return null;
  try {
    const puppeteer = await import("puppeteer");
    const browser = await puppeteer.launch({
      headless: "new" as any,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    try {
      const page = await browser.newPage();
      await page.setUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
          "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      );
      await page.goto(url, { waitUntil: "networkidle2", timeout: 45000 });
      const html = await page.content();
      return html;
    } finally {
      await browser.close();
    }
  } catch {
    return null;
  }
}

async function getHtmlSmart(url: string): Promise<string | null> {
  const raw = await fetchHtmlDirect(url);
  if (raw && /og:title|application\/ld\+json|<title>/i.test(raw)) return raw;
  return await renderWithPuppeteer(url);
}

function extractArticleMeta(html: string, url: string) {
  const $ = cheerio.load(html);

  let title =
    $("meta[property='og:title']").attr("content")?.trim() ||
    $("title").first().text().trim() ||
    "";

  let siteName =
    $("meta[property='og:site_name']").attr("content")?.trim() ||
    $("meta[name='application-name']").attr("content")?.trim() ||
    hostToName(url);

  let publishedAt: Date | undefined;
  const tsSelectors = [
    "meta[property='article:published_time']",
    "meta[name='article:published_time']",
    "meta[name='pubdate']",
    "meta[name='date']",
    "meta[name='timestamp']",
    "meta[property='og:updated_time']",
    "time[datetime]",
  ];
  for (const sel of tsSelectors) {
    const v = $(sel).attr("content") || $(sel).attr("datetime");
    if (v) {
      const d = new Date(v);
      if (!Number.isNaN(d.getTime())) {
        publishedAt = d;
        break;
      }
    }
  }

  $("script[type='application/ld+json']").each((_, el) => {
    try {
      const j = JSON.parse($(el).text());
      const arr = Array.isArray(j) ? j : [j];
      for (const node of arr) {
        const t = String(node["@type"] || node.type || "");
        if (/NewsArticle|Article|BlogPosting/i.test(t)) {
          if (!title && node.headline) title = String(node.headline).trim();
          if (!publishedAt && node.datePublished) {
            const d = new Date(node.datePublished);
            if (!Number.isNaN(d.getTime())) publishedAt = d;
          }
          if (!siteName && node.publisher?.name) siteName = String(node.publisher.name).trim();
        }
      }
    } catch {}
  });

  const canonicalUrl = $("link[rel='canonical']").attr("href") || undefined;
  return { title, siteName, publishedAt, canonicalUrl };
}

function absolutizeLinks(baseUrl: string, html: string): string[] {
  const $ = cheerio.load(html);
  const base = new URL(baseUrl);
  const out: string[] = [];
  $("a[href]").each((_, a) => {
    const href = String($(a).attr("href") || "");
    if (!href) return;
    try {
      const u = new URL(href, base);
      if (["http:", "https:"].includes(u.protocol)) out.push(u.toString());
    } catch {}
  });
  return Array.from(new Set(out));
}

// Start writing functions
// https://firebase.google.com/docs/functions/typescript

// For cost control, you can set the maximum number of containers that can be
// running at the same time. This helps mitigate the impact of unexpected
// traffic spikes by instead downgrading performance. This limit is a
// per-function limit. You can override the limit for each function using the
// `maxInstances` option in the function's options, e.g.
// `onRequest({ maxInstances: 5 }, (req, res) => { ... })`.
// NOTE: setGlobalOptions does not apply to functions using the v1 API. V1
// functions should each use functions.runWith({ maxInstances: 10 }) instead.
// In the v1 API, each function can only serve one request per container, so
// this will be the maximum concurrent request count.
setGlobalOptions({ maxInstances: 10 });

function normalizeUrl(rawUrl: string): string {
  try {
    const u = new URL(rawUrl);
    // Remove fragment
    u.hash = "";
    // Lowercase host
    u.hostname = u.hostname.toLowerCase();
    // Default ports
    if ((u.protocol === "http:" && u.port === "80") || (u.protocol === "https:" && u.port === "443")) {
      u.port = "";
    }
    // Strip tracking params
    const params = u.searchParams;
    ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "fbclid"].forEach((p) =>
      params.delete(p),
    );
    u.search = params.toString() ? `?${params.toString()}` : "";
    return u.toString();
  } catch {
    return rawUrl;
  }
}

function makeDeterministicIdFromUrl(rawUrl: string): { id: string; normalizedUrl: string } {
  const normalizedUrl = normalizeUrl(rawUrl);
  const id = crypto.createHash("sha256").update(normalizedUrl).digest("hex");
  return { id, normalizedUrl };
}

// --- Club detection utilities -------------------------------------------------
type ClubDetector = { slug: string; regexes: RegExp[] };

function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function buildClubDetectors(): Promise<ClubDetector[]> {
  try {
    const snap = await db.collection("clubs").get();
    const detectors: ClubDetector[] = [];
    for (const doc of snap.docs) {
      const slug = doc.id;
      const data = (doc.data() as any) || {};
      const names: string[] = Array.isArray(data.names) ? data.names : [];
      // Always include the proper club name (doc id may also work as a keyword)
      const allNames = new Set<string>([slug, ...names]);
      const regexes = Array.from(allNames)
        .filter((n) => n && n.trim().length > 1)
        .map((n) => new RegExp(`\\b${escapeRegExp(n.trim())}\\b`, "i"));
      if (regexes.length > 0) detectors.push({ slug, regexes });
    }
    return detectors;
  } catch {
    return [];
  }
}

function detectClubsFromText(text: string | undefined | null, detectors: ClubDetector[]): string[] {
  if (!text) return [];
  const hits: string[] = [];
  for (const d of detectors) {
    if (d.regexes.some((r) => r.test(text))) hits.push(d.slug);
  }
  return Array.from(new Set(hits));
}

export const ingestRun = onRequest({ timeoutSeconds: 540 }, async (req, res) => {
  try {
    const group = (req.query.group as string) || "all"; // top6 | other14 | all
    const verbose = String(req.query.verbose || "").toLowerCase() === "1" || String(req.query.verbose || "").toLowerCase() === "true";
    const sourcesSnap = await db.collection("sources").where("isActive", "==", true).get();
    let sources = sourcesSnap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));

    // Group filtering using /clubs.isTop6
    if (group === "top6" || group === "other14") {
      const clubsSnap = await db.collection("clubs").get();
      const top6Set = new Set<string>(
        clubsSnap.docs
          .filter((c) => (c.data() as any)?.isTop6)
          .map((c) => c.id),
      );
      const isAnyTop6 = (slugs: string[] | undefined) =>
        (slugs || []).some((s) => top6Set.has(s));
      const isAnyOther14 = (slugs: string[] | undefined) =>
        (slugs || []).some((s) => !top6Set.has(s));

      sources = sources.filter((s: any) => {
        const slugs: string[] = Array.isArray(s.clubSlugs) ? s.clubSlugs : [];
        if (slugs.length === 0) return true; // general sources run in both jobs; dedupe by URL id
        return group === "top6" ? isAnyTop6(slugs) : isAnyOther14(slugs);
      });
    }

    const parser = new Parser();
    const firecrawlBase = process.env.FIRECRAWL_BASE_URL || "https://api.firecrawl.dev";
    const firecrawlApiKey = process.env.FIRECRAWL_API_KEY || undefined; // optional for self-host

    // run-level accounting
    const startedAt = new Date();
    let addedCount = 0;
    let skippedCount = 0;
    const runErrors: string[] = [];
    const errorDetails: Array<{ id: string; type: "rss" | "html"; message: string }> = [];

    // Build club detectors once per run
    const clubDetectors = await buildClubDetectors();

    for (const source of sources) {
      if (source.type === "rss") {
        try {
          const feed = await parser.parseURL(source.url);
          for (const item of feed.items || []) {
            const url = item.link || item.guid || "";
            if (!url) continue;
            const { id, normalizedUrl } = makeDeterministicIdFromUrl(url);
            const ref = db.collection("articles").doc(id);
            const existed = (await ref.get()).exists;

            // Detect clubs from item title/content
            const detectedClubs = detectClubsFromText(
              `${item.title || ""} ${item.contentSnippet || item.content || ""}`,
              clubDetectors,
            );
            const sourceClubs: string[] = Array.isArray(source.clubSlugs) ? source.clubSlugs : [];
            const clubs = Array.from(new Set<string>([...sourceClubs, ...detectedClubs]));
            await ref.set(
              {
                id,
                title: item.title || "",
                url: normalizedUrl,
                summary: item.contentSnippet || item.content || "",
                sourceId: source.id,
                sourceName: source.name,
                clubs,
                publishedAt: item.isoDate ? new Date(item.isoDate) : new Date(),
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
              },
              { merge: true },
            );
            if (existed) skippedCount += 1;
            else addedCount += 1;
          }
          // success path: update source metadata
          await db.collection("sources").doc(source.id).set(
            {
              lastFetchedAt: admin.firestore.FieldValue.serverTimestamp(),
              failureCount: 0,
            },
            { merge: true },
          );
        } catch (err) {
          const errMessage = (err as any)?.message ? String((err as any).message) : String(err);
          // circuit breaker accounting on error
          try {
            await db.runTransaction(async (tx) => {
              const ref = db.collection("sources").doc(source.id);
              const snap = await tx.get(ref);
              const current = (snap.data() as any) || {};
              const failureCount = (current.failureCount || 0) + 1;
              tx.set(
                ref,
                {
                  lastFetchedAt: admin.firestore.FieldValue.serverTimestamp(),
                  failureCount,
                  ...(failureCount >= 10 ? { isActive: false } : {}),
                  lastError: errMessage?.slice(0, 500),
                  lastErrorAt: admin.firestore.FieldValue.serverTimestamp(),
                },
                { merge: true },
              );
            });
          } catch {}
          runErrors.push(`rss:${source.id}`);
          errorDetails.push({ id: source.id, type: "rss", message: errMessage });
        }
      } else if (source.type === "html") {
        try {
          let links: string[] = [];
          if (USE_SELF_HTML) {
            const html = await getHtmlSmart(source.url);
            if (!html) throw new Error("no html");
            links = absolutizeLinks(source.url, html).slice(0, 200);
          } else {
            const resp = await fetch(`${firecrawlBase}/v2/scrape`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                ...(firecrawlApiKey ? { Authorization: `Bearer ${firecrawlApiKey}` } : {}),
              } as any,
              body: JSON.stringify({ url: source.url, formats: ["links"] }),
            });
            if (!resp.ok) throw new Error(`Firecrawl error ${resp.status}`);
            const data: any = await resp.json();
            links = data?.data?.links || [];
          }

          for (const url of links) {
            const { id, normalizedUrl } = makeDeterministicIdFromUrl(url);
            let title = "";
            let publishedAt: Date | null = null;

            try {
              let pageHtml: string | null = null;
              if (USE_SELF_HTML) {
                pageHtml = await getHtmlSmart(normalizedUrl);
              } else {
                const pageResp = await fetch(`${firecrawlBase}/v2/scrape`, {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    ...(firecrawlApiKey ? { Authorization: `Bearer ${firecrawlApiKey}` } : {}),
                  } as any,
                  body: JSON.stringify({ url: normalizedUrl, formats: ["html"] }),
                });
                if (pageResp.ok) {
                  const pageData: any = await pageResp.json();
                  pageHtml = pageData?.data?.html || null;
                }
              }

              if (pageHtml) {
                const meta = extractArticleMeta(pageHtml, normalizedUrl);
                title = meta.title || "";
                if (meta.publishedAt) publishedAt = meta.publishedAt;
                // prefer canonical URL when present
                if (meta.canonicalUrl) {
                  try {
                    const canonicalAbs = new URL(meta.canonicalUrl, normalizedUrl).toString();
                    const r = makeDeterministicIdFromUrl(canonicalAbs);
                    // If canonical differs, switch to canonical id/url
                    if (r.id !== id) {
                      // check if canonical already exists to dedupe
                      const canonicalRef = db.collection("articles").doc(r.id);
                      const exists = (await canonicalRef.get()).exists;
                      if (exists) {
                        // skip creating duplicate
                        skippedCount += 1;
                        continue;
                      }
                    }
                  } catch {}
                }
              }
            } catch {}

            const ref = db.collection("articles").doc(id);
            const existed = (await ref.get()).exists;

            // Detect clubs from title (and possibly surrounding context later)
            const detectedClubs = detectClubsFromText(title, clubDetectors);
            const sourceClubs: string[] = Array.isArray(source.clubSlugs) ? source.clubSlugs : [];
            const clubs = Array.from(new Set<string>([...sourceClubs, ...detectedClubs]));
            await ref.set(
              {
                id,
                title,
                url: normalizedUrl,
                summary: "",
                sourceId: source.id,
                sourceName: source.name,
                clubs,
                publishedAt: publishedAt ?? new Date(),
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
              },
              { merge: true },
            );
            if (existed) skippedCount += 1;
            else addedCount += 1;
          }
          // success path: update source metadata
          await db.collection("sources").doc(source.id).set(
            {
              lastFetchedAt: admin.firestore.FieldValue.serverTimestamp(),
              failureCount: 0,
            },
            { merge: true },
          );
        } catch (err) {
          const errMessage = (err as any)?.message ? String((err as any).message) : String(err);
          // circuit breaker accounting on error
          try {
            await db.runTransaction(async (tx) => {
              const ref = db.collection("sources").doc(source.id);
              const snap = await tx.get(ref);
              const current = (snap.data() as any) || {};
              const failureCount = (current.failureCount || 0) + 1;
              tx.set(
                ref,
                {
                  lastFetchedAt: admin.firestore.FieldValue.serverTimestamp(),
                  failureCount,
                  ...(failureCount >= 10 ? { isActive: false } : {}),
                  lastError: errMessage?.slice(0, 500),
                  lastErrorAt: admin.firestore.FieldValue.serverTimestamp(),
                },
                { merge: true },
              );
            });
          } catch {}
          runErrors.push(`html:${source.id}`);
          errorDetails.push({ id: source.id, type: "html", message: errMessage });
        }
      }
    }

    // Write run summary
    const finishedAt = new Date();
    await db.collection("ingestion_runs").add({
      startedAt,
      finishedAt,
      job: group,
      processedSources: sources.length,
      addedCount,
      skippedCount,
      errors: runErrors,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    if (addedCount === 0) {
      console.warn(`Ingestion run produced 0 new items for group=${group}`);
    }

    const baseResp: any = { ok: true, processed: sources.length, group, addedCount, skippedCount, errors: runErrors.length };
    if (verbose) baseResp.errorDetails = errorDetails;
    res.json(baseResp);
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e?.message || String(e) });
  }
});

export const seedSourcesHttp = onRequest({ timeoutSeconds: 300 }, async (_req, res) => {
  try {
    const payload = sourcesPayload as Record<string, any>;

    const batch = db.batch();
    for (const [id, data] of Object.entries(payload)) {
      const ref = db.collection("sources").doc(id);
      batch.set(ref, {
        id,
        name: data.name,
        type: data.type,
        url: data.url,
        clubSlugs: Array.isArray(data.clubSlugs) ? data.clubSlugs : [],
        isActive: data.isActive ?? true,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
    }
    await batch.commit();
    res.json({ ok: true, count: Object.keys(payload).length });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e?.message || String(e) });
  }
});

// Seed or upsert clubs (names/nicknames) for detection
export const seedClubsHttp = onRequest({ timeoutSeconds: 300 }, async (_req, res) => {
  try {
    const payload = clubsPayload as Record<string, any>;
    const batch = db.batch();
    for (const [id, data] of Object.entries(payload)) {
      const ref = db.collection("clubs").doc(id);
      batch.set(ref, {
        id,
        name: data.name,
        isTop6: Boolean(data.isTop6),
        names: Array.isArray(data.names) ? data.names : [],
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
    }
    await batch.commit();
    res.json({ ok: true, count: Object.keys(payload).length });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e?.message || String(e) });
  }
});
