Perfect—let’s turn your idea into a clean, copy-pasteable profile system that (a) auto-creates a profile on first login, (b) lets users edit name, (c) pick a single favourite club, (d) follow multiple clubs with “Select all / Top-6 / Clear” shortcuts, and (e) keep a “General news” toggle. It’s minimal but future-proof.

---

# 1) Firestore schema (profiles)

**Collection:** `/user_profiles/{uid}`

```ts
// types/Profile.ts
export type ClubSlug = string; // e.g. 'chelsea', 'arsenal', etc.

export interface UserProfile {
  displayName: string;
  email: string;                // immutable by user; from auth
  favoriteClub: ClubSlug | null;    // one main club
  followedClubs: ClubSlug[];        // multi-select
  includeGeneral: boolean;          // show general league-wide items
  marketingOptIn: boolean;
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
}
```

**Default (first login):**

* `includeGeneral = true`
* `followedClubs = all Top-6`
* `favoriteClub = first Top-6 (or null if none)`

> Why this shape?
>
> * Keeps “favourite club” for UI highlights.
> * Keeps “followedClubs” for the feed query.
> * “General” is a simple boolean, so we can add a special `_league` channel later if we choose.

---

# 2) Rules (user can read/write only their profile; safe fields only)

Add/merge into `firestore.rules`:

```diff
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

+   // User Profiles
+   match /user_profiles/{uid} {
+     allow read:  if request.auth != null && request.auth.uid == uid;
+     allow create: if request.auth != null
+       && request.auth.uid == uid
+       && request.resource.data.email == request.auth.token.email
+       && request.resource.data.displayName is string
+       && request.resource.data.followedClubs is list
+       && request.resource.data.followedClubs.size() <= 20
+       && request.resource.data.includeGeneral is bool;
+
+     // Keep email immutable; basic type/size guards
+     allow update: if request.auth != null
+       && request.auth.uid == uid
+       && request.resource.data.email == resource.data.email
+       && request.resource.data.displayName is string
+       && request.resource.data.displayName.size() <= 100
+       && request.resource.data.followedClubs is list
+       && request.resource.data.followedClubs.size() <= 20
+       && request.resource.data.includeGeneral is bool;
+   }

    // (your existing rules for articles, sources, etc.)
  }
}
```

> Tip: we can’t easily validate “each followed club is a real club” in rules; we’ll keep the UI honest and possibly add a server check later if needed.

Deploy:

```bash
firebase deploy --only firestore:rules
```

---

# 3) Auto-create profile on first login (with sensible defaults)

```ts
// app/lib/useEnsureProfile.ts
'use client';

import { onAuthStateChanged, getAuth } from 'firebase/auth';
import {
  getFirestore, doc, getDoc, setDoc, serverTimestamp,
  collection, query, where, getDocs
} from 'firebase/firestore';
import { app } from '@/lib/firebaseClient';

const auth = getAuth(app);
const db = getFirestore(app);

export function useEnsureProfile() {
  onAuthStateChanged(auth, async (u) => {
    if (!u) return;
    const pref = doc(db, 'user_profiles', u.uid);
    const snap = await getDoc(pref);
    if (snap.exists()) return;

    // Get Top-6 club slugs for defaults (fallback to empty if none)
    const top6Snap = await getDocs(
      query(collection(db, 'clubs'), where('isTop6', '==', true))
    );
    const top6 = top6Snap.docs.map(d => d.id);

    await setDoc(pref, {
      displayName: u.displayName || '',
      email: u.email || '',
      favoriteClub: top6[0] || null,
      followedClubs: top6,
      includeGeneral: true,
      marketingOptIn: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  });
}
```

Call this once near the top of your app (e.g., in `app/layout.tsx` or your header component):

