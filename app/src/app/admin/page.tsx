'use client';

import Link from 'next/link';
import AdminGuard from '@/components/AdminGuard';

function Card({
  href,
  title,
  desc,
  icon,
  accent = 'ring-1 ring-border hover:ring-primary/60'
}: {
  href: string;
  title: string;
  desc: string;
  icon: React.ReactNode;
  accent?: string;
}) {
  return (
    <Link
      href={href}
      className={`block bg-card border border-border rounded-2xl p-5 shadow-sm hover:shadow-md transition ${accent}`}
    >
      <div className="flex items-start gap-4">
        <div className="w-11 h-11 rounded-xl surface-2 border border-border flex items-center justify-center">
          {icon}
        </div>
        <div className="flex-1">
          <h3 className="text-base font-semibold text-foreground">{title}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
        </div>
        <div className="opacity-70">
          <svg width="20" height="20" viewBox="0 0 24 24" className="text-foreground">
            <path fill="currentColor" d="M10 17l5-5-5-5v10z" />
          </svg>
        </div>
      </div>
    </Link>
  );
}

export default function AdminLandingPage() {
  return (
    <AdminGuard>
      <div className="min-h-screen surface section-y">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-lg font-bold font-heading">Admin</h1>
            <p className="text-muted-foreground text-sm">Choose an action to get started.</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Card
              href="/admin/write"
              title="Compose Post"
              desc="Write and publish editorial content with markdown, SEO, and featured image."
              icon={
                <svg viewBox="0 0 24 24" className="w-6 h-6 text-foreground">
                  <path fill="currentColor" d="M3 5a2 2 0 012-2h8l6 6v10a2 2 0 01-2 2H5a2 2 0 01-2-2V5zm12 0v4 h4" />
                </svg>
              }
            />
            <Card
              href="/admin/sources/new"
              title="Add Source"
              desc="Add an RSS/HTML source and tag it to one or more clubs. Includes optional filters."
              icon={
                <svg viewBox="0 0 24 24" className="w-6 h-6 text-foreground">
                  <path fill="currentColor" d="M12 5v14m7-7H5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              }
            />
          </div>
        </div>
      </div>
    </AdminGuard>
  );
}