"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEnsureProfile } from '@/lib/useEnsureProfile';

const nav = [
  { href: '/', label: 'Home' },
  { href: '/clubs', label: 'Clubs' },
  { href: '/news', label: 'News' },
  { href: '/table', label: 'Table' },
  { href: '/profile', label: 'Profile' },
];

export default function Header() {
  const pathname = usePathname();
  
  // Auto-create profile on first login
  useEnsureProfile();

  return (
    <header className="surface border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold tracking-tight text-foreground">The EPL Review</Link>
        <nav className="flex items-center gap-6">
          {nav.map((item) => {
            const active = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={
                  `text-sm font-medium ${active ? 'text-primary' : 'text-muted hover:text-foreground'}`
                }
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}