```tsx
// app/components/Header.tsx (example)
'use client';
import { useEffect } from 'react';
import { useEnsureProfile } from '@/lib/useEnsureProfile';

export default function Header() {
  useEffect(() => { useEnsureProfile(); }, []);
  // ... your header UI
  return <header>...</header>;
}
```

---

# 4) Profile Page (UI with favourite club, multi-follow, general toggle, shortcuts)

```tsx
// app/profile/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { auth, db } from '@/lib/firebaseClient';
import {
  GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut
} from 'firebase/auth';
import {
  collection, doc, getDoc, getDocs, orderBy, query, setDoc, updateDoc, where
} from 'firebase/firestore';

type Club = { id: string; name: string; isTop6?: boolean };

export default function ProfilePage(){
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [saving, setSaving] = useState(false);

  // Auth
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (!u) return;
      const prefRef = doc(db, 'user_profiles', u.uid);
      const snap = await getDoc(prefRef);
      if (!snap.exists()) {
        await setDoc(prefRef, {
          displayName: u.displayName || '',
          email: u.email || '',
          favoriteClub: null,
          followedClubs: [],
          includeGeneral: true,
          marketingOptIn: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
      setProfile((await getDoc(prefRef)).data());
    });
    return () => unsub();
  }, []);

  // Load clubs
  useEffect(() => {
    (async () => {
      const qClubs = query(collection(db, 'clubs'), orderBy('name'));
      const s = await getDocs(qClubs);
      setClubs(s.docs.map(d => ({ id: d.id, ...(d.data() as any) })));
    })();
  }, []);

  // Derived
  const top6Slugs = useMemo(() => clubs.filter(c => c.isTop6).map(c => c.id), [clubs]);
  const allSlugs  = useMemo(() => clubs.map(c => c.id), [clubs]);

  const signIn = async () => { await signInWithPopup(auth, new GoogleAuthProvider()); };
  const doSignOut = async () => { await signOut(auth); };

  const toggleFollow = (slug: string) => {
    if (!profile) return;
    const exists = profile.followedClubs?.includes(slug);
    const next = exists
      ? profile.followedClubs.filter((s: string) => s !== slug)
      : [...(profile.followedClubs || []), slug];
    setProfile({ ...profile, followedClubs: next });
  };

  const setFollowed = (list: string[]) =>
    setProfile({ ...profile, followedClubs: Array.from(new Set(list)).slice(0, 20) });

  const save = async () => {
    if (!user || !profile) return;
    setSaving(true);
    const prefRef = doc(db, 'user_profiles', user.uid);
    await updateDoc(prefRef, {
      displayName: profile.displayName || '',
      favoriteClub: profile.favoriteClub || null,
      followedClubs: profile.followedClubs || [],
      includeGeneral: !!profile.includeGeneral,
      updatedAt: new Date(),
    });
    setSaving(false);
    alert('Saved');
  };

  const resetDefaults = () => {
    setProfile({
      ...profile,
      includeGeneral: true,
      followedClubs: top6Slugs,
      favoriteClub: top6Slugs[0] || null,
    });
  };

  if (!user) {
    return (
      <main className="p-6 space-y-4">
        <h1 className="text-2xl font-semibold">Profile</h1>
        <p>Sign in to set your preferences.</p>
        <button onClick={signIn} className="px-4 py-2 rounded-2xl text-white" style={{background:'#6F9283'}}>Sign in with Google</button>
      </main>
    );
  }

  if (!profile) return <main className="p-6">Loading…</main>;

  return (
    <main className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Profile</h1>
        <button onClick={doSignOut} className="text-sm underline">Sign out</button>
      </div>

      <section className="grid gap-3 max-w-xl">
        <label className="text-sm">Email</label>
        <input value={profile.email || ''} readOnly className="border rounded-2xl p-2 opacity-70 cursor-not-allowed" />

        <label className="text-sm">Name</label>
        <input
          value={profile.displayName || ''}
          onChange={e => setProfile({ ...profile, displayName: e.target.value })}
          className="border rounded-2xl p-2"
        />

        <label className="text-sm">Favourite club</label>
        <select
          value={profile.favoriteClub || ''}
          onChange={e => setProfile({ ...profile, favoriteClub: e.target.value || null })}
          className="border rounded-2xl p-2"
        >
          <option value="">Select club…</option>
          {clubs.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={!!profile.includeGeneral}
            onChange={e => setProfile({ ...profile, includeGeneral: e.target.checked })}
          />
          Include General League News
        </label>
      </section>

      <section className="space-y-3 max-w-3xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Followed clubs</h2>
          <div className="flex gap-2">
            <button className="px-3 py-1 border rounded-2xl"
              onClick={() => setFollowed(allSlugs)}>Select all</button>
            <button className="px-3 py-1 border rounded-2xl"
              onClick={() => setFollowed(top6Slugs)}>Top-6</button>
            <button className="px-3 py-1 border rounded-2xl"
              onClick={() => setFollowed([])}>Clear</button>
            <button className="px-3 py-1 border rounded-2xl"
              onClick={resetDefaults}>Reset defaults</button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {clubs.map(c => {
            const checked = (profile.followedClubs || []).includes(c.id);
            return (
              <label key={c.id} className={`border rounded-2xl p-2 flex items-center gap-2 cursor-pointer ${checked ? 'bg-[#8D9F87]/10' : ''}`}>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleFollow(c.id)}
                />
                <span className="truncate">{c.name}</span>
                {c.isTop6 && <span className="text-[10px] ml-auto px-2 py-[2px] border rounded-full">Top-6</span>}
              </label>
            );
          })}
        </div>
      </section>

      <button
        disabled={saving}
        onClick={save}
        className="px-5 py-2 rounded-2xl text-white"
        style={{background:'#6F9283'}}
      >
        {saving ? 'Saving…' : 'Save changes'}
      </button>
    </main>
  );
}
```

