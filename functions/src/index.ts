/**
 * Supported triggers: https://firebase.google.com/docs/functions
 *
 * Drop-in replacement for functions/src/index.ts
 * - Keeps existing logic
 * - HARDENS HTML ingestion to avoid non-news pages
 * - Adds per-source badPathRegex + maxAgeHours (optional)
 * - Default HTML freshness window = 48h
 * - NEW: Path-crumb lock + shallow BFS within crumb (no site-wide roaming)
 * - NEW: Stronger denylist (tickets/shop/hospitality/membership)
 * - NEW: Publications system (editorial content management)
 */

import { setGlobalOptions } from "firebase-functions";
import { onRequest } from "firebase-functions/https";
import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import Parser from "rss-parser";
import * as cheerio from "cheerio";
import * as crypto from "crypto";
import slugify from "slugify";
import sourcesPayload from "./seed/sources.json";
import clubsPayload from "./seed/clubs.json";
export { cleanupOldArticles } from "./cleanup";

if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

// -----------------------------------------------------------------------------
// Timing / date safety
// -----------------------------------------------------------------------------
const MAX_FUTURE_DRIFT_MS = 12 * 60 * 60 * 1000; // 12 hours future tolerance
const MAX_PAST_AGE_MS = 365 * 24 * 60 * 60 * 1000; // 1 year (optional lower bound)

// -----------------------------------------------------------------------------
// Global concurrency
// -----------------------------------------------------------------------------
setGlobalOptions({ maxInstances: 10 });

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------
type SourceDoc = {
  id: string;
  name: string;
  type: "rss" | "html";
  url: string;
  clubSlugs?: string[];
  isActive?: boolean;
  includePathRegex?: string; // optional narrowing for HTML section pages
  needsJs?: boolean; // allow headless for this source

  // NEW (optional): per-source denylist and freshness override for HTML
  badPathRegex?: string;
  maxAgeHours?: number;
};

type ClubDoc = {
  id: string;
  name?: string;
  isTop6?: boolean;
  isCurrentPremierLeague?: boolean;
  names?: string[];
  ambiguous?: string[];
  badgeUrl?: string;
  season?: string;
};

type RuntimeConfig = {
  enableHeadlessGlobal?: boolean;
  headlessDailyWindow?: { startHourUTC: number; durationMinutes: number };
  badPathRegex?: string; // site-wide "non-article" paths to exclude
};

// -----------------------------------------------------------------------------
// Utilities
// -----------------------------------------------------------------------------
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

// Headless is optional and controlled dynamically at runtime.
async function renderWithPuppeteer(url: string, enableHeadless: boolean): Promise<string | null> {
  if (!enableHeadless) return null;
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

async function getHtmlSmart(
  url: string,
  opts: { allowHeadless: boolean; headlessEnabled: boolean },
): Promise<string | null> {
  const raw = await fetchHtmlDirect(url);
  if (raw && /og:title|application\/ld\+json|<title>/i.test(raw)) return raw;
  return await renderWithPuppeteer(url, opts.allowHeadless && opts.headlessEnabled);
}

// Prefer real published fields; keep updated separate; fallback only if needed
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
  let updatedAt: Date | undefined;

  const pubSelectors = [
    "meta[property='article:published_time']",
    "meta[name='article:published_time']",
    "meta[name='pubdate']",
    "time[datetime]", // can be ambiguous on some sites
  ];
  const updSelectors = ["meta[property='og:updated_time']", "meta[name='updated_time']"];

  for (const sel of pubSelectors) {
    const v = $(sel).attr("content") || $(sel).attr("datetime");
    if (v) {
      const d = new Date(v);
      if (!Number.isNaN(d.getTime())) {
        publishedAt = d;
        break;
      }
    }
  }

  for (const sel of updSelectors) {
    const v = $(sel).attr("content");
    if (v) {
      const d = new Date(v);
      if (!Number.isNaN(d.getTime())) {
        updatedAt = d;
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
          if (!updatedAt && node.dateModified) {
            const d = new Date(node.dateModified);
            if (!Number.isNaN(d.getTime())) updatedAt = d;
          }
          if (!siteName && node.publisher?.name) siteName = String(node.publisher.name).trim();
        }
      }
    } catch {}
  });

  if (!publishedAt && updatedAt) publishedAt = updatedAt; // last resort

  const canonicalUrl = $("link[rel='canonical']").attr("href") || undefined;
  return { title, siteName, publishedAt, updatedAt, canonicalUrl };
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

