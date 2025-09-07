Refactor: Consolidate homepage editorials to use PublicationCard via publications.server.ts

Objective
- Remove duplication by decommissioning `app/src/components/EditorialsServer.tsx`.
- Render the editorials block on the homepage using the same `PublicationCard` component as the publications page.
- Fetch publications server-side from `app/src/lib/publications.server.ts` (SSR + ISR), while keeping news/clubs client-side in `Landing.tsx`.

Outcomes
- Consistent card UI across site, driven by `PublicationCard`.
- Single data source (`getLatestPublications`) with caching (`revalidate: 120`).
- Homepage shows the latest N publications (default 5), easily tunable.

Prereqs / Risks
- Ensure Firebase Admin env vars are set locally and on Vercel: `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`.
- We hardened `publications.server.ts` with try/catch fallbacks to avoid local build crashes; still, real data needs envs.
- Avoid importing browser-only modules into server code. No `"use client"` in server sections.

Step-by-step plan
1) Create a server-only PublicationsSection for the homepage
   - File: you can implement inline within the homepage page component or as `app/src/components/HomePublications.server.tsx` (server component).
   - It will fetch 15 items and slice the first 5 for display.

   Example (inline section component):
   ```tsx
   // Server section inside a server file (e.g., app/src/app/page.tsx or a server component)
   import Link from 'next/link';
   import { getLatestPublications } from '@/lib/publications.server';
   import PublicationCard from '@/components/PublicationCard';

   export const revalidate = 120; // keep ISR

   async function PublicationsSection() {
     const pubs = await getLatestPublications(15);
     const list = pubs.slice(0, 5);
     return (
       <section className="section-y surface-2">
         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
           <div className="flex justify-between items-center mb-8">
             <h2 className="text-lg font-bold text-foreground">EDITORIALS & ANALYSIS</h2>
             <Link href="/publications" className="text-sm font-semibold" style={{ color: '#f25a87' }}>see all →</Link>
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
   ```

2) Render that section alongside the existing client `Landing` content
   - If your homepage file is `app/src/app/page.tsx`, import and render `PublicationsSection` under any hero/news.
   - Keep `Landing.tsx` purely client for news/clubs; do not move Admin fetching into it.

   ```tsx
   // app/src/app/page.tsx (server by default)
   import Landing from '@/components/Landing'; // client component

   export default function Home() {
     return (
       <>
         <Landing />
         {/* Server-rendered publications block */}
         {/* @ts-expect-error Server Component */}
         <PublicationsSection />
       </>
     );
   }
   ```

3) Remove `EditorialsServer.tsx`
   - Delete `app/src/components/EditorialsServer.tsx`.
   - Remove any imports/usages.

4) Verify grid density and responsiveness
   - Default grid in section: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5`.
   - Tune the slice count (3/4/5) without changing the fetch count (keep 15 for future pagination/carousel).

5) Validate locally
   - `npm run dev`.
   - Homepage shows the smaller `PublicationCard` style for editorials.
   - Badge is snug, hover effects intact, image aspect is consistent.
   - No hydration warnings in console.

6) Build and deploy
   - `npm run build` (ensure Admin envs exist; otherwise expect fallback empty list).
   - Push and check Vercel preview. Confirm Node 20 and env vars set.

7) Rollback
   - If needed, restore `EditorialsServer.tsx` and remove the new section code.

Pitfalls & gotchas
- Do not add `"use client"` to the server section. It breaks SSR and caching.
- Do not call Firebase client SDK in the server section.
- If passing dates into `PublicationCard`, ensure they are `Date` objects (or pass `undefined` as we do now).
- If images from new domains appear, update `next.config.js` images.allowlist.

Nice-to-haves (future)
- Add a `Suspense` boundary around the server section for smooth streaming.
- Paginate or add a horizontal carousel to reveal more of the 15 fetched items.
- Extract a shared `PublicationsGrid` server component used by both homepage and publications index.