---

# 5) Using preferences on Home (feed query pattern)

When you build the personalized feed, you’ll likely do:

* If **Select all** (or `followedClubs.length` equals total clubs) → one query ordered by `publishedAt` (no filter).
* Else if `followedClubs.length <= 10` → one `array-contains-any` query.
* Else (more than 10) → split into chunks of 10, run multiple queries, merge + sort client-side (Firestore limit).

Example snippet:

```ts
import { collection, getDocs, limit, orderBy, query, where } from 'firebase/firestore';

async function getPersonalizedArticles(db: any, followed: string[], pageSize = 50) {
  // Case: follow everything
  if (followed.length === 0) return []; // nothing followed
  const parts: string[][] = [];
  for (let i = 0; i < followed.length; i += 10) parts.push(followed.slice(i, i+10));

  const results: any[] = [];
  for (const p of parts) {
    const q = query(
      collection(db, 'articles'),
      where('clubs', 'array-contains-any', p),
      orderBy('publishedAt', 'desc'),
      limit(pageSize)
    );
    const s = await getDocs(q);
    s.forEach(d => results.push({ id: d.id, ...(d.data() as any) }));
  }

  // Merge + sort desc by publishedAt; dedupe by urlHash/id
  const uniq = new Map<string, any>();
  for (const r of results) uniq.set(r.id, r);
  return Array.from(uniq.values()).sort(
    (a, b) => (b.publishedAt?.toMillis?.() || 0) - (a.publishedAt?.toMillis?.() || 0)
  );
}
```

> If you implement a special `_league` tag for “General”, just add it into `followedClubs` when `includeGeneral` is true and index queries the same way.

---

# 6) One-off migration script (add prefs to existing docs)

