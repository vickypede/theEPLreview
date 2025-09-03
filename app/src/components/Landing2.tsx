"use client";

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { collection, getDocs, limit, orderBy, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Article, Club } from '@/types';

type UiArticle = Article & { sourceName?: string; source?: string };

type ClubTile = {
  id: string;
  name: string;
  badgeUrl?: string;
  latest: UiArticle[]; // up to 3 latest articles
};

const CLUB_BRAND: Record<string, string> = {
  'arsenal': '#EF0107',
  'chelsea': '#034694',
  'liverpool': '#C8102E',
  'manchester-city': '#6CABDD',
  'manchester-united': '#DA291C',
  'tottenham': '#132257',
  'aston-villa': '#670E36',
  'newcastle': '#241F20',
  'brighton': '#0057B8',
  'west-ham': '#7A263A',
  'wolves': '#FDB913',
  'everton': '#003399',
};

function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#','');
  const bigint = parseInt(h, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export default function Landing2(){
  const [latestNews, setLatestNews] = useState<UiArticle[]>([]);
  const [clubs, setClubs] = useState<ClubTile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function load(){
      try{
        if (!db) return;
        // Latest site-wide news (left list)
        const newsRef = collection(db, 'articles');
        const newsQ = query(newsRef, orderBy('publishedAt', 'desc'), limit(8));
        const newsSnap = await getDocs(newsQ);
        const newsList = newsSnap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<UiArticle, 'id'>) })) as UiArticle[];

        // Choose 6 clubs (top6 if flagged, else first 6 alphabetically)
        const clubsRef = collection(db, 'clubs');
        const clubsSnap = await getDocs(clubsRef);
        const allClubs = clubsSnap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<Club, 'id'>) })) as Club[];
        const top = allClubs.filter(c => c.isTop6).slice(0, 6);
        const six = (top.length === 6 ? top : allClubs.sort((a,b)=>a.name.localeCompare(b.name)).slice(0,6))
          .map(c => ({ id: c.id, name: c.name, badgeUrl: c.badgeUrl, latest: [] })) as ClubTile[];

        // For each club fetch its latest article
        const tiles: ClubTile[] = [];
        for (const c of six){
          const clubArticlesRef = collection(db, 'articles');
          const clubQ = query(
            clubArticlesRef,
            where('clubs', 'array-contains', c.id),
            orderBy('publishedAt', 'desc'),
            limit(3)
          );
          const aSnap = await getDocs(clubQ);
          const list = aSnap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<UiArticle,'id'>) })) as UiArticle[];
          tiles.push({ ...c, latest: list });
        }

        if (mounted){
          setLatestNews(newsList);
          setClubs(tiles);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, []);

  if (!db) return null;

  const latestForList: (UiArticle | null)[] = loading
    ? Array.from({ length: 6 }, () => null)
    : latestNews.slice(0, 6);

  const clubTiles: (ClubTile | null)[] = loading
    ? Array.from({ length: 6 }, () => null)
    : clubs;

  return (
    <div className="min-h-screen surface">
      <section className="py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Latest News list */}
          <aside className="lg:col-span-1 card">
            <div className="px-4 py-4 border-b border-border">
              <h2 className="text-lg font-bold text-foreground">LATEST NEWS</h2>
            </div>
            <ul>
              {latestForList.map((a, i) => (
                <li key={a?.id ?? i} className="px-4 py-4 relative after:content-[''] after:absolute after:inset-x-4 after:bottom-0 after:h-px after:bg-border last:after:hidden">
                  {a ? (
                    <Link href={a.url} target="_blank" rel="noopener noreferrer" className="block">
                      <div className="text-xs text-muted-foreground mb-1">{/* timestamp */}
                        {a.publishedAt?.toDate ? timeSince(a.publishedAt.toDate()) : ''}
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
            <div className="px-4 py-3">
              <Link href="/news" className="inline-flex items-center justify-between w-full text-left text-sm font-semibold text-primary hover:text-foreground">
                <span>see all</span>
                <span aria-hidden>→</span>
              </Link>
            </div>
          </aside>

          {/* Right: 6 club tiles */}
          <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {clubTiles.map((c, i) => {
              const brand = c?.id ? (CLUB_BRAND[c.id] ?? '#4f46e5') : '#4f46e5';
              const tint = hexToRgba(brand, 0.04);
              return (
              <article key={c?.id ?? i} className="card p-0 flex flex-col" style={{ backgroundImage: `linear-gradient(180deg, ${tint}, transparent)` }}>
                <div className="h-1.5 rounded-t-md" style={{ backgroundColor: brand }} />
                <div className="p-4 flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    {c?.badgeUrl ? (
                    <img src={c.badgeUrl} alt={`${c.name} crest`} className="w-9 h-9 object-contain rounded-full" style={{ outline: `2px solid ${hexToRgba(brand, 0.35)}`, outlineOffset: 0, backgroundColor: hexToRgba('#000000', 0.04) }} />
                    ) : (
                    <div className="w-9 h-9 surface-2 rounded border border-border" />
                    )}
                  <Link href={c ? `/clubs/${c.id}` : '#'} className="text-base font-bold hover:underline text-white">
                    {c?.name ?? 'Club'}
                  </Link>
                  </div>
                  {/* Articles list: show first on mobile, up to three on md+ with dividers */}
                <div className="mt-1">
                  {c?.latest && c.latest.length > 0 ? (
                    <ul className="divide-y divide-border">
                      {c.latest.slice(0,1).map((a, idx) => (
                        <li key={a.id} className="py-2">
                          <Link href={a.url} target="_blank" rel="noopener noreferrer" className="text-sm text-foreground line-clamp-2" style={{ color: 'inherit' }}>
                            {a.title}
                          </Link>
                        </li>
                      ))}
                      {/* Only visible on md+ */}
                      {c.latest.slice(1,3).map((a) => (
                        <li key={a.id} className="py-2 hidden md:block">
                          <Link href={a.url} target="_blank" rel="noopener noreferrer" className="text-sm text-foreground line-clamp-2" style={{ color: 'inherit' }}>
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
            );})}
          </div>
        </div>
      </section>
    </div>
  );
}

function timeSince(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  const minutes = Math.floor(seconds / 60);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}
