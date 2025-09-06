import type { Metadata } from 'next';
import { getLatestPublications } from '@/lib/publications.server';
import PublicationCard from '@/components/PublicationCard';

export const metadata: Metadata = {
  title: 'Publications • The EPL Review',
  description: 'Long-form pieces and editorials from The EPL Review.',
};

export const revalidate = 120;

export default async function PublicationsPage() {
  const items = await getLatestPublications(12);
  return (
    <main className="max-w-6xl mx-auto px-4 py-6 md:py-8">
      <h1 className="text-2xl md:text-3xl font-semibold mb-4" style={{ color: '#696D7D' }}>
        Publications
      </h1>
      <p className="mb-6 text-sm md:text-base opacity-80">
        Our latest long-form: Big-Match Reviews, Weekend Conclusions, House Takes and more.
      </p>
      <div className="grid gap-4 md:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((p) => (
          <a key={p.id} href={`/publications/${p.slug || p.id}`}>
            <PublicationCard
              title={p.title}
              excerpt={p.excerpt}
              featuredImage={p.featuredImage || null}
              authorByline={p.authorByline || ''}
              type={p.type || ''}
              readingTime={p.readingTime || undefined}
              date={undefined}
            />
          </a>
        ))}
      </div>
    </main>
  );
}