```ts
// scripts/backfill_profiles.ts (Node/tsx with firebase-admin)
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

initializeApp({ credential: applicationDefault() });
const db = getFirestore();

(async () => {
  // compute top-6 slugs
  const clubs = await db.collection('clubs').where('isTop6','==',true).get();
  const top6 = clubs.docs.map(d => d.id);

  const snaps = await db.collection('user_profiles').get();
  for (const docSnap of snaps.docs) {
    const d = docSnap.data() || {};
    const update: any = {};
    if (d.followedClubs === undefined) update.followedClubs = top6;
    if (d.includeGeneral === undefined) update.includeGeneral = true;
    if (d.favoriteClub === undefined) update.favoriteClub = top6[0] || null;
    if (Object.keys(update).length) {
      update.updatedAt = FieldValue.serverTimestamp();
      await docSnap.ref.update(update);
      console.log('updated', docSnap.id);
    }
  }
  console.log('done');
})();
```

Run with:

```bash
# From functions/ or a small admin script folder after setting GOOGLE_APPLICATION_CREDENTIALS
npx tsx scripts/backfill_profiles.ts
```

---

## That’s it

* Simple schema.
* Safe rules.
* Auto-provision with good defaults (General + Top-6).
* Profile page with favourite club + multi-select and quick actions.
* Clear feed-query pattern you can drop into Home later.

If you’d like, I can also wire the profile screen into your existing header and add a tiny “Your feed / All news” toggle to the homepage list.


TODO

**********

here’s a tight, copy-offable TODO you can run through to land the profile system end-to-end.

# Step-by-step TODO

## 0) Prep (project hygiene)

* [ ] Confirm Firebase is set up (Auth + Firestore) in your project.
* [ ] Ensure you have a `clubs` collection (one doc per club) with fields:
  `name: string`, `isTop6: boolean`, optional `shortName`, `badgeUrl`.
* [ ] Decide your “Top-6” (e.g., Arsenal, Chelsea, Liverpool, Man City, Man Utd, Spurs) and set those docs’ `isTop6 = true`.

## 1) Data model & indexing

* [ ] Create `types/Profile.ts` with:

  * `export type ClubSlug = string;`
  * `export interface UserProfile { displayName: string; email: string; favoriteClub: ClubSlug | null; followedClubs: ClubSlug[]; includeGeneral: boolean; marketingOptIn: boolean; createdAt: Timestamp; updatedAt: Timestamp }`
* [ ] Add/update `firestore.indexes.json` to support your feed query:

```json
{
  "indexes": [
    {
      "collectionGroup": "articles",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "clubs", "arrayConfig": "CONTAINS" },
        { "fieldPath": "publishedAt", "order": "DESCENDING" }
      ]
    }
  ],
  "fieldOverrides": []
}
```

* [ ] Deploy indexes: `firebase deploy --only firestore:indexes`

## 2) Security rules

* [ ] Add **Profiles** rules to `firestore.rules` (read/write only own doc; email immutable; simple guards):

```rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    match /user_profiles/{uid} {
      allow read:  if request.auth != null && request.auth.uid == uid;

      allow create: if request.auth != null
        && request.auth.uid == uid
        && request.resource.data.email == request.auth.token.email
        && request.resource.data.displayName is string
        && request.resource.data.followedClubs is list
        && request.resource.data.followedClubs.size() <= 20
        && request.resource.data.includeGeneral is bool;

      allow update: if request.auth != null
        && request.auth.uid == uid
        && request.resource.data.email == resource.data.email
        && request.resource.data.displayName is string
        && request.resource.data.displayName.size() <= 100
        && request.resource.data.followedClubs is list
        && request.resource.data.followedClubs.size() <= 20
        && request.resource.data.includeGeneral is bool;
    }

    // (keep your existing rules)
  }
}
```

* [ ] Deploy rules: `firebase deploy --only firestore:rules`

## 3) Auto-provision profiles on first login

