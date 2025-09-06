Refactor plan: Make EditorialsServer render PublicationCard and stay in sync (fetch 15)

Goal
- Unify UI and data between the homepage editorials block and the publications grid.
- `EditorialsServer.tsx` should render `PublicationCard` components and fetch the latest 15 publications via server helpers, then display the first N (3–5) responsively.
- Keep SSR/ISR, avoid client-only code in server components, and prevent layout/hydration issues.

High-level steps
1) Create a short-lived feature branch
   - git checkout -b feat/editorials-use-publication-card

2) Convert EditorialsServer to consume PublicationCard
   - Import: `import PublicationCard from '@/components/PublicationCard'`.
   - Fetch 15: `const latestPubs = await getLatestPubliclications(15)` (already server-side + cached via unstable_cache).
   - Render a grid of `PublicationCard`s inside links to `/publications/[slug-or-id]`.
   - Initially show only the first 3 (slice) so layout remains tidy. We can tune this number later.

3) Keep component roles correct (Server vs Client)
   - `EditorialsServer.tsx` must remain a Server Component (no "use client", no client hooks, no browser-only Firebase).
   - `PublicationCard.tsx` is server-compatible already; keep it that way.

4) Grid and responsiveness (homepage block)
   - Use a consistent grid with the publications page but sized for the homepage:
     - `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` (default)
     - If we want 4 or 5 later: `xl:grid-cols-4 2xl:grid-cols-5`.
   - Keep gaps consistent: `gap-6`.

5) Map fields carefully (avoid hydration and runtime issues)
   - Title: `title` (string)
   - Excerpt: `excerpt` (optional)
   - Image: `featuredImage` (string | null)
   - Type: `type` (optional)
   - Reading time: `readingTime` (optional, number)
   - Date: If passing a date, convert Firestore Timestamp → Date before handing to `PublicationCard`.
     - Safer option: pass `undefined` for now (card supports that) to avoid timezone/hydration edge-cases.

6) Keep badges snug and styling consistent
   - `PublicationCard` already uses `inline-flex w-auto shrink-0` for the tag capsule.
   - Do NOT wrap the badge in a full-width flex child that forces stretching.

7) Remove duplicate markup
   - Delete any bespoke title/excerpt/badge markup in `EditorialsServer.tsx` once `PublicationCard` is in use.
   - Keep the section header and the "see all" link.

8) ISR, caching, and costs
   - Keep `export const revalidate = 120;` in `EditorialsServer.tsx` to refresh every 2 minutes.
   - `getLatestPublications` is already wrapped in `unstable_cache`; no change needed.
   - Fetching 15 vs 3 uses the same cached query, amortizing Firestore reads.

9) Edge cases and safeguards
   - Empty state: If there are 0 publications, render a small placeholder card or nothing (do not throw).
   - Missing images: `PublicationCard` shows a neutral surface block; no action needed.
   - Bad slugs: Links use `p.slug || p.id` to ensure navigation always works.
   - Image domains: Ensure any new image hosts are allowed in `next.config.js` (already true for current data set).

10) Minimal code sketch (for reference)
```tsx
// app/src/components/EditorialsServer.tsx
import Link from 'next/link';
import { getLatestPublications } from '@/lib/publications.server';
import PublicationCard from '@/components/PublicationCard';

export const revalidate = 120;

export default async function EditorialsServer() {
  const ITEMS_TO_FETCH = 15;
  const ITEMS_TO_SHOW = 3; // tune later to 4 or 5 if desired
  const pubs = await getLatestPublications(ITEMS_TO_FETCH);
  const list = pubs.slice(0, ITEMS_TO_SHOW);

  return (
    <section className="section-y surface-2">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-lg font-bold text-foreground">EDITORIALS & ANALYSIS</h2>
          <Link href="/publications" className="text-sm font-semibold" style={{ color: '#f25a87' }}>
            see all →
          </Link>
        </div>

        <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
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

11) Validate locally
   - npm run dev
   - Check homepage: badge snugness, image crop, card hover, links.
   - Check `/publications`: ensure visual parity in card styling.
   - Verify no console warnings about hydration or missing keys.

12) Ship safely
   - Commit and push the refactor branch.
   - Open a PR; verify the Vercel preview build.
   - Confirm Node 20, Firebase Admin env vars, and Firestore index are set in Vercel.
   - Merge when preview looks correct.

13) Rollback plan
   - If anything regresses, revert the PR or `git revert <merge_commit_sha>`.
   - Because the change is isolated to `EditorialsServer.tsx`, impact radius is small.

Common pitfalls to avoid
- Accidentally adding `"use client"` to `EditorialsServer.tsx` (breaks SSR and Admin SDK usage).
- Importing browser-only modules into server components.
- Passing Firestore `Timestamp` directly as `date` (convert or omit to avoid hydration drift).
- Introducing full-width flex parents around the badge, causing stretched capsules.
- Forgetting the `revalidate` export or removing caching, causing slow pages or higher Firestore cost.

Next iterations (optional)
- Add simple pagination or a carousel to show more than 3 on the homepage.
- Share a single grid wrapper component for both homepage and publications page for perfect visual parity.
- Add a small skeleton state for the homepage cards during ISR revalidation.


