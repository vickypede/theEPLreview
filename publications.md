# EPLreview — Publications MVP (Auth, Rules, Scheduling)

**Rev A — September 2, 2025**
**Goal:** Ship a simple, durable publishing flow for EPLreview with minimal moving parts. This doc is copy‑paste ready for rules, indexes, and Functions, plus a tiny admin UI and a clear workflow cheat‑sheet.

---

## 0) What you’re shipping (no extra complexity)

### Core Editorial Products (types)

* **final-whistle** — Weekend conclusions (“Victors & Vanquished”)
* **matchday-radar** — Storylines & tactics ahead of fixtures (preview)
* **full-time-verdict** — Big‑match review \~2h after final whistle
* **pretender-list** — Overrated call‑outs (“Fraud Watch”)
* **high-press** — House take, punchy opinion
* **mailbox** — Daily fan letters (handled like posts but can be separated later)

---

## 1) Data Model (TypeScript)

> Keep it minimal. `status` is the single source of truth (no separate `isLive`).

```ts
export type PublicationType =
  | 'final-whistle'      // weekend conclusions
  | 'matchday-radar'     // previews
  | 'full-time-verdict'  // big match review
  | 'pretender-list'     // “fraud watch”
  | 'high-press'         // house opinion
  | 'mailbox';           // fan letters

export type PublicationStatus =
  | 'draft'
  | 'review'
  | 'scheduled'
  | 'published'
  | 'archived';

export interface Publication {
  id: string;                  // Firestore doc id
  type: PublicationType;
  title: string;
  slug: string;                // generated once, stable
  content: string;             // markdown / mdx ok
  excerpt?: string;            // fallback to first 160 chars of content
  featuredImage?: string;      // URL
  clubs: string[];             // EPL slugs only
  tags: string[];              // free‑form, lowercase
  authorId: string;            // uid or email
  authorByline?: string;       // display name
  status: PublicationStatus;
  createdAt: FirebaseFirestore.Timestamp | Date;
  updatedAt: FirebaseFirestore.Timestamp | Date;
  publishedAt?: FirebaseFirestore.Timestamp | Date; // set on publish
  scheduledAt?: FirebaseFirestore.Timestamp | Date; // for scheduled releases
  readingTime?: number;        // mins (computed)
  wordCount?: number;          // computed
  seoTitle?: string;
  seoDescription?: string;
  // (Deprecated) isLive, viewCount — use GA4/Plausible for analytics
}
```

**Collections**

* `publications/{id}` — documents per above
* `slugs/{slug}` — { publicationId: string } for uniqueness reservation
* `admins/{email}` — { isActive: true } allowlist that also feeds a custom claim

---

## 2) Security (Firestore Rules)

> Readers: open. Writers: admins only. Admins are users whose custom claim `isAdmin` is true **OR** who have an allowlist doc at `admins/{email}`.

**`firestore.rules`**

```js
rules_version = '2';
service cloud.firestore {
  match /databases/{db}/documents {
    function isSignedIn() { return request.auth != null; }
    function emailOrEmpty() { return isSignedIn() ? request.auth.token.email : ""; }
    function isAdmin() {
      return isSignedIn() && (
        request.auth.token.isAdmin == true ||
        exists(/databases/$(db)/documents/admins/$(emailOrEmpty()))
      );
    }

    match /publications/{id} {
      allow read: if true; // site is public
      allow create, update, delete: if isAdmin();
    }

    match /admins/{email} {
      // Only admins can read the allowlist; edits via Console/Admin SDK
      allow read: if isAdmin();
      allow write: if false;
    }

    match /slugs/{slug} {
      // Slug reservation docs are created by Cloud Functions only
      allow read: if true;
      allow write: if false;
    }
  }
}
```

---

## 3) Indexes (fast lists; minimal)

**`firestore.indexes.json`**

```json
{
  "indexes": [
    {
      "collectionGroup": "publications",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "type", "order": "ASCENDING" },
        { "fieldPath": "publishedAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "publications",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "clubs", "arrayConfig": "CONTAINS" },
        { "fieldPath": "publishedAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "publications",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "scheduledAt", "order": "ASCENDING" }
      ]
    }
  ],
  "fieldOverrides": []
}
```

