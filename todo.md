Here’s a no-drama, step-by-step to-do list you can follow. It mirrors the canvas doc exactly, just condensed into actions.

Quick Setup To-Do
A) Firebase project prep

Create/select your Firebase project.

Enable Authentication → turn on Email/Password and Google.

Enable Firestore (production mode).

Enable Cloud Functions and Cloud Scheduler (billing usually required for scheduler).

Install CLI and login:

npm i -g firebase-tools

firebase login

firebase use <your-project-id>

B) Firestore rules & indexes

Add your admin allowlist:

Firestore → admins/{your-email} → { isActive: true }.

Create firestore.rules and paste from the canvas doc.

Create firestore.indexes.json and paste indexes from the doc.

Deploy:

firebase deploy --only firestore:rules,firestore:indexes

C) Cloud Functions (tidy + scheduled publish + claim sync)

firebase init functions → TypeScript, Node 18.

In functions/package.json add deps from the doc (firebase-admin, firebase-functions, slugify).

Replace functions/src/index.ts with the canvas version (tidy, publishDue, syncAdminClaim).

Deploy:

firebase deploy --only functions

Verify the scheduled function exists in the Firebase console (runs every minute, TZ: America/Toronto).

D) Frontend wiring (Next.js/React)

Install Firebase client SDK in your web app: npm i firebase.

Create /lib/firebase.ts with your env vars + ensureAdminClaim() (from the doc).

Create /components/AdminGuard.tsx (from the doc).

Create /app/admin/page.tsx (tiny editor screen from the doc).

Add .env.local with your NEXT_PUBLIC_FIREBASE_* keys.

E) Gatekeeping the admin UI

Ensure you’re signed in using the /admin page (Google or Email/Password).

On first sign-in, ensureAdminClaim() will set your isAdmin claim if your email is in /admins.

If you see “You don’t have admin access,” double-check:

Firestore doc path: admins/your@email

Field: isActive: true

Refresh token (sign out/in) to pick up claim.

F) Publish & schedule flow

In /admin, create a draft (title, type, content, clubs, tags) → Save Draft.

Publish now: set status → published (the function stamps publishedAt).

Schedule: set status → scheduled and set scheduledAt (future). The publishDue function promotes it to published when time hits.

Note: changing scheduledAt alone won’t publish unless status is scheduled and the scheduler is deployed.

G) Display queries

Update your pages to show only published items:

where('status','==','published').orderBy('publishedAt','desc').limit(20)

Club pages: add where('clubs','array-contains', clubSlug).

Product pages: add where('type','==', productType).

H) Analytics (simple)

Add GA4 or Plausible page tracking. Skip Firestore view counters (avoid write hot-spots).

Mini Troubleshooting

403 on writes: not an admin → confirm admins/{email} + isActive: true + re-login to refresh custom claim.

Scheduled posts don’t publish: ensure status: 'scheduled', scheduledAt ≤ now, functions deployed, Cloud Scheduler enabled; check function logs.

Index error popups: run firebase deploy --only firestore:indexes with the provided file.

Slug weirdness: slugs are reserved in slugs/{slug}; they don’t change after first save by design.

Mental model (one-liners)

One Auth for everyone. Admins = users on an allowlist (and a custom claim for instant gating).

One truth for publishing: status (not isLive).

Scheduling needs a function. Firestore doesn’t self-publish; the scheduler promotes every minute.

Reads are public; writes are admin-only (enforced by Firestore Rules).

If you want, I can also paste a middleware.ts for server-side gating later, or a slightly richer admin that lists drafts and adds one-click Publish/Schedule actions.

---

Deferred (Later)

- Implement publications display queries on pages
  - Home/products: where(status=='published').orderBy(publishedAt,'desc').limit(20)
  - Club pages: add where('clubs','array-contains', clubSlug)
  - Product pages: add where('type','==', productType)
- Verify/deploy Functions for publications (if not already): publicationsTidy, publishDue, syncAdminClaim
- Add analytics (GA4 or Plausible)
- Add simple admin listing: drafts + review queue + promote to publish/schedule
- Theme toggle (light/dark) wired to globals