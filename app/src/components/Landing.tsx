"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { collection, getDocs, limit, orderBy, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Article, Club } from "@/types";
import Image from "next/image";

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
  // ---- NEWS state ----
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

        // Pick six clubs (top6 preferred → else first 6 alpha)
        const clubsRef = collection(db, "clubs");
        const clubsSnap = await getDocs(clubsRef);
        const allClubs = clubsSnap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Club, "id">) })) as Club[];
        const top = allClubs.filter((c) => c.isTop6).slice(0, 6);
        const six = (top.length === 6 ? top : [...allClubs].sort((a, b) => a.name.localeCompare(b.name)).slice(0, 6)).map((c: Club) => ({
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
              const primaryQ = query(clubArticlesRef, where("clubs", "array-contains", c.id), orderBy("publishedAt", "desc"), limit(3));
              const primarySnap = await getDocs(primaryQ);
              results = primarySnap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<UiArticle, "id">) })) as UiArticle[];
            } catch {
              /* noop */
            }

            if (results.length < 3) {
              try {
                const fallbackQ = query(clubArticlesRef, where("clubs", "array-contains", c.id), orderBy("updatedAt", "desc"), limit(5));
                const fbSnap = await getDocs(fallbackQ);
                const fb = fbSnap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<UiArticle, "id">) })) as UiArticle[];
                const existing = new Set(results.map((r) => r.id));
                for (const a of fb) if (!existing.has(a.id) && results.length < 3) results.push(a);
              } catch {
                /* noop */
              }
            }

            if (results.length < 3) {
              try {
                const basicQ = query(clubArticlesRef, where("clubs", "array-contains", c.id), limit(3 - results.length));
                const bSnap = await getDocs(basicQ);
                const b = bSnap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<UiArticle, "id">) })) as UiArticle[];
                const existing = new Set(results.map((r) => r.id));
                for (const a of b) if (!existing.has(a.id) && results.length < 3) results.push(a);
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

  const latestForList: (UiArticle | null)[] = loading ? Array.from({ length: 18 }, () => null) : latestNews.slice(0, 18);

  // Mobile pager: 4 pages, 5 items each
  const mobilePages: (UiArticle | null)[][] = [latestForList.slice(0, 5), latestForList.slice(5, 10), latestForList.slice(10, 15), latestForList.slice(15, 20)];
  const [mobilePage, setMobilePage] = useState(0);
  const pagerRef = useRef<HTMLDivElement | null>(null);
  function onPagerScroll(e: React.UIEvent<HTMLDivElement>) {
    const el = e.currentTarget;
    if (!el) return;
    const idx = Math.round(el.scrollLeft / el.clientWidth);
    if (idx !== mobilePage) setMobilePage(idx);
  }

  const clubTiles: (ClubTile | null)[] = loading ? Array.from({ length: 6 }, () => null) : clubs;

  // Render even if `db` is unavailable so the rest of the layout/skeletons still show

  return (
    <div className="min-h-screen surface">
      {/* ======================= NEWS ======================= */}
      <section className="section-y pb-6 md:pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 [--club-h:260px] [--club-h-m:220px] [--gap:1.5rem]">
            {/* Left: Latest headlines list */}
            <aside className="lg:col-span-1 card border-0 flex flex-col md:h-auto xl:h-[calc(var(--club-h)*2+var(--gap))]">
              <div className="px-4 py-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-foreground">LATEST NEWS</h2>
                  <Link href="/news" className="md:hidden text-sm font-semibold" style={{ color: "#f25a87" }}>
                    see all →
                  </Link>
                </div>
              </div>

              {/* Mobile pager */}
              <div ref={pagerRef} onScroll={onPagerScroll} className="md:hidden overflow-x-auto snap-x snap-mandatory scroll-smooth no-scrollbar">
                <div className="flex">
                  {mobilePages.map((page, pageIndex) => (
                    <div key={pageIndex} className="min-w-full snap-start">
                      <ul>
                        {page.map((a, i) => (
                          <li key={(a as UiArticle)?.id ?? `${pageIndex}-${i}`} className="px-4 py-2 relative after:content-[''] after:absolute after:inset-x-4 after:bottom-0 after:h-px after:bg-[#1c1c1c] last:after:hidden">
                            {a ? (
                              <Link href={(a as UiArticle).url} target="_blank" rel="noopener noreferrer" className="block">
                                <div className="text-xs text-muted-foreground mb-0.5">
                                  {(a as UiArticle).publishedAt ? timeSince((a as UiArticle).publishedAt.toDate()) : ""}
                                </div>
                                <div className="text-sm text-foreground font-medium leading-snug font-body">{(a as UiArticle).title}</div>
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
                      el.scrollTo({ left: idx * el.clientWidth, behavior: "smooth" });
                      setMobilePage(idx);
                    }}
                    className={`h-2 w-2 rounded-full ${mobilePage === idx ? "bg-foreground" : "bg-border"}`}
                  />
                ))}
              </div>

              {/* Desktop list fills space */}
              <div className="hidden md:block md:flex-1 md:min-h-0">
                <div className="h-full overflow-y-auto no-scrollbar w-full">
                  <ul>
                    {latestForList.map((a, i) => (
                      <li key={a?.id ?? i} className="px-4 py-2 relative after:content-[''] after:absolute after:inset-x-4 after:bottom-0 after:h-px after:bg-[#1c1c1c] last:after:hidden">
                        {a ? (
                          <Link href={a.url} target="_blank" rel="noopener noreferrer" className="block">
                            <div className="text-xs text-muted-foreground mb-0.5">{a.publishedAt ? timeSince(a.publishedAt.toDate()) : ""}</div>
                            <div className="text-sm text-foreground font-medium leading-snug font-body">{a.title}</div>
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
              <div className="px-4 py-3 hidden md:flex justify-center">
                <Link href="/news" className="inline-flex items-center gap-1 text-sm font-semibold" style={{ color: "#f25a87" }}>
                  <span>see all</span>
                  <span aria-hidden>→</span>
                </Link>
              </div>
            </aside>

            {/* Right: Clubs */}
            {/* Mobile: horizontal carousel with fixed-size cards and 3 headlines per card */}
            <div className="lg:col-span-2 md:hidden -mx-4 px-4">
              <div className="flex gap-4 overflow-x-auto no-scrollbar snap-x snap-mandatory">
                {clubTiles.map((c, i) => {
                  const brand = c?.id ? CLUB_BRAND[c.id] ?? "#4f46e5" : "#4f46e5";
                  const tint = hexToRgba(brand, 0.04);
                  return (
                    <article
                      key={c?.id ?? i}
                      className="
                        shrink-0 snap-start
                        w-[78vw]
                        h-[var(--club-h-m)]
                        card border-0 p-0 overflow-hidden
                      "
                      style={{ backgroundImage: `linear-gradient(180deg, ${tint}, transparent)` }}
                    >
                      <div className="p-4 h-full flex flex-col gap-3">
                        {/* Header row */}
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
                            className="text-base font-bold text-white hover:underline truncate max-w-[65%] font-heading"
                            title={c?.name ?? "Club"}
                          >
                            {c?.name ?? "Club"}
                          </Link>
                        </div>

                        {/* Headlines list area */}
                        <div className="flex-1 overflow-hidden">
                          {c?.latest && c.latest.length > 0 ? (
                            <ul className="divide-y divide-border">
                              {c.latest.slice(0, 3).map((a) => (
                                <li key={a.id} className="py-1.5">
                                  <Link
                                    href={a.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm text-foreground leading-snug line-clamp-2 font-body"
                                    style={{ color: "inherit" }}
                                    title={a.title}
                                  >
                                    {a.title}
                                  </Link>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <div className="text-sm text-muted-foreground">No recent article</div>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>

            {/* Desktop / tablet grid (unchanged layout, md+) */}
            <div className="lg:col-span-2 hidden md:grid grid-cols-2 xl:grid-cols-3 gap-6">
              {clubTiles.map((c, i) => {
                const brand = c?.id ? CLUB_BRAND[c.id] ?? "#4f46e5" : "#4f46e5";
                const tint = hexToRgba(brand, 0.04);
                return (
                  <article key={c?.id ?? i} className="card border-0 p-0 flex flex-col xl:h-[var(--club-h)]" style={{ backgroundImage: `linear-gradient(180deg, ${tint}, transparent)` }}>
                    <div className="p-4 flex flex-col gap-3">
                      <div className="flex items-center gap-3">
                        {c?.badgeUrl ? (
                          <img
                            src={c.badgeUrl}
                            alt={`${c.name} crest`}
                            className="w-9 h-9 object-contain rounded-full"
                            style={{ outline: `2px solid ${hexToRgba(brand, 0.35)}`, outlineOffset: 0, backgroundColor: hexToRgba("#000000", 0.04) }}
                          />
                        ) : (
                          <div className="w-9 h-9 surface-2 rounded border border-border" />
                        )}
                        <Link href={c ? `/clubs/${c.id}` : "#"} className="text-base font-bold hover:underline text-white font-heading">
                          {c?.name ?? "Club"}
                        </Link>
                      </div>

                      <div className="mt-1">
                        {c?.latest && c.latest.length > 0 ? (
                          <ul className="divide-y divide-border">
                            {c.latest.slice(0, 1).map((a) => (
                              <li key={a.id} className="py-2">
                                <Link href={a.url} target="_blank" rel="noopener noreferrer" className="text-sm text-foreground line-clamp-2 font-body" style={{ color: "inherit" }}>
                                  {a.title}
                                </Link>
                              </li>
                            ))}
                            {c.latest.slice(1, 3).map((a) => (
                              <li key={a.id} className="py-2">
                                <Link href={a.url} target="_blank" rel="noopener noreferrer" className="text-sm text-foreground line-clamp-2 font-body" style={{ color: "inherit" }}>
                                  {a.title}
                                </Link>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <div className="text-sm text-muted-foreground">No recent article</div>
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
