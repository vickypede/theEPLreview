"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEnsureProfile } from '@/lib/useEnsureProfile';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Club } from '@/types';

const nav = [
  { href: '/', label: 'Home' },
  { href: '/clubs', label: 'Clubs' },
  { href: '/news', label: 'News' },
  { href: '/table', label: 'Table' },
  { href: '/profile', label: 'log in' },
];

export default function Header() {
  const pathname = usePathname();
  
  // Auto-create profile on first login
  useEnsureProfile();

  const [open, setOpen] = useState(false);
  const [clubsOpen, setClubsOpen] = useState(false);
  const [clubs, setClubs] = useState<Club[]>([]);
  useEffect(() => { setOpen(false); }, [pathname]);

  useEffect(() => {
    let mounted = true;
    async function loadClubs() {
      try {
        if (!db) return;
        const snap = await getDocs(collection(db, 'clubs'));
        const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Club, 'id'>) })) as Club[];
        list.sort((a, b) => a.name.localeCompare(b.name));
        if (mounted) setClubs(list.slice(0, 20));
      } catch {
        /* noop */
      }
    }
    loadClubs();
    return () => { mounted = false; };
  }, []);

  return (
    <header className="sticky top-0 z-50 surface border-b border-header">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between relative">
        <Link href="/" className="text-xl font-bold tracking-tight text-foreground">The EPL Review</Link>
        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6">
          {nav.map((item) => {
            const active = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
            if (item.href === '/clubs') {
              return (
                <div
                  key={item.href}
                  className="relative"
                  onMouseEnter={() => setClubsOpen(true)}
                  onMouseLeave={() => setClubsOpen(false)}
                >
                  <button
                    type="button"
                    className={`text-sm font-medium ${active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                    aria-haspopup="menu"
                    aria-expanded={clubsOpen ? 'true' : 'false'}
                  >
                    {item.label}
                  </button>
                  {clubsOpen && (
                    <div className="absolute left-1/2 -translate-x-1/2 top-8 bg-card border border-border rounded-xl shadow p-4 z-50">
                      <div className="grid grid-cols-5 gap-3">
                        {clubs.map((c) => (
                          <Link
                            key={c.id}
                            href={`/clubs/${c.id}`}
                            className="flex items-center gap-2 px-2 py-2 rounded hover:bg-[hsl(var(--background-tertiary))]"
                          >
                            {c.badgeUrl ? (
                              <img
                                src={c.badgeUrl}
                                alt={`${c.name} crest`}
                                className="w-6 h-6 object-contain rounded-full border border-border"
                              />
                            ) : (
                              <span className="w-6 h-6 surface-2 rounded-full border border-border" />
                            )}
                            <span className="text-sm text-foreground">{c.name}</span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            }
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`text-sm font-medium ${active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
              >
                {item.href === '/profile' ? (
                  <span className="inline-flex items-center gap-2">
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <circle cx="12" cy="8" r="4" />
                      <path d="M6 20c0-3.314 2.686-6 6-6s6 2.686 6 6" />
                    </svg>
                    <span>Log in</span>
                  </span>
                ) : (
                  item.label
                )}
              </Link>
            );
          })}
        </nav>
        {/* Mobile hamburger */}
        <button
          type="button"
          className="md:hidden inline-flex items-center justify-center w-9 h-9 rounded-lg border border-border text-foreground"
          aria-label="Toggle menu"
          aria-expanded={open ? 'true' : 'false'}
          onClick={() => setOpen((v) => !v)}
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        {/* Mobile dropdown */}
        {open && (
          <nav className="md:hidden absolute right-4 top-16 bg-card border border-border rounded-xl shadow p-4 flex flex-col gap-2 z-50 min-w-[12rem]">
            {nav.map((item) => {
              const active = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={`px-2 py-1.5 rounded-md text-sm font-medium ${active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  {item.href === '/profile' ? (
                    <span className="inline-flex items-center gap-2">
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <circle cx="12" cy="8" r="4" />
                        <path d="M6 20c0-3.314 2.686-6 6-6s6 2.686 6 6" />
                      </svg>
                      <span>Log in</span>
                    </span>
                  ) : (
                    item.label
                  )}
                </Link>
              );
            })}
          </nav>
        )}
      </div>
    </header>
  );
}


