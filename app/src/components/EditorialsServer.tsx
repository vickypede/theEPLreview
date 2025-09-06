import Link from 'next/link';
import Image from 'next/image';
import { getLatestPublications } from '@/lib/publications.server';

export const revalidate = 120;

export default async function EditorialsServer() {
  const latestPubs = await getLatestPublications(3);

  return (
    <section className="section-y surface-2">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-lg font-bold text-foreground">EDITORIALS & ANALYSIS</h2>
          <Link href="/publications" className="text-sm font-semibold" style={{ color: "#f25a87" }}>
            see all →
          </Link>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {latestPubs.map((p) => (
            <article
              key={p.id}
              className="bg-card rounded-[var(--radius-card)] shadow-md hover:shadow-lg transition-shadow transition-transform hover:-translate-y-0.5 border border-border overflow-hidden"
            >
              {p.featuredImage && (
                <div className="relative aspect-[16/9]">
                  <Image
                    src={p.featuredImage}
                    alt={p.title}
                    fill
                    className="object-cover"
                    sizes="(max-width:768px) 100vw, (max-width:1200px) 50vw, 33vw"
                  />
                </div>
              )}
              <div className="p-6 flex flex-col min-h-[180px]">
                {p.type ? (
                  <span
                    className="inline-block px-3 py-1 rounded-full text-xs font-semibold mb-3 border border-border"
                    style={{ background: "#8D9F87", color: "#0b0b0b" }}
                  >
                    {p.type.split("-").map(w => w[0]?.toUpperCase() + w.slice(1)).join(" ")}
                  </span>
                ) : null}
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  <Link href={`/publications/${p.slug || p.id}`} className="hover:underline">
                    {p.title}
                  </Link>
                </h3>
                {p.excerpt ? (
                  <p className="text-muted-foreground text-sm line-clamp-2">{p.excerpt}</p>
                ) : null}
                {/* Removed Read link */}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