---

## 4) Cloud Functions (TypeScript, Node 18+)

Two tiny Functions do nearly everything:

1. **Tidy on write** — auto‑slug, timestamps, excerpt, readingTime/wordCount; reserves unique slugs.
2. **Scheduled publisher** — every minute: promote due posts from `scheduled` → `published`.

Also one callable: **syncAdminClaim** — sets a custom claim for admins after login (so `/admin` gating is instant).

### 4.1 `functions/package.json`

```json
{
  "name": "eplreview-functions",
  "engines": { "node": "18" },
  "type": "module",
  "dependencies": {
    "firebase-admin": "^12.5.0",
    "firebase-functions": "^5.0.1",
    "slugify": "^1.6.6"
  },
  "devDependencies": {
    "typescript": "^5.6.2"
  }
}
```

### 4.2 `functions/src/index.ts`

````ts
import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { https } from 'firebase-functions/v2';
import * as admin from 'firebase-admin';
import slugify from 'slugify';

admin.initializeApp();
const db = admin.firestore();

function makeSlug(input: string) {
  const base = slugify(input, { lower: true, strict: true, trim: true });
  const short = Math.random().toString(36).slice(2, 6);
  return `${base}-${short}`;
}

function stripMd(md: string) {
  return md
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]*`/g, ' ')
    .replace(/\!\[[^\]]*\]\([^\)]*\)/g, ' ')
    .replace(/\[[^\]]*\]\([^\)]*\)/g, ' ')
    .replace(/[#>*_~`\-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function calcReading(data: { content?: string }) {
  const text = stripMd(data.content ?? '');
  const words = text ? text.split(/\s+/).length : 0;
  const wpm = 220; // conservative default
  const mins = Math.max(1, Math.round(words / wpm));
  return { wordCount: words, readingTime: mins, excerpt: text.slice(0, 160) };
}

// 1) Tidy / enrich on create/update
export const publicationsTidy = onDocumentWritten(
  {
    document: 'publications/{id}',
    region: 'us-central1'
  },
  async (event) => {
    const before = event.data?.before?.data() as any | undefined;
    const after = event.data?.after?.data() as any | undefined;
    if (!after) return; // deleted

    const ref = event.data!.after!.ref; // current doc ref
    const updates: Record<string, any> = {};

    // timestamps
    const now = admin.firestore.FieldValue.serverTimestamp();
    if (!before) updates.createdAt = now;
    updates.updatedAt = now;

    // slug (generate once, reserve)
    if (!after.slug || (before && before.title !== after.title && !before.slug)) {
      // If slug missing (new doc) or legacy doc changed title without slug, generate
      let slug = makeSlug(after.title || 'post');
      let tries = 0;
      while (tries < 5) {
        const reserve = db.doc(`slugs/${slug}`);
        const snap = await reserve.get();
        if (!snap.exists) {
          await reserve.set({ publicationId: ref.id, createdAt: admin.firestore.FieldValue.serverTimestamp() });
          break;
        }
        slug = makeSlug(after.title || 'post');
        tries++;
      }
      updates.slug = slug;
    } else if (before && before.slug && before.slug !== after.slug) {
      // Prevent manual slug changes
      updates.slug = before.slug;
    }

    // content niceties
    const { wordCount, readingTime, excerpt } = calcReading(after);
    if (!after.excerpt && excerpt) updates.excerpt = excerpt;
    updates.wordCount = wordCount;
    updates.readingTime = readingTime;

    // status sanity: published must have publishedAt
    if (after.status === 'published' && !after.publishedAt) {
      updates.publishedAt = admin.firestore.FieldValue.serverTimestamp();
    }

    if (Object.keys(updates).length) {
      await ref.set(updates, { merge: true });
    }
  }
);

