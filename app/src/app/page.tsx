import Landing from '@/components/Landing';
import Link from 'next/link';
import PublicationCard from '@/components/PublicationCard';
import { getLatestPublications } from '@/lib/publications.server';

export const revalidate = 120;

async function PublicationsSection() {
  const pubs = await getLatestPublications(15);
  const list = pubs.slice(0, 5);
  return (
    <section className="section-y surface-2">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-lg font-bold text-foreground">EDITORIALS & ANALYSIS</h2>
          <Link href="/publications" className="text-sm font-semibold" style={{ color: '#f25a87' }}>
            see all →
          </Link>
        </div>
        <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          {list.map((p) => (
            <Link key={p.id} href={`/publications/${p.slug || p.id}`}>
              <PublicationCard
                title={p.title}
                excerpt={p.excerpt}
                featuredImage={p.featuredImage || null}
                authorByline={p.authorByline || ''}
                type={p.type || ''}
                readingTime={p.readingTime || undefined}
                date={undefined}
              />
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

export default async function HomePage() {
  return (
    <>
      <Landing />
      <PublicationsSection />
    </>
  );
}
