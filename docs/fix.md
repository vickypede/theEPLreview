ScoreAxis Widget API Migration Fix (December 2024)

Issue
- ScoreAxis widgets showing "error" and not loading on web app.
- Root cause: ScoreAxis deprecated the old `www.scoreaxis.com/widget/...` API format with numeric team IDs.
- New format requires `widgets.scoreaxis.com/api/football/...` with token-based team/league IDs.

Solution
- Migrated from iframe-based embeds to script-based widget embeds.
- Updated team info widgets (`TeamPanel.tsx`) to use new token mapping.
- Updated league table and top players widgets (`Stats.tsx`) to use new league token.
- Created reusable `ScoreAxisWidget.tsx` component for script-based embedding.

Changes Made
1. Created `app/src/components/ScoreAxisWidget.tsx`
   - Client component that injects ScoreAxis script tags dynamically.
   - Handles widget ID generation and script loading.

2. Updated `app/src/components/TeamPanel.tsx`
   - Replaced `SCOREAXIS_IDS` (numeric IDs) with `SCOREAXIS_TEAMINFO_TOKENS` (token strings).
   - Changed from iframe embeds to `ScoreAxisWidget` component.
   - Updated URL generation to use `widgets.scoreaxis.com/api/football/team-info/{token}`.

3. Updated `app/src/components/Stats.tsx`
   - Replaced hardcoded league table/players iframe URLs.
   - Added `SCOREAXIS_EPL_LEAGUE_TOKEN` constant.
   - Migrated to `ScoreAxisWidget` component with new API format.

4. Security Update: Bumped Next.js
   - Upgraded from `15.5.2` to `15.5.9` to resolve CVE-2025-66478.
   - Updated `eslint-config-next` to match.

Team Token Mapping
- All EPL teams now have token-based IDs in `SCOREAXIS_TEAMINFO_TOKENS`.
- League token: `6232265abf1fa71a672159ec` (for table and top players widgets).

Commits
- `82d8cfa`: Fix ScoreAxis embeds (widgets.scoreaxis.com tokens)
- `2dab1d9`: Bump Next.js to 15.5.9 (security update)

Status: ✅ Fixed and deployed

---

Publications SSR + SEO Fix Plan (Granular, Project‑Aware)

Goal
- Resolve 404s on publication detail pages.
- Render content server‑side for SEO (SSR + ISR caching).
- Keep existing aesthetics; only move data fetching to server.

Why it 404s now
- `app/src/app/publications/[slug]/page.tsx` calls the browser Firestore client via `publicationsRef()` (from `app/src/lib/firebase.ts`), which is only initialized in the browser. On the server it returns `undefined`, your fetch yields `null`, and `notFound()` triggers.

High‑level approach (single track)
- Use Firebase Admin SDK on the server for Firestore reads.
- Server render publication detail and list pages; cache with revalidate (ISR).
- Keep components and styling; remove unnecessary "use client" from cards so they can render on the server.

Phase 1 — Setup (Admin SDK + Env)
1) Install Admin SDK in the app workspace
   - From `app/` directory:
     - `npm i firebase-admin`

2) Add environment variables (server‑only)
   - Create/update `app/.env.local` (local dev) and your host’s project env (e.g., Vercel):
     - `FIREBASE_PROJECT_ID="..."`
     - `FIREBASE_CLIENT_EMAIL="..."`
     - `FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"`
   - Do NOT prefix with `NEXT_PUBLIC_`.
   - Ensure newlines are represented as `\n` in the env value. We’ll convert them at runtime.

Phase 2 — Server data layer
3) Create `app/src/lib/firebaseAdmin.ts`
   - Purpose: Initialize Admin SDK once (Node runtime) and export Firestore.
```ts
// app/src/lib/firebaseAdmin.ts
import { getApps, initializeApp, applicationDefault, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const projectId = process.env.FIREBASE_PROJECT_ID!;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL!;
const privateKey = (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n');

if (!getApps().length) {
  initializeApp(
    privateKey && clientEmail
      ? { credential: cert({ projectId, clientEmail, privateKey }) }
      : { credential: applicationDefault() }
  );
}

export function getAdminDb() {
  return getFirestore();
}
```

4) Create `app/src/lib/publications.server.ts`
   - Purpose: Server helpers with cache wrappers for ISR‑like behavior.