* [ ] Create `lib/useEnsureProfile.ts` (React client hook) that:

  * listens to `onAuthStateChanged`,
  * checks `/user_profiles/{uid}`,
  * if missing, reads Top-6 clubs → writes default doc:

    * `displayName` from auth (or empty),
    * `email` from auth,
    * `favoriteClub = first Top-6 or null`,
    * `followedClubs = Top-6 array`,
    * `includeGeneral = true`,
    * timestamps.
* [ ] Call the hook once in a top-level mounted component (e.g., layout or header) so the profile is created right after sign-in.

## 4) Profile page UI

* [ ] Create `app/profile/page.tsx` (or your route) that:

  * Loads current user (redirects to sign-in if none).
  * Fetches user profile doc.
  * Fetches all clubs (ordered by name).
  * Shows:

    * **Email** (read-only),
    * **Name** (editable),
    * **Favourite club** (single select),
    * **Include General News** (checkbox),
    * **Followed clubs** (multi-select grid with tags).
  * Quick actions: **Select all**, **Top-6**, **Clear**, **Reset defaults**.
  * **Save** button → `updateDoc` with guards (don’t change email, cap followedClubs ≤ 20).
* [ ] Add link to “Profile” in your site header.

## 5) Feed usage (Home personalization)

* [ ] In your Home loader, load the user profile.
* [ ] Compute the filter set:

  * `followed = profile.followedClubs`
  * If `includeGeneral`, consider adding a special tag, e.g., `_league`, to `followed`.
* [ ] Query strategy (Firestore limit = 10 for `array-contains-any`):

  * If `followed.length === 0` → show empty/prompt.
  * If **follow all** (or you want a global feed) → do a single ordered query without where.
  * Else, chunk `followed` by 10, run parallel queries:

    * `where('clubs','array-contains-any', chunk)`, `orderBy('publishedAt','desc')`, `limit(n)`.
  * Merge, de-dupe by id/urlHash, sort desc by `publishedAt`.
* [ ] (Optional) Cache results client-side, and/or paginate.

## 6) Backfill/migration (existing users)

* [ ] Add a one-off script (admin SDK) to set defaults for any existing profile missing the new fields (followedClubs, includeGeneral, favoriteClub).
* [ ] Run locally with proper service account creds (`GOOGLE_APPLICATION_CREDENTIALS`).

## 7) Clubs data sanity

* [ ] Verify all 20 PL teams exist in `/clubs` with doc id slugs (e.g., `arsenal`, `chelsea`).
* [ ] Mark Top-6 via `isTop6: true`.
* [ ] (Optional) Add `order` for stable display; add `badgeUrl` for nicer UI chips later.

## 8) DX + config

* [ ] Centralize Firebase client (`lib/firebaseClient.ts`) and export `auth`, `db`.
* [ ] Add TypeScript types for `Club` and `UserProfile`, and use them in the Profile page.
* [ ] Add minimal form validation for `displayName` (≤100 chars).

## 9) QA checklist

* [ ] **First login** creates profile with defaults (General + Top-6).
* [ ] **Email** is read-only; **Name** edits save and persist on refresh.
* [ ] **Favourite** persists; changing favourite doesn’t affect followed list.
* [ ] **Followed clubs**: select/clear/top-6/all work; cap at 20; UI reflects instantly.
* [ ] **General toggle** on/off changes the feed composition.
* [ ] **Security**: try to read/update another user’s profile → **DENIED**.
* [ ] **Index**: feed query with `array-contains-any + orderBy` returns without index errors (or confirm deploy).
* [ ] **Sign-out/in** flows: profile reloads correctly.

## 10) Prod polish (nice-to-have)

* [ ] Show club badges in the multi-select grid.
* [ ] Add a “Following X of 20” counter.
* [ ] Toasts instead of `alert()` for Save success/failure.
* [ ] Track a lightweight analytics event on save (e.g., `profile_saved` with counts).
* [ ] Add rate-limit/debounce on save to avoid spam updates.

---

If you want, I can drop in the exact files (hook, page, types, and tiny admin backfill) tailored to your current folder structure next.