// 2) Scheduled publisher (runs every minute)
export const publishDue = onSchedule(
  {
    schedule: 'every 1 minutes',
    timeZone: 'America/Toronto',
    region: 'us-central1'
  },
  async () => {
    const now = admin.firestore.Timestamp.now();
    const snap = await db
      .collection('publications')
      .where('status', '==', 'scheduled')
      .where('scheduledAt', '<=', now)
      .orderBy('scheduledAt', 'asc')
      .limit(50)
      .get();

    const batch = db.batch();
    snap.docs.forEach((doc) => {
      batch.update(doc.ref, {
        status: 'published',
        publishedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    });
    if (!snap.empty) await batch.commit();
  }
);

// 3) Callable to sync admin custom claim based on allowlist
export const syncAdminClaim = https.onCall({ region: 'us-central1' }, async (req) => {
  const uid = req.auth?.uid;
  const email = req.auth?.token?.email as string | undefined;
  if (!uid || !email) throw new https.HttpsError('unauthenticated', 'Sign in first');

  const doc = await db.doc(`admins/${email.toLowerCase()}`).get();
  const shouldBeAdmin = doc.exists && doc.get('isActive') === true;
  await admin.auth().setCustomUserClaims(uid, { isAdmin: shouldBeAdmin });
  return { isAdmin: shouldBeAdmin };
});
````

> **Scheduling note:** Publishing at a future time **requires** the `publishDue` scheduled Function. Changing `scheduledAt` alone won’t “wake the database up” — Firestore doesn’t run timers. The scheduler runs every minute and promotes any due posts.

**Deploy**

```bash
# from repo root
firebase deploy --only functions
```

> If you haven’t initialized yet: `firebase init functions` → TypeScript → Node 18.  Scheduled Functions typically require Cloud Scheduler to be enabled in your GCP project (billing may be required in many projects).

---

## 5) Authentication & Admin Gating (simple + clear)

### What’s the model?

* **One** Firebase Authentication instance for everyone (readers & editors).
* **Admins** are normal users **plus** an admin marker:

  * Either a doc at `admins/{email}` with `{ isActive: true }` **or** a custom claim `isAdmin: true` (we support both — redundant for safety).
* The **/admin** app:

  * Requires sign‑in.
  * Requires `isAdmin` (custom claim set via **syncAdminClaim**) OR the email allowlist.
  * Non‑admins are redirected away.

### Minimal client setup (Web v10 modular)

**`/lib/firebase.ts`**

```ts
// Replace with your env vars
export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MSG_SENDER_ID!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!
};

import { initializeApp, getApps } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';

export const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const fns = getFunctions(app);
export const googleProvider = new GoogleAuthProvider();

export async function ensureAdminClaim() {
  const call = httpsCallable<{},{ isAdmin: boolean }>(fns, 'syncAdminClaim');
  try { return (await call({})).data.isAdmin; } catch { return false; }
}
```

**Simple sign‑in helpers**

```ts
import { auth, googleProvider, ensureAdminClaim } from '@/lib/firebase';
import { signInWithPopup, signInWithEmailAndPassword, signOut } from 'firebase/auth';

export async function signInWithGoogle() {
  await signInWithPopup(auth, googleProvider);
  await ensureAdminClaim(); // set custom claim if on allowlist
}

export async function signInWithEmail(email: string, password: string) {
  await signInWithEmailAndPassword(auth, email, password);
  await ensureAdminClaim();
}

export async function signOutAll() { await signOut(auth); }
```

### Route guard for `/admin`

For Next.js App Router, a lightweight client guard keeps things simple.

**`/components/AdminGuard.tsx`**

```tsx
'use client';
import { ReactNode, useEffect, useState } from 'react';
import { auth, ensureAdminClaim } from '@/lib/firebase';
import { onAuthStateChanged, getIdTokenResult } from 'firebase/auth';

export default function AdminGuard({ children }: { children: ReactNode }) {
  const [state, setState] = useState<'loading'|'noauth'|'noadmin'|'ok'>('loading');

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) return setState('noauth');
      // refresh token to pick up latest custom claims
      const token = await getIdTokenResult(user, true);
      const isAdmin = token.claims.isAdmin === true;
      if (!isAdmin) {
        const synced = await ensureAdminClaim();
        if (!synced) return setState('noadmin');
      }
      setState('ok');
    });
    return () => unsub();
  }, []);

  if (state === 'loading') return <div className="p-6">Loading…</div>;
  if (state === 'noauth') return <div className="p-6">Please sign in to continue.</div>;
  if (state === 'noadmin') return <div className="p-6">You don’t have admin access.</div>;
  return <>{children}</>;
}
```

> You can optionally add a **server** guard (Next.js middleware) later. The client guard above is enough for the MVP because Firestore **Rules** already enforce write access server‑side.

---

## 6) Tiny Admin UI (create, review, schedule/publish)

> One screen. One primary button whose label changes with `status`.

**`/app/admin/page.tsx` (App Router)**

```tsx
'use client';
import AdminGuard from '@/components/AdminGuard';
import { db } from '@/lib/firebase';
import { addDoc, collection, doc, serverTimestamp, Timestamp, updateDoc } from 'firebase/firestore';
import { useState } from 'react';

export default function AdminPage() {
  return (
    <AdminGuard>
      <Editor />
    </AdminGuard>
  );
}

function Editor() {
  const [title, setTitle] = useState('');
  const [type, setType] = useState('final-whistle');
  const [content, setContent] = useState('');
  const [clubs, setClubs] = useState<string>('arsenal, chelsea');
  const [tags, setTags] = useState<string>('opinion, week-4');
  const [status, setStatus] = useState<'draft'|'review'|'scheduled'|'published'|'archived'>('draft');
  const [scheduledAt, setScheduledAt] = useState<string>('');
  const [saving, setSaving] = useState(false);

  async function create() {
    setSaving(true);
    const docRef = await addDoc(collection(db, 'publications'), {
      title,
      type,
      content,
      clubs: clubs.split(',').map(s => s.trim().toLowerCase()).filter(Boolean),
      tags: tags.split(',').map(s => s.trim().toLowerCase()).filter(Boolean),
      status,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    setSaving(false);
    alert(`Created: ${docRef.id}`);
  }

  async function publishNow(id: string) {
    setSaving(true);
    await updateDoc(doc(db, 'publications', id), {
      status: 'published',
      publishedAt: serverTimestamp()
    });
    setSaving(false);
  }

  async function schedule(id: string) {
    if (!scheduledAt) return alert('Pick a date/time');
    setSaving(true);
    await updateDoc(doc(db, 'publications', id), {
      status: 'scheduled',
      scheduledAt: Timestamp.fromDate(new Date(scheduledAt))
    });
    setSaving(false);
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">New Publication</h1>
      <div className="space-y-3">
        <input className="w-full border p-2 rounded" placeholder="Title" value={title} onChange={e=>setTitle(e.target.value)} />
        <select className="w-full border p-2 rounded" value={type} onChange={e=>setType(e.target.value)}>
          <option value="final-whistle">final-whistle</option>
          <option value="matchday-radar">matchday-radar</option>
          <option value="full-time-verdict">full-time-verdict</option>
          <option value="pretender-list">pretender-list</option>
          <option value="high-press">high-press</option>
          <option value="mailbox">mailbox</option>
        </select>
        <textarea className="w-full border p-2 rounded min-h-[200px]" placeholder="Content (markdown)" value={content} onChange={e=>setContent(e.target.value)} />
        <input className="w-full border p-2 rounded" placeholder="clubs (comma separated)" value={clubs} onChange={e=>setClubs(e.target.value)} />
        <input className="w-full border p-2 rounded" placeholder="tags (comma separated)" value={tags} onChange={e=>setTags(e.target.value)} />

        <div className="flex items-center gap-2">
          <label>Status:</label>
          <select className="border p-2 rounded" value={status} onChange={e=>setStatus(e.target.value as any)}>
            <option>draft</option>
            <option>review</option>
            <option>scheduled</option>
            <option>published</option>
            <option>archived</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label>Schedule:</label>
          <input type="datetime-local" className="border p-2 rounded" value={scheduledAt} onChange={e=>setScheduledAt(e.target.value)} />
        </div>

        <div className="flex gap-3">
          <button disabled={saving} onClick={create} className="px-4 py-2 rounded bg-black text-white">Save Draft</button>
          {/* For demo, these need an existing id; in a fuller UI you’d select a doc then call publish/schedule */}
        </div>

        <p className="text-sm text-gray-600">Tip: After you create the doc, go to Firestore Console to copy the ID and test the <code>schedule()</code> / <code>publishNow()</code> helpers above by hardcoding the ID (or extend this UI to list drafts).</p>
      </div>
    </div>
  );
}
```

> The UI above is intentionally tiny so you can drop it in and iterate. Firestore **Rules** already protect writes, so only admins can actually create/update docs.

---

## 7) Display Logic (frontend queries)

* Home & product pages show only `status == 'published'` ordered by `publishedAt desc`.
* Club pages add `clubs array-contains <clubSlug>`.
* Searching by type adds `type == <product>`.

**Example queries** (pseudo):

```ts
// Latest published
q = query(col(db,'publications'),
         where('status','==','published'),
         orderBy('publishedAt','desc'),
         limit(20));

// By club
q = query(col(db,'publications'),
         where('status','==','published'),
         where('clubs','array-contains', club),
         orderBy('publishedAt','desc'),
         limit(20));

// By type
q = query(col(db,'publications'),
         where('status','==','published'),
         where('type','==', type),
         orderBy('publishedAt','desc'),
         limit(20));
```

---

## 8) Analytics

Use GA4 or Plausible for page views. Skip Firestore counters to avoid write hot‑spots. If you ever need counters, write per‑day docs like `metrics/{pubId}/{YYYY-MM-DD}` via a Function (optional, not included here).

---

## 9) Simple Workflow (Cheat‑Sheet)

**Create**

1. Go to `/admin` → sign in (Email or Google).
2. If you’re on the allowlist (`admins/{email}`), your custom claim is set automatically by `syncAdminClaim`.
3. Create a draft with title, type, content, clubs, tags. Save.

**Review**
4\. Edit content until ready; switch `status` → `review` if you want a second pair of eyes (optional at MVP).

**Publish now**
5\. Set `status` → `published` (UI button). `publishedAt` is stamped automatically.

**Schedule**
6\. Set `status` → `scheduled` and set `scheduledAt` to a future time.
7\. The **`publishDue`** Scheduled Function runs every minute and promotes due items to `published`.

**Archive**
8\. Set `status` → `archived` to hide a post (kept for history).

**Slugs**

* Generated on first save; remain stable. A `slugs/{slug}` doc is created to avoid collisions.

---

## 10) FAQ (no-complication answers)

**Q: If I just change `scheduledAt` to a future time in Firestore, will it publish automatically?**
**A:** Only if `status` is `scheduled` **and** the `publishDue` Scheduled Function is deployed. Firestore itself doesn’t run timers; the scheduler promotes due posts every minute.

**Q: Do I need both allowlist and custom claim?**
**A:** You can keep just the allowlist, but the custom claim makes client‑side gating instant and clean. We support both; the Rules accept either.

**Q: Can non‑admins read the site?**
**A:** Yes, reads are public. Only writes are admin‑gated by Rules.

**Q: Do I need a separate Auth instance for admins?**
**A:** No. One Firebase Auth for everyone. Admins are simply users flagged by allowlist/claim.

**Q: Timezone for scheduling?**
**A:** The scheduler uses `America/Toronto`. Timestamps in Firestore are UTC under the hood; display in local time as needed.

**Q: Can I still use `isLive`?**
**A:** Treat it as deprecated. `status === 'published'` is your truth. Remove `isLive` later.

---

## 11) Quick Setup Checklist

* [ ] Add your emails to `admins/{email}` with `{ isActive: true }`.
* [ ] Deploy **Firestore Rules** (copy‑paste above).
* [ ] Deploy **Indexes** (copy‑paste above).
* [ ] Initialize and deploy **Functions** (`publicationsTidy`, `publishDue`, `syncAdminClaim`).
* [ ] Drop in `/lib/firebase.ts`, `AdminGuard`, and the simple `/app/admin/page.tsx`.
* [ ] Update your landing and product pages to query `status=='published'`.
* [ ] Hook up GA4/Plausible.

That’s it. You’ve got a simple, production‑viable pipeline: drafts → review → schedule/publish, with clean auth and zero extra ceremony.