```ts
// app/src/lib/publications.server.ts
import { unstable_cache } from 'next/cache';
import { getAdminDb } from './firebaseAdmin';
import type { Publication } from '@/types/publication';

async function _getBySlugOrId(slugOrId: string): Promise<Publication | null> {
  const db = getAdminDb();
  // Try by slug (published only)
  const bySlug = await db.collection('publications')
    .where('slug', '==', slugOrId)
    .where('status', '==', 'published')
    .limit(1)
    .get();
  if (!bySlug.empty) {
    const d = bySlug.docs[0];
    return { id: d.id, ...(d.data() as any) } as Publication;
  }
  // Fallback: doc id (if published)
  const snap = await db.collection('publications').doc(slugOrId).get();
  if (!snap.exists) return null;
  const data = snap.data() as any;
  if (data?.status !== 'published') return null;
  return { id: snap.id, ...data } as Publication;
}

async function _getLatest(limitN = 12): Promise<Publication[]> {
  const db = getAdminDb();
  const qs = await db.collection('publications')
    .where('status', '==', 'published')
    .orderBy('publishedAt', 'desc')
    .limit(limitN)
    .get();
  return qs.docs.map(d => ({ id: d.id, ...(d.data() as any) } as Publication));
}

export const getPublicationBySlugOrId = unstable_cache(_getBySlugOrId, ['pub-by-slug'], { revalidate: 120 });
export const getLatestPublications   = unstable_cache(_getLatest,     ['pub-latest'],  { revalidate: 120 });
```

Phase 3 — Fix the 404 route (SSR detail)
5) Update `app/src/app/publications/[slug]/page.tsx`
   - Replace Firestore client usage with server helper.
   - Remove `export const dynamic = "force-dynamic"` (ISR won’t work with it).
   - Add `export const revalidate = 120`.
   - Use your existing `PublicationDetail` API: `pub={pub}`.
```tsx
// app/src/app/publications/[slug]/page.tsx
import { notFound } from 'next/navigation';
import { getPublicationBySlugOrId } from '@/lib/publications.server';
import PublicationDetail from '@/components/PublicationDetail';

export const revalidate = 120;

type Props = { params: { slug: string } };

export default async function PublicationPage({ params }: Props) {
  const pub = await getPublicationBySlugOrId(params.slug);
  if (!pub) return notFound();
  return <PublicationDetail pub={pub} />;
}

export async function generateMetadata({ params }: Props) {
  const pub = await getPublicationBySlugOrId(params.slug);
  if (!pub) return { title: 'Not Found' };
  return {
    title: `${pub.title} • The EPL Review`,
    description: pub.excerpt || pub.content?.slice(0, 160) || '',
  };
}
```

Phase 4 — Publications index (SSR list)
6) Update `app/src/app/publications/page.tsx` to SSR list
   - Fetch latest on the server, render cards directly.
   - Add `export const revalidate = 120`.
   - Keep your existing card design; just render on the server. To do that, make the card server‑compatible in Step 7.
```tsx
// app/src/app/publications/page.tsx
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
```

Phase 5 — Make cards server‑compatible
7) Update `app/src/components/PublicationCard.tsx`
   - Remove the top line `"use client"`.
   - Keep the component otherwise the same (it has no hooks).

7b) (Optional, recommended) Update `app/src/components/PublicationDetail.tsx` for full SSR
   - Purpose: Render the article body as server HTML for maximum SEO.
   - Steps:
     - Remove the top line `"use client"` so it becomes a server component.
     - Ensure there are no React hooks or browser‑only APIs. Current usage (`next/image`, `next/link`, `react-markdown`, `remark-gfm`) is server‑safe.
     - Keep props the same: `{ pub }: { pub: Publication }`.
   - Result: The detail page HTML (title, meta, markdown content) is fully server‑rendered and indexable.

Phase 6 — Editorials on Home (optional SSR improvement)
8) Server render the three latest publications on the homepage
   - Create a small server component (e.g., `EditorialsServer.tsx`) that calls `getLatestPublications(3)` and renders your `PublicationCard`s.
   - Render it from `app/src/app/page.tsx` near `Landing` so this section is SSR for SEO.

Phase 7 — Firestore index and runtime notes
9) Add composite index (recommended)
   - In `firestore.indexes.json`, add:
```json
{
  "indexes": [
    {
      "collectionGroup": "publications",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "publishedAt", "order": "DESCENDING" }
      ]
    }
  ]
}
```
   - Deploy: `firebase deploy --only firestore:indexes,firestore:rules`.

10) Keep runtime = Node.js
   - Do not set `export const runtime = 'edge'` on publications pages; Admin SDK requires Node.

11) Image URLs
   - Ensure `featuredImage` is a public HTTPS URL. Avoid `gs://` URLs in SSR.

12) Links
   - Prefer linking to `/publications/${slug}`. Your detail route also supports id fallback, but slug is canonical for SEO.

Phase 8 — QA and deploy
13) Local verification
   - `cd app && npm run dev`.
   - Navigate to `/publications` → cards render with real HTML (no 404).
   - Click a card → `/publications/[slug]` renders server HTML (view‑source shows content).

14) Deploy
   - Set env vars in your hosting provider.
   - Deploy and verify pages are cached (responses revalidate ~120s).

Notes
- This plan is SSR‑first (no client fallback). It resolves the 404s and makes content indexable.
- Costs remain low via ISR caching; Firestore reads occur on revalidation, not every request.