// --- Stronger link filtering (section pages) ---------------------------------
function filterLinks(
  links: string[],
  sourceUrl: string,
  options: { includePathRegex?: string; badPathRegex?: string; sourceBadPathRegex?: string },
): string[] {
  let host = "";
  try {
    host = new URL(sourceUrl).hostname;
  } catch {}

  const includeRe = options.includePathRegex ? new RegExp(options.includePathRegex, "i") : null;

  // Robust default denylist for non-article/utility sections
  // NEW: extended with tickets/shop/hospitality/membership
  const DEFAULT_BAD =
    /\/(about|contact|privacy|cookies|terms|advertis|marketing|promo|newsletter|subscribe|authors?|contributors?|editorial|policy|brand|company|careers|fixtures?|results?|table|standings|scores?|live(?:-blog)?|video|videos|photo|gallery|galleries|multimedia|podcasts?|shows?|tag|tags|category|categories|topic|topics|search|sitemap|index|tickets?|ticket(?:-)?hub|hospitality|membership|shop|store|login|signin|sign-in|my-account|pricing)(?:\/|$)|(\.xml|\.rss|\.jpg|\.jpeg|\.png|\.gif|\.webp|\.svg)$/i;

  const mergedBad = options.badPathRegex ? new RegExp(options.badPathRegex, "i") : DEFAULT_BAD;
  const sourceBad = options.sourceBadPathRegex ? new RegExp(options.sourceBadPathRegex, "i") : null;

  return links
    .filter((u) => {
      try {
        const uu = new URL(u);
        if (uu.hostname !== host) return false;
        if (mergedBad.test(uu.pathname)) return false;
        if (sourceBad && sourceBad.test(uu.pathname)) return false;
        if (includeRe && !includeRe.test(uu.pathname)) return false;
        return true;
      } catch {
        return false;
      }
    })
    .slice(0, 200);
}

