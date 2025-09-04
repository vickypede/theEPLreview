"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Article, Club } from "@/types";

type UiArticle = Article & { sourceName?: string; source?: string };

type ClubTile = {
  id: string;
  name: string;
  badgeUrl?: string;
  latest: UiArticle[]; // up to 3 latest articles
};

// --- Club brand colours (used to tint tiles) ---
const CLUB_BRAND: Record<string, string> = {
  arsenal: "#EF0107",
  chelsea: "#034694",
  liverpool: "#C8102E",
  "manchester-city": "#6CABDD",
  "manchester-united": "#DA291C",
  tottenham: "#132257",
  "aston-villa": "#670E36",
  newcastle: "#241F20",
  brighton: "#0057B8",
  "west-ham": "#7A263A",
  wolves: "#FDB913",
  everton: "#003399",
};

function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  const bigint = parseInt(h, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export default function Landing() {
  // ---- NEWS state (from Landing2) ----
  const [latestNews, setLatestNews] = useState<UiArticle[]>([]);
  const [clubs, setClubs] = useState<ClubTile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        if (!db) return;

        // Latest site-wide news (left list)
        const newsRef = collection(db, "articles");
        const newsQ = query(newsRef, orderBy("publishedAt", "desc"), limit(18));
        const newsSnap = await getDocs(newsQ);
        const newsList = newsSnap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<UiArticle, "id">),
        })) as UiArticle[];

        // Pick six clubs (top6 preferred)
        const clubsRef = collection(db, "clubs");
        const clubsSnap = await getDocs(clubsRef);
        const allClubs = clubsSnap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<Club, "id">),
        })) as Club[];
        const top = allClubs.filter((c) => c.isTop6).slice(0, 6);
        const six = (
          top.length === 6
            ? top
            : allClubs.sort((a, b) => a.name.localeCompare(b.name)).slice(0, 6)
        ).map((c: Club) => ({
          id: c.id,
          name: c.name,
          badgeUrl: c.badgeUrl,
          latest: [],
        })) as ClubTile[];

        // For each club, fetch up to 3 latest articles with graceful fallbacks
        const tiles: ClubTile[] = await Promise.all(
          six.map(async (c) => {
            if (!db) return { ...c, latest: [] } as ClubTile;
            const clubArticlesRef = collection(db, "articles");
            let results: UiArticle[] = [];
            try {
              const primaryQ = query(
                clubArticlesRef,
                where("clubs", "array-contains", c.id),
                orderBy("publishedAt", "desc"),
                limit(3)
              );
              const primarySnap = await getDocs(primaryQ);
              results = primarySnap.docs.map((d) => ({
                id: d.id,
                ...(d.data() as Omit<UiArticle, "id">),
              })) as UiArticle[];
            } catch {
              /* noop */
            }

            if (results.length < 3) {
              try {
                const fallbackQ = query(
                  clubArticlesRef,
                  where("clubs", "array-contains", c.id),
                  orderBy("updatedAt", "desc"),
                  limit(5)
                );
                const fbSnap = await getDocs(fallbackQ);
                const fb = fbSnap.docs.map((d) => ({
                  id: d.id,
                  ...(d.data() as Omit<UiArticle, "id">),
                })) as UiArticle[];
                const existing = new Set(results.map((r) => r.id));
                for (const a of fb)
                  if (!existing.has(a.id) && results.length < 3) results.push(a);
              } catch {
                /* noop */
              }
            }

            if (results.length < 3) {
              try {
                const basicQ = query(
                  clubArticlesRef,
                  where("clubs", "array-contains", c.id),
                  limit(3 - results.length)
                );
                const bSnap = await getDocs(basicQ);
                const b = bSnap.docs.map((d) => ({
                  id: d.id,
                  ...(d.data() as Omit<UiArticle, "id">),
                })) as UiArticle[];
                const existing = new Set(results.map((r) => r.id));
                for (const a of b)
                  if (!existing.has(a.id) && results.length < 3) results.push(a);
              } catch {
                /* noop */
              }
            }

            return { ...c, latest: results } as ClubTile;
          })
        );

        if (mounted) {
          setLatestNews(newsList);
          setClubs(tiles);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, []);

  const latestForList: (UiArticle | null)[] = loading
    ? Array.from({ length: 18 }, () => null)
    : latestNews.slice(0, 18);

  // Mobile pager: 4 pages, 5 items each
  const mobilePages: (UiArticle | null)[][] = [
    latestForList.slice(0, 5),
    latestForList.slice(5, 10),
    latestForList.slice(10, 15),
    latestForList.slice(15, 20),
  ];
  const [mobilePage, setMobilePage] = useState(0);
  const pagerRef = useRef<HTMLDivElement | null>(null);
  function onPagerScroll(e: React.UIEvent<HTMLDivElement>) {
    const el = e.currentTarget;
    if (!el) return;
    const idx = Math.round(el.scrollLeft / el.clientWidth);
    if (idx !== mobilePage) setMobilePage(idx);
  }

  const clubTiles: (ClubTile | null)[] = loading
    ? Array.from({ length: 6 }, () => null)
    : clubs;

  if (!db) return null;

  return (
    <div className="min-h-screen surface">
      {/* ======================= NEWS (merged from Landing2) ======================= */}
      <section className="pt-8 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Latest headlines list (18 items; swipeable on mobile) */}
            <aside className="lg:col-span-1 card border-0 flex flex-col min-h-[460px]">
              <div className="px-4 py-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-foreground">LATEST NEWS</h2>
                  {/* mobile-only "see all" like Landing2 */}
                  <Link
                    href="/news"
                    className="md:hidden text-sm font-semibold"
                    style={{ color: "#75bc7a" }}
                  >
                    see all →
                  </Link>
                </div>
              </div>
              {/* Mobile: swipeable pager (3 pages x 6 items) */}
              <div
                ref={pagerRef}
                onScroll={onPagerScroll}
                className="md:hidden overflow-x-auto snap-x snap-mandatory scroll-smooth no-scrollbar"
              >
                <div className="flex">
                  {mobilePages.map((page, pageIndex) => (
                    <div key={pageIndex} className="min-w-full snap-start">
                      <ul>
                        {page.map((a, i) => (
                          <li
                            key={(a as UiArticle)?.id ?? `${pageIndex}-${i}`}
                            className="px-4 py-2 relative after:content-[''] after:absolute after:inset-x-4 after:bottom-0 after:h-px after:bg-[#1c1c1c] last:after:hidden"
                          >
                            {a ? (
                              <Link
                                href={(a as UiArticle).url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block"
                              >
                                <div className="text-xs text-muted-foreground mb-0.5">
                                  {(a as UiArticle).publishedAt
                                    ? timeSince(
                                        (a as UiArticle).publishedAt.toDate()
                                      )
                                    : ""}
                                </div>
                                <div className="text-sm text-foreground font-medium leading-snug">
                                  {(a as UiArticle).title}
                                </div>
                              </Link>
                            ) : (
                              <div className="animate-pulse">
                                <div className="h-3 w-24 surface-2 rounded mb-2" />
                                <div className="h-4 w-5/6 surface-2 rounded" />
                              </div>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
              {/* Mobile dots */}
              <div className="md:hidden flex items-center justify-center gap-2 py-2">
                {mobilePages.map((_, idx) => (
                  <button
                    key={idx}
                    aria-label={`Go to page ${idx + 1}`}
                    onClick={() => {
                      const el = pagerRef.current;
                      if (!el) return;
                      el.scrollTo({
                        left: idx * el.clientWidth,
                        behavior: "smooth",
                      });
                      setMobilePage(idx);
                    }}
                    className={`h-2 w-2 rounded-full ${
                      mobilePage === idx ? "bg-foreground" : "bg-border"
                    }`}
                  />
                ))}
              </div>

              {/* Desktop list */}
              <div className="hidden md:flex flex-1 min-h-0">
                <div className="h-full max-h-96 overflow-y-auto no-scrollbar w-full">
                  <ul>
                    {latestForList.map((a, i) => (
                      <li
                        key={a?.id ?? i}
                        className="px-4 py-2 relative after:content-[''] after:absolute after:inset-x-4 after:bottom-0 after:h-px after:bg-[#1c1c1c] last:after:hidden"
                      >
                        {a ? (
                          <Link
                            href={a.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block"
                          >
                            <div className="text-xs text-muted-foreground mb-0.5">
                              {a.publishedAt ? timeSince(a.publishedAt.toDate()) : ""}
                            </div>
                            <div className="text-sm text-foreground font-medium leading-snug">
                              {a.title}
                            </div>
                          </Link>
                        ) : (
                          <div className="animate-pulse">
                            <div className="h-3 w-24 surface-2 rounded mb-2" />
                            <div className="h-4 w-5/6 surface-2 rounded" />
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* See all (desktop) */}
              <div className="mt-[3px] px-4 pb-[3px] hidden md:flex justify-center">
                <Link
                  href="/news"
                  className="inline-flex items-center gap-1 text-sm font-semibold"
                  style={{ color: "#3e5e5b" }}
                >
                  <span>see all</span>
                  <span aria-hidden>→</span>
                </Link>
              </div>
            </aside>

            {/* Right: 6 club tiles */}
            <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {clubTiles.map((c, i) => {
                const brand = c?.id ? CLUB_BRAND[c.id] ?? "#4f46e5" : "#4f46e5";
                const tint = hexToRgba(brand, 0.04);
                return (
                  <article
                    key={c?.id ?? i}
                    className="card border-0 p-0 flex flex-col"
                    style={{ backgroundImage: `linear-gradient(180deg, ${tint}, transparent)` }}
                  >
                    <div className="p-4 flex flex-col gap-3">
                      <div className="flex items-center gap-3">
                        {c?.badgeUrl ? (
                          <img
                            src={c.badgeUrl}
                            alt={`${c.name} crest`}
                            className="w-9 h-9 object-contain rounded-full"
                            style={{
                              outline: `2px solid ${hexToRgba(brand, 0.35)}`,
                              outlineOffset: 0,
                              backgroundColor: hexToRgba("#000000", 0.04),
                            }}
                          />
                        ) : (
                          <div className="w-9 h-9 surface-2 rounded border border-border" />
                        )}
                        <Link
                          href={c ? `/clubs/${c.id}` : "#"}
                          className="text-base font-bold hover:underline text-white"
                        >
                          {c?.name ?? "Club"}
                        </Link>
                      </div>

                      {/* Articles list: first item on mobile; up to 3 on md+ */}
                      <div className="mt-1">
                        {c?.latest && c.latest.length > 0 ? (
                          <ul className="divide-y divide-border">
                            {c.latest.slice(0, 1).map((a) => (
                              <li key={a.id} className="py-2">
                                <Link
                                  href={a.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-sm text-foreground line-clamp-2"
                                  style={{ color: "inherit" }}
                                >
                                  {a.title}
                                </Link>
                              </li>
                            ))}
                            {c.latest.slice(1, 3).map((a) => (
                              <li key={a.id} className="py-2 hidden md:block">
                                <Link
                                  href={a.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-sm text-foreground line-clamp-2"
                                  style={{ color: "inherit" }}
                                >
                                  {a.title}
                                </Link>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <div className="text-sm text-muted-foreground">
                            No recent article
                          </div>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </div>
      </section>
      {/* ===================== /NEWS ===================== */}

      {/* ================== EDITORIALS & ANALYSIS ================== */}
      <section className="py-16 surface-2">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-lg font-bold text-foreground">
              EDITORIALS & ANALYSIS
            </h2>
            <Link
              href="/editorials"
              className="text-primary hover:text-foreground font-semibold text-lg"
            >
              see all →
            </Link>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[
              {
                type: "Final Whistle",
                title: "Victors & Vanquished",
                desc: "Weekend conclusions and key takeaways",
              },
              {
                type: "Matchday Radar",
                title: "Pre-Match Analysis",
                desc: "Storylines and tactics ahead of fixtures",
              },
              {
                type: "Full-Time Verdict",
                title: "Post-Match Review",
                desc: "Big-match analysis ~2 hours after FT",
              },
              {
                type: "Pretender List",
                title: "Fraud Watch",
                desc: "Call-outs of overrated players/managers",
              },
              {
                type: "High Press",
                title: "House Opinion",
                desc: "Punchy takes and editorial voice",
              },
              {
                type: "Weekend Roundup",
                title: "Complete Coverage",
                desc: "All the weekend's biggest stories",
              },
            ].map((publication, i) => (
              <div
                key={i}
                className="bg-card rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow border border-border"
              >
                <div className="inline-block px-3 py-1 rounded-full text-xs font-semibold mb-3 bg-muted text-muted-foreground border border-border">
                  {publication.type}
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {publication.title}
                </h3>
                <p className="text-muted-foreground text-sm mb-4">
                  {publication.desc}
                </p>
                <div className="surface-3 rounded-lg p-3 mb-4 border border-border">
                  <p className="text-muted-foreground text-xs">
                    Content will appear here once publications are created
                  </p>
                </div>
                <button className="text-primary hover:text-foreground text-sm font-medium">
                  Coming Soon →
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================== MAILBOX ================== */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-lg font-bold text-foreground">MAILBOX</h2>
            <Link
              href="/mailbox"
              className="text-primary hover:text-foreground font-semibold text-lg"
            >
              see all →
            </Link>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[
              { title: "Fan Question", desc: "Reader asks about tactical changes" },
              { title: "Transfer Talk", desc: "Fan perspective on latest rumors" },
              { title: "Match Reaction", desc: "Supporter thoughts on weekend games" },
            ].map((item, i) => (
              <div
                key={i}
                className="bg-card rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
              >
                <div className="text-center">
                  <div className="surface-2 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center border border-border">
                    <span className="text-2xl">✉️</span>
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    {item.title}
                  </h3>
                  <p className="text-muted-foreground text-sm mb-4">{item.desc}</p>
                  <div className="surface-3 rounded-lg p-3 mb-4 border border-border">
                    <p className="text-muted-foreground text-xs">
                      Fan letter content will appear here
                    </p>
                  </div>
                  <button className="text-primary hover:text-foreground text-sm font-medium">
                    Coming Soon →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================== MATCH REPORTS ================== */}
      <section className="py-16 surface-2">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-lg font-bold text-foreground">MATCH REPORTS</h2>
            <Link
              href="/match-reports"
              className="text-primary hover:text-foreground font-semibold text-lg"
            >
              see all →
            </Link>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[
              { title: "Arsenal vs Chelsea", desc: "Tactical breakdown of key moments" },
              { title: "Manchester Derby", desc: "Analysis of United vs City clash" },
              { title: "Liverpool vs Tottenham", desc: "Post-match insights and stats" },
            ].map((report, i) => (
              <div
                key={i}
                className="surface-3 rounded-lg p-6 border-2 border-dashed border-border"
              >
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    {report.title}
                  </h3>
                  <p className="text-muted-foreground text-sm mb-4">
                    {report.desc}
                  </p>
                  <div className="surface-2 rounded-lg p-4 mb-4 border border-border">
                    <p className="text-muted-foreground text-xs">
                      Match Report Content Placeholder
                    </p>
                  </div>
                  <button className="text-primary hover:text-foreground text-sm font-medium">
                    Coming Soon →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================== BIG MATCH REVIEW ================== */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-lg font-bold text-foreground">BIG MATCH REVIEW</h2>
            <Link
              href="/big-match-review"
              className="text-primary hover:text-foreground font-semibold text-lg"
            >
              see all →
            </Link>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[
              { title: "Title Race Analysis", desc: "Impact on Premier League standings" },
              { title: "Champions League Race", desc: "Top 4 battle implications" },
              { title: "Relegation Battle", desc: "Bottom of table drama" },
            ].map((review, i) => (
              <div
                key={i}
                className="bg-card rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
              >
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    {review.title}
                  </h3>
                  <p className="text-muted-foreground text-sm mb-4">{review.desc}</p>
                  <div className="surface-2 rounded-lg p-4 mb-4 border border-border">
                    <p className="text-muted-foreground text-xs">
                      Big Match Review Content Placeholder
                    </p>
                  </div>
                  <button className="text-primary hover:text-foreground text-sm font-medium">
                    Coming Soon →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================== SITE PRODUCTS ================== */}
      <section className="py-16 surface-2">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-lg font-bold text-foreground text-center mb-12">
            SITE PRODUCTS
          </h2>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            {[
              { title: "Fantasy League", desc: "Premier League fantasy football", icon: "🏆" },
              { title: "Transfer Tracker", desc: "Live transfer updates and rumors", icon: "🔄" },
              { title: "Stats Hub", desc: "Comprehensive player and team statistics", icon: "📊" },
              { title: "Live Scores", desc: "Real-time match updates and scores", icon: "⚽" },
            ].map((product, i) => (
              <div key={i} className="text-center">
                <div className="surface-2 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center border border-border">
                  <span className="text-2xl">{product.icon}</span>
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {product.title}
                </h3>
                <p className="text-muted-foreground text-sm mb-4">{product.desc}</p>
                <button className="text-primary hover:text-foreground text-sm font-medium">
                  Coming Soon →
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>
      {/* ================== /SITE PRODUCTS ================== */}
    </div>
  );
}

function timeSince(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  const minutes = Math.floor(seconds / 60);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}