function normalizeUrl(rawUrl: string): string {
  try {
    const u = new URL(rawUrl);
    u.hash = "";
    u.hostname = u.hostname.toLowerCase();
    if ((u.protocol === "http:" && u.port === "80") || (u.protocol === "https:" && u.port === "443")) {
      u.port = "";
    }
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

// --- Club detection ----------------------------------------------------------
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
      if (data.isCurrentPremierLeague !== true) continue;
      const names: string[] = Array.isArray(data.names) ? data.names : [];
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
  for (const d of detectors) if (d.regexes.some((r) => r.test(text))) hits.push(d.slug);
  return Array.from(new Set(hits));
}

// --- Date clamp --------------------------------------------------------------
function clampPublishedAt(d?: Date | null): { value: Date; clamped: boolean } {
  const now = new Date();
  if (!d || Number.isNaN(d.getTime())) return { value: now, clamped: true };
  const diff = d.getTime() - now.getTime();
  if (diff > MAX_FUTURE_DRIFT_MS) return { value: now, clamped: true };
  if (now.getTime() - d.getTime() > MAX_PAST_AGE_MS) return { value: d, clamped: false }; // keep old
  return { value: d, clamped: false };
}

// --- Runtime config (dynamic headless & filters) -----------------------------
async function loadRuntimeConfig(): Promise<RuntimeConfig> {
  try {
    const snap = await db.collection("config").doc("runtime").get();
    return (snap.exists ? (snap.data() as RuntimeConfig) : {}) || {};
  } catch {
    return {};
  }
}

function isWithinWindow(nowUTC: Date, startHourUTC: number, durationMinutes: number): boolean {
  // Build today's window
  const start = new Date(Date.UTC(nowUTC.getUTCFullYear(), nowUTC.getUTCMonth(), nowUTC.getUTCDate(), startHourUTC, 0, 0));
  const end = new Date(start.getTime() + durationMinutes * 60 * 1000);
  if (nowUTC >= start && nowUTC <= end) return true;

  // If window may cross midnight, also check yesterday's window
  const yStart = new Date(start.getTime() - 24 * 60 * 60 * 1000);
  const yEnd = new Date(yStart.getTime() + durationMinutes * 60 * 1000);
  return nowUTC >= yStart && nowUTC <= yEnd;
}

function computeHeadlessEnabled(config: RuntimeConfig, reqQuery: any): boolean {
  // Manual override via query (?headless=1)
  const q = String(reqQuery?.headless || "").toLowerCase();
  if (q === "1" || q === "true") return true;

  if (config.enableHeadlessGlobal) return true;

  const win = config.headlessDailyWindow;
  if (win && Number.isFinite(win.startHourUTC) && Number.isFinite(win.durationMinutes)) {
    return isWithinWindow(new Date(), win.startHourUTC, win.durationMinutes);
  }
  return false;
}

// -----------------------------------------------------------------------------
// NEW: Article likelihood & freshness helpers (HTML path only)
// -----------------------------------------------------------------------------
const TITLE_DENY = /^(about|contact|privacy|cookies|terms|womens?|nwsl|wsl|fixtures?|results?|table|index)\b/i;

function extractMainText(html: string): string {
  const $ = cheerio.load(html);
  const primary =
    $("article").text() ||
    $("[itemprop='articleBody']").text() ||
    $("main").text() ||
    $(".post, .entry-content, .article__content, .c-article__body").text();
  return (primary || "").replace(/\s+/g, " ").trim();
}

function isLikelyArticle(meta: { title?: string; publishedAt?: Date }, html: string): boolean {
  if (!meta.title || TITLE_DENY.test(meta.title.trim())) return false;

  // must have dependable publish time
  if (!meta.publishedAt || Number.isNaN(meta.publishedAt.getTime())) return false;

  // require schema or explicit article:published_time
  const hasSchema =
    /"@type"\s*:\s*"(?:NewsArticle|Article|BlogPosting)"/i.test(html) ||
    /<meta[^>]+article:published_time/i.test(html);

  if (!hasSchema) return false;

  // minimum body length (avoid stubs/indices)
  const text = extractMainText(html);
  const wordCount = text ? text.split(/\s+/).length : 0;
  if (wordCount < 120) return false;

  return true;
}

function withinAgeWindow(date: Date, maxHours: number): boolean {
  const now = Date.now();
  return now - date.getTime() <= maxHours * 3600 * 1000;
}

// -----------------------------------------------------------------------------
// NEW: Path-crumb lock + shallow BFS for section pages
// -----------------------------------------------------------------------------
const DEFAULT_HTML_MAX_DEPTH = 2;
const DEFAULT_HTML_MAX_SECTION_PAGES = 6;

function pathPrefixFromUrl(u: string): string {
  try {
    const { pathname } = new URL(u);
    // normalize: remove trailing slash except root
    return pathname === "/" ? "/" : pathname.replace(/\/+$/, "");
  } catch {
    return "/";
  }
}

// Build a regex to lock crawling to the crumb. E.g. "/news" => /^\/news(?:\/|$)/i
function buildIncludeRegexFromPrefix(prefix: string): string | null {
  if (!prefix || prefix === "/") return null;
  return `^${escapeRegExp(prefix)}(?:\\/|$)`;
}

// Identify "section navigation" links (pagination/category/tag under the same crumb).
function isSectionNavLink(candidateUrl: string, hostUrl: string, crumbPrefix: string): boolean {
  try {
    const base = new URL(hostUrl);
    const u = new URL(candidateUrl, base);
    if (u.hostname !== base.hostname) return false;
    const p = u.pathname.replace(/\/+$/, "") || "/";
    if (crumbPrefix !== "/" && !p.startsWith(crumbPrefix)) return false;

    // Explicit pagination patterns
    if (/\/page\/\d+\/?$/.test(p)) return true;
    if (/[?&](page|p|pg|start|offset)=\d+/i.test(u.search)) return true;

    // Common section/index tails
    if (p === crumbPrefix) return true;
    if (/\/(category|categories|tag|topic|section|all|archive|archives)\/?$/i.test(p)) return true;

    return false;
  } catch {
    return false;
  }
}

async function gatherLinksWithinCrumb(
  startUrl: string,
  opts: {
    allowHeadless: boolean;
    headlessEnabled: boolean;
    includePathRegex?: string | null;
    badPathRegex?: string;
    sourceBadPathRegex?: string;
    maxDepth?: number;
    maxPages?: number;
  },
): Promise<string[]> {
  const includeStr = opts.includePathRegex || null;

  const crumbPrefix = pathPrefixFromUrl(startUrl);
  const visitedPages = new Set<string>();
  const queue: Array<{ url: string; depth: number }> = [{ url: startUrl, depth: 0 }];
  const candidateLinks = new Set<string>();

  const maxDepth = Number.isFinite(opts.maxDepth) ? (opts.maxDepth as number) : DEFAULT_HTML_MAX_DEPTH;
  const maxPages = Number.isFinite(opts.maxPages) ? (opts.maxPages as number) : DEFAULT_HTML_MAX_SECTION_PAGES;

  while (queue.length && visitedPages.size < maxPages) {
    const node = queue.shift()!;
    const pageUrl = node.url;
    if (visitedPages.has(pageUrl)) continue;
    visitedPages.add(pageUrl);

    const html = await getHtmlSmart(pageUrl, {
      allowHeadless: opts.allowHeadless,
      headlessEnabled: opts.headlessEnabled,
    });
    if (!html) continue;

    let links = absolutizeLinks(pageUrl, html);
    links = filterLinks(links, startUrl, {
      includePathRegex: includeStr ?? buildIncludeRegexFromPrefix(crumbPrefix) ?? undefined,
      badPathRegex: opts.badPathRegex,
      sourceBadPathRegex: opts.sourceBadPathRegex,
    });

    for (const l of links) candidateLinks.add(l);

    if (node.depth < maxDepth) {
      for (const l of links) {
        if (visitedPages.size >= maxPages) break;
        if (isSectionNavLink(l, startUrl, crumbPrefix)) {
          // Enqueue section pages only; article pages will be processed via candidateLinks anyway
          queue.push({ url: l, depth: node.depth + 1 });
        }
      }
    }
  }

  // If a crumb is defined, remove any candidates not under that crumb (defense-in-depth)
  if (crumbPrefix !== "/") {
    return Array.from(candidateLinks).filter((u) => {
      try {
        const p = new URL(u).pathname;
        return p.startsWith(crumbPrefix);
      } catch {
        return false;
      }
    });
  }

  // Root crumb → return filtered candidates as-is
  return Array.from(candidateLinks);
}

// -----------------------------------------------------------------------------
// Main ingestion
// -----------------------------------------------------------------------------
export const ingestRun = onRequest({ timeoutSeconds: 540 }, async (req, res) => {
  try {
    const group = (req.query.group as string) || "all"; // top6 | other14 | all
    const verbose =
      String(req.query.verbose || "").toLowerCase() === "1" ||
      String(req.query.verbose || "").toLowerCase() === "true";

    const runtime = await loadRuntimeConfig();
    const headlessEnabled = computeHeadlessEnabled(runtime, req.query);

    const sourcesSnap = await db.collection("sources").where("isActive", "==", true).get();
    let sources: SourceDoc[] = sourcesSnap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));

    const clubsSnap = await db.collection("clubs").get();
    const currentClubs = clubsSnap.docs
      .map((c) => ({ id: c.id, ...(c.data() as any) } as ClubDoc))
      .filter((c) => c.isCurrentPremierLeague === true);
    const currentClubSet = new Set<string>(currentClubs.map((c) => c.id));
    const top6Set = new Set<string>(currentClubs.filter((c) => c.isTop6 === true).map((c) => c.id));
    const other14Set = new Set<string>(currentClubs.filter((c) => c.isTop6 !== true).map((c) => c.id));
    const isAnyCurrent = (slugs: string[] | undefined) => (slugs || []).some((s) => currentClubSet.has(s));

    // Never run club-specific sources for inactive/non-current clubs.
    sources = sources.filter((s: any) => {
      const slugs: string[] = Array.isArray(s.clubSlugs) ? s.clubSlugs : [];
      return slugs.length === 0 || isAnyCurrent(slugs);
    });

    // Group filtering using current /clubs.isTop6
    if (group === "top6" || group === "other14") {
      const isAnyTop6 = (slugs: string[] | undefined) => (slugs || []).some((s) => top6Set.has(s));
      const isAnyOther14 = (slugs: string[] | undefined) => (slugs || []).some((s) => other14Set.has(s));
      sources = sources.filter((s: any) => {
        const slugs: string[] = Array.isArray(s.clubSlugs) ? s.clubSlugs : [];
        if (slugs.length === 0) return true; // general sources run in both jobs; dedupe by URL id
        return group === "top6" ? isAnyTop6(slugs) : isAnyOther14(slugs);
      });
    }

    const parser = new Parser();

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

            // Publish time clamp
            const rawPublished = (item as any).isoDate || (item as any).pubDate || null;
            const { value: safePublishedAt, clamped } = clampPublishedAt(rawPublished ? new Date(rawPublished) : null);

            // Tiny title denylist guard
            const title = item.title || "";
            if (TITLE_DENY.test(title)) {
              skippedCount += 1;
              continue;
            }

            await ref.set(
              {
                id,
                title,
                url: normalizedUrl,
                summary: item.contentSnippet || item.content || "",
                sourceId: source.id,
                sourceName: source.name,
                clubs,
                publishedAt: safePublishedAt,
                ...(clamped ? { _rawPublishedAt: rawPublished || null, _note: "clamped_future" } : {}),
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
          // NEW: enforce crumb lock include regex (auto-infer from source.url if not provided)
          const crumbPrefix = pathPrefixFromUrl(source.url);
          const enforcedIncludeReStr = source.includePathRegex || buildIncludeRegexFromPrefix(crumbPrefix) || undefined;

          // NEW: shallow BFS within crumb to collect candidate links (includes pagination pages)
          const links = await gatherLinksWithinCrumb(source.url, {
            allowHeadless: !!source.needsJs,
            headlessEnabled,
            includePathRegex: enforcedIncludeReStr || null,
            badPathRegex: runtime.badPathRegex,
            sourceBadPathRegex: source.badPathRegex,
            maxDepth: DEFAULT_HTML_MAX_DEPTH,
            maxPages: DEFAULT_HTML_MAX_SECTION_PAGES,
          });

          for (const url of links) {
            const { id, normalizedUrl } = makeDeterministicIdFromUrl(url);
            let title = "";
            let publishedAt: Date | null = null;

            try {
              // Fetch candidate page (same headless policy)
              const pageHtml: string | null = await getHtmlSmart(normalizedUrl, {
                allowHeadless: !!source.needsJs,
                headlessEnabled,
              });

              if (pageHtml) {
                const meta = extractArticleMeta(pageHtml, normalizedUrl);
                title = meta.title || "";
                if (meta.publishedAt) publishedAt = meta.publishedAt;

                // Only accept likely news articles
                const looksLikeArticle = isLikelyArticle(
                  { title, publishedAt: publishedAt || undefined },
                  pageHtml,
                );
                if (!looksLikeArticle) {
                  skippedCount += 1;
                  continue;
                }

                // Freshness window (default 48h; per-source override allowed)
                const maxAge = typeof source.maxAgeHours === "number" ? source.maxAgeHours : 48;
                if (!publishedAt || !withinAgeWindow(publishedAt, maxAge)) {
                  skippedCount += 1;
                  continue;
                }

                // Prefer canonical URL when present (dedupe)
                if (meta.canonicalUrl) {
                  try {
                    const canonicalAbs = new URL(meta.canonicalUrl, normalizedUrl).toString();
                    const r = makeDeterministicIdFromUrl(canonicalAbs);
                    if (r.id !== id) {
                      const canonicalRef = db.collection("articles").doc(r.id);
                      const exists = (await canonicalRef.get()).exists;
                      if (exists) {
                        skippedCount += 1;
                        continue;
                      }
                    }
                  } catch {}
                }
              }
            } catch {}

            // Skip non-articles: empty or denied title is a strong signal
            if (!title || TITLE_DENY.test(title)) {
              skippedCount += 1;
              continue;
            }

            const ref = db.collection("articles").doc(id);
            const existed = (await ref.get()).exists;

            // Detect clubs from title
            const detectedClubs = detectClubsFromText(title, clubDetectors);
            const sourceClubs: string[] = Array.isArray(source.clubSlugs) ? source.clubSlugs : [];
            const clubs = Array.from(new Set<string>([...sourceClubs, ...detectedClubs]));

            // Publish time clamp
            const { value: safePublishedAt, clamped } = clampPublishedAt(publishedAt);

            await ref.set(
              {
                id,
                title,
                url: normalizedUrl,
                summary: "",
                sourceId: source.id,
                sourceName: source.name,
                clubs,
                publishedAt: safePublishedAt,
                ...(clamped
                  ? { _rawPublishedAt: publishedAt ? publishedAt.toISOString() : null, _note: "clamped_future" }
                  : {}),
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
      headlessEnabled,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const baseResp: any = {
      ok: true,
      processed: sources.length,
      group,
      addedCount,
      skippedCount,
      errors: runErrors.length,
      headlessEnabled,
    };
    if (verbose) baseResp.errorDetails = errorDetails;
    res.json(baseResp);
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e?.message || String(e) });
  }
});

// -----------------------------------------------------------------------------
// Seed helpers (unchanged, with tiny debug option on sources)
// -----------------------------------------------------------------------------
export const seedSourcesHttp = onRequest({ timeoutSeconds: 300 }, async (req, res) => {
  try {
    const payload = sourcesPayload as Record<string, any>;
    const debug =
      String((req.query as any)?.debug || "").toLowerCase() === "1" ||
      String((req.query as any)?.debug || "").toLowerCase() === "true";

    const batch = db.batch();
    for (const [id, data] of Object.entries(payload)) {
      const ref = db.collection("sources").doc(id);
      batch.set(
        ref,
        {
          id,
          name: data.name,
          type: data.type,
          url: data.url,
          clubSlugs: Array.isArray(data.clubSlugs) ? data.clubSlugs : [],
          includePathRegex: data.includePathRegex || null,
          needsJs: !!data.needsJs,
          // NEW optional fields are passed through if present in seed
          badPathRegex: data.badPathRegex || null,
          maxAgeHours: typeof data.maxAgeHours === "number" ? data.maxAgeHours : null,
          isActive: data.isActive ?? true,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    }
    await batch.commit();
    const ids = Object.keys(payload);
    const base: any = { ok: true, count: ids.length };
    if (debug) base.ids = ids;
    res.json(base);
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e?.message || String(e) });
  }
});

export const seedClubsHttp = onRequest({ timeoutSeconds: 300 }, async (_req, res) => {
  try {
    const payload = clubsPayload as Record<string, any>;
    const batch = db.batch();
    for (const [id, data] of Object.entries(payload)) {
      const ref = db.collection("clubs").doc(id);
      batch.set(
        ref,
        {
          id,
          name: data.name,
          isTop6: Boolean(data.isTop6),
          isCurrentPremierLeague: data.isCurrentPremierLeague === true,
          season: data.season || null,
          names: Array.isArray(data.names) ? data.names : [],
          ambiguous: Array.isArray(data.ambiguous) ? data.ambiguous : [],
          badgeUrl: data.badgeUrl || null,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    }
    await batch.commit();
    res.json({ ok: true, count: Object.keys(payload).length });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e?.message || String(e) });
  }
});

// -----------------------------------------------------------------------------
// NEW: Publications system (editorial content management) — loop-safe version
// -----------------------------------------------------------------------------

function makeSlug(input: string) {
  const base = slugify(input, { lower: true, strict: true, trim: true });
  const short = Math.random().toString(36).slice(2, 6);
  return `${base}-${short}`;
}

function stripMd(md: string) {
  return md
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]*`/g, ' ')
    .replace(/\!\[[^\]]*\]\([^\)]*\)/g, ' ')
    .replace(/\[[^\]]*\]\([^\)]*\)/g, ' ')
    .replace(/[#>*_~`\-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function calcReading(data: { content?: string }) {
  const text = stripMd(data.content ?? '');
  const words = text ? text.split(/\s+/).length : 0;
  const wpm = 220; // conservative default
  const mins = Math.max(1, Math.round(words / wpm));
  return { wordCount: words, readingTime: mins, excerpt: text.slice(0, 160) };
}

// Build a stable hash of only the *editor-controlled* inputs to decide if tidy is needed
function tidyInputHash(after: any) {
  const scheduledAtMs =
    typeof after?.scheduledAt?.toMillis === 'function'
      ? after.scheduledAt.toMillis()
      : typeof after?.scheduledAt === 'number'
        ? after.scheduledAt
        : 0;

  // We purposely DO NOT include publishedAt/updatedAt/createdAt/slug in the hash
  // to avoid re-trigger cascades from server-side timestamps or slug reservation.
  const base = {
    title: String(after?.title || ''),
    content: String(after?.content || ''),
    status: String(after?.status || ''),
    scheduledAt: scheduledAtMs,
    // If editor explicitly wrote an excerpt, we keep it and don't auto-generate
    hasManualExcerpt: Boolean(after?.excerpt && String(after.excerpt).trim()),
  };
  return crypto.createHash('sha1').update(JSON.stringify(base)).digest('hex');
}

// 1) Tidy / enrich on create/update — loop-safe & idempotent
export const publicationsTidy = onDocumentWritten(
  {
    document: 'publications/{id}',
    region: 'us-central1',
    // Avoid automatic retries from transient errors causing extra invocations
    // (We handle idempotency anyway.)
    retry: false,
  },
  async (event) => {
    const before = event.data?.before?.data() as any | undefined;
    const after = event.data?.after?.data() as any | undefined;
    if (!after) return; // deleted

    const ref = event.data!.after!.ref;

    // ----- Idempotency gate: if inputs haven't changed, do nothing -----
    const incomingHash = tidyInputHash(after);
    if (after._tidyHash === incomingHash) {
      // No editor-facing changes since last tidy → exit with no write
      return;
    }

    const updates: Record<string, any> = {};
    const now = admin.firestore.FieldValue.serverTimestamp();

    // timestamps
    if (!before) updates.createdAt = now;
    // NOTE: updatedAt will be set only when we actually have something to update,
    // which we do (the hash differs), preventing infinite loops.

    // ----- Slug: generate once (with reservation), or freeze previous if someone tried to change it -----
    if (!after.slug) {
      let slug = makeSlug(after.title || 'post');
      let tries = 0;
      while (tries < 5) {
        const reserve = db.doc(`slugs/${slug}`);
        const snap = await reserve.get();
        if (!snap.exists) {
          await reserve.set({
            publicationId: ref.id,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          });
          updates.slug = slug;
          break;
        }
        slug = makeSlug(after.title || 'post');
        tries++;
      }
      if (!updates.slug) {
        // fallback if reservation collisions are crazy
        updates.slug = makeSlug(`post-${ref.id.slice(0, 6)}`);
      }
    } else if (before && before.slug && before.slug !== after.slug) {
      // Prevent manual slug edits; restore previous
      updates.slug = before.slug;
    }

    // ----- Reading stats & excerpt (only populate excerpt if editor didn't set one) -----
    const { wordCount, readingTime, excerpt } = calcReading(after);

    if (after.wordCount !== wordCount) updates.wordCount = wordCount;
    if (after.readingTime !== readingTime) updates.readingTime = readingTime;

    if ((!after.excerpt || !String(after.excerpt).trim()) && excerpt) {
      updates.excerpt = excerpt;
    }
    // If editor provided excerpt, we keep it as-is.

    // ----- Status sanity: published must have publishedAt (one-time) -----
    if (after.status === 'published' && !after.publishedAt) {
      updates.publishedAt = now;
    }

    // ----- Commit the tidy marker & timestamps (single write) -----
    updates._tidyHash = incomingHash; // idempotency marker
    updates.tidiedAt = now;
    updates.updatedAt = now;

    await ref.set(updates, { merge: true });
  }
);

// 2) Scheduled publisher (runs every minute)
export const publishDue = onSchedule(
  {
    schedule: 'every 1 minutes',
    timeZone: 'America/Toronto',
    region: 'us-central1',
  },
  async () => {
    const nowTs = admin.firestore.Timestamp.now();
    const snap = await db
      .collection('publications')
      .where('status', '==', 'scheduled')
      .where('scheduledAt', '<=', nowTs)
      .orderBy('scheduledAt', 'asc')
      .limit(50)
      .get();

    if (snap.empty) return;
    const batch = db.batch();
    snap.docs.forEach((doc) => {
      batch.update(doc.ref, {
        status: 'published',
        publishedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    });
    await batch.commit();
  }
);

// 3) Callable to sync admin custom claim based on allowlist
export const syncAdminClaim = onCall({ region: "us-central1" }, async (req) => {
  const uid = req.auth?.uid;
  const email = (req.auth?.token?.email as string | undefined)?.toLowerCase();
  if (!uid || !email) throw new HttpsError("unauthenticated", "Sign in first");

  // Accept either: admins/{email} doc OR a doc in admins collection with field email == email
  const directDoc = await db.doc(`admins/${email}`).get();
  let shouldBeAdmin = directDoc.exists && directDoc.get("isActive") === true;
  if (!shouldBeAdmin) {
    const q = await db
      .collection("admins")
      .where("email", "==", email)
      .where("isActive", "==", true)
      .limit(1)
      .get();
    shouldBeAdmin = !q.empty;
  }

  await admin.auth().setCustomUserClaims(uid, { isAdmin: shouldBeAdmin });
  return { isAdmin: shouldBeAdmin };
});
