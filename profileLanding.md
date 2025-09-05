New requirment: I want to create an AdminLanding page that openes after auth. On the page we will have some cards. 1. Add Publication (find a better name): click on this serves the current admin page where you can publish 2. Add Sources: This will then lead to an "Add Sources" page where a form presents to add source. (a form with a dropdown of clubs (gotten from the club list) and in a format that allows us to write into the schema. Do we need to update firestore rule to write into sources colelction? since it's admin should be able to write, right?

Awesome — this is a clean upgrade. We’ll keep your current `AdminGuard` exactly as-is and “fan out” the admin area into a landing hub with two paths:

* **Compose Post** (your current publication editor, moved to `/admin/write`)
* **Manage Sources** → “Add Source” form at `/admin/sources/new` (writes to the `sources` collection)

Below is the granular plan, then complete drop-in files.

---

# Plan (granular)

1. **Create the new routes**

* `app/src/app/admin/page.tsx` → becomes the **AdminLanding** (cards).
* Move your current editor into `app/src/app/admin/write/page.tsx` (no logic changes).
* Add `app/src/app/admin/sources/new/page.tsx` for the **Add Source** form.

2. **Form shape for Sources**

* Fields: `name`, `type` (`rss` | `html`), `url`, `clubSlugs` (multi-select from `/clubs`), `isActive`, plus optional `includePathRegex`, `includeTitle[]`, `excludeTitle[]`.
* Writes a doc in `/sources` with `createdAt`/`updatedAt`.
  (This matches the JSON shape you pasted: `name`, `type`, `url`, `clubSlugs`, `isActive` — with optional filters.)

3. **Rules tweak (important)**

* Your UI checks the **`isAdmin`** claim, so Firestore rules must also check **`request.auth.token.isAdmin == true`** (not `admin`).
* Ensure `/sources` and other ops collections allow admin writes.

4. **Navigation**

* The Header can keep linking to `/admin` (now the landing). Cards navigate to `/admin/write` and `/admin/sources/new`.

5. **Test gates**

* Log in with any of your three admin emails.
* Hit `/admin` → see the hub.
* “Compose Post” → your existing form works, same as before.
* “Add Source” → add a couple of sources; verify docs appear in Firestore and your functions pick them up on next run.

---

# Files to add / replace

## 1) Replace: `app/src/app/admin/page.tsx` (AdminLanding)

```tsx
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
                  <path fill="currentColor" d="M3 5a2 2 0 012-2h8l6 6v10a2 2 0 01-2 2H5a2 2 0 01-2-2V5zm12 0v4h4" />
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
```

## 2) New: `app/src/app/admin/write/page.tsx` (your existing editor, unchanged)

> This is your current `AdminEditor` page, moved from `/admin` to `/admin/write`. I only changed the file path and the default export name. Paste it as-is:

```tsx
'use client';

import AdminGuard from '@/components/AdminGuard';
import { useEffect, useMemo, useState } from 'react';
import { auth, db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, getStorage } from 'firebase/storage';
import { useRouter } from 'next/navigation';

export default function AdminWritePage() {
  return (
    <AdminGuard>
      <AdminEditor />
    </AdminGuard>
  );
}

type PubType =
  | 'final-whistle'
  | 'matchday-radar'
  | 'big-match-review'
  | 'match-report'
  | 'editorial'
  | 'analysis';

type PubStatus = 'draft' | 'review';

function AdminEditor() {
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [type, setType] = useState<PubType>('editorial');
  const [status, setStatus] = useState<PubStatus>('draft');
  const [excerpt, setExcerpt] = useState('');
  const [featuredImage, setFeaturedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDescription, setSeoDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const storage = getStorage();

  const generateExcerpt = () => {
    const stripped = content.replace(/[#*_`>~\-]|!\[.*?\]\(.*?\)|\[(.*?)\]\(.*?\)/g, '').trim();
    const words = stripped.split(/\s+/).filter(Boolean).slice(0, 30);
    setExcerpt(words.join(' ') + (words.length === 30 ? '…' : ''));
  };

  const computeStats = () => {
    const words = content.trim() ? content.trim().split(/\s+/).length : 0;
    const readingTime = Math.max(1, Math.ceil(words / 200));
    return { wordCount: words, readingTime };
  };

  const slug = useMemo(() => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }, [title]);

  const handleImageChange = (file?: File) => {
    const f = file || null;
    if (!f) return;
    setFeaturedImage(f);
    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(String(e.target?.result || ''));
    reader.readAsDataURL(f);
  };

  const uploadImage = async (file: File): Promise<string> => {
    const timestamp = Date.now();
    const fileName = `publications/${timestamp}_${file.name}`;
    const storageRef = ref(storage, fileName);
    await uploadBytes(storageRef, file);
    return await getDownloadURL(storageRef);
  };

  const create = async () => {
    if (!auth?.currentUser || !db) return;

    setSaving(true);
    setUploading(!!featuredImage);

    try {
      let imageURL = '';

      if (featuredImage) {
        imageURL = await uploadImage(featuredImage);
      }

      const { wordCount, readingTime } = computeStats();

      await addDoc(collection(db!, 'publications'), {
        title,
        content,
        type,
        status,
        excerpt,
        featuredImage: imageURL,
        seoTitle: seoTitle || title,
        seoDescription: seoDescription || excerpt,
        slug,
        authorId: auth.currentUser.uid,
        authorByline: auth.currentUser.displayName || auth.currentUser.email,
        wordCount,
        readingTime,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      setTitle('');
      setContent('');
      setType('editorial');
      setStatus('draft');
      setExcerpt('');
      setFeaturedImage(null);
      setImagePreview('');
      setSeoTitle('');
      setSeoDescription('');

      alert('Publication created successfully!');
    } catch (error) {
      console.error('Error creating publication:', error);
      alert('Error creating publication. Please try again.');
    } finally {
      setSaving(false);
      setUploading(false);
    }
  };

  const isFormValid = Boolean(title.trim() && content.trim() && excerpt.trim());
  const { wordCount, readingTime } = computeStats();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isSave = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's';
      if (isSave) {
        e.preventDefault();
        if (isFormValid && !saving) create();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isFormValid, saving, title, content, excerpt, type, status, seoTitle, seoDescription, slug]);

  return (
    <div className="min-h-screen surface section-y">
      {/* (UI unchanged) */}
      {/* ... keep the rest of your original JSX here ... */}
    </div>
  );
}
```

> ^ Keep your existing JSX exactly as you pasted earlier inside the return (I trimmed for brevity here so your message isn’t a mile long). You can also just copy your entire original file and only change the file path and the top-level component name.

## 3) New: `app/src/app/admin/sources/new/page.tsx` (Add Source form)

```tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import AdminGuard from '@/components/AdminGuard';
import { db } from '@/lib/firebase';
import {
  addDoc,
  collection,
  doc,
  getDocs,
  serverTimestamp,
  setDoc
} from 'firebase/firestore';

type Club = {
  id: string;
  name: string;
  isTop6?: boolean;
};

type SourceType = 'rss' | 'html';

function toKey(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export default function AddSourcePage() {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loadingClubs, setLoadingClubs] = useState(true);

  // form state
  const [name, setName] = useState('');
  const [customKey, setCustomKey] = useState(''); // optional: doc id slug (e.g., "arsenal-arseblog")
  const [type, setType] = useState<SourceType>('rss');
  const [url, setUrl] = useState('');
  const [clubSlugs, setClubSlugs] = useState<string[]>([]);
  const [isActive, setIsActive] = useState(true);
  const [includePathRegex, setIncludePathRegex] = useState('');
  const [includeTitle, setIncludeTitle] = useState(''); // comma-separated
  const [excludeTitle, setExcludeTitle] = useState(''); // comma-separated
  const [saving, setSaving] = useState(false);

  const inferredKey = useMemo(() => (customKey ? toKey(customKey) : toKey(name)), [customKey, name]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!db) return;
      try {
        const snap = await getDocs(collection(db, 'clubs'));
        const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Club[];
        // Top 6 first, then name
        list.sort((a, b) => {
          if ((a.isTop6 ? 1 : 0) !== (b.isTop6 ? 1 : 0)) return a.isTop6 ? -1 : 1;
          return a.name.localeCompare(b.name);
        });
        if (mounted) setClubs(list);
      } finally {
        if (mounted) setLoadingClubs(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const toggleClub = (slug: string) => {
    setClubSlugs((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db) return;
    if (!name.trim() || !url.trim()) {
      alert('Name and URL are required.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        type,
        url: url.trim(),
        clubSlugs,
        isActive,
        includePathRegex: includePathRegex.trim() || null,
        includeTitle: includeTitle
          ? includeTitle.split(',').map((s) => s.trim()).filter(Boolean)
          : null,
        excludeTitle: excludeTitle
          ? excludeTitle.split(',').map((s) => s.trim()).filter(Boolean)
          : null,
        failureCount: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      if (inferredKey) {
        await setDoc(doc(db, 'sources', inferredKey), payload, { merge: true });
      } else {
        await addDoc(collection(db, 'sources'), payload);
      }

      // reset form
      setName('');
      setCustomKey('');
      setType('rss');
      setUrl('');
      setClubSlugs([]);
      setIsActive(true);
      setIncludePathRegex('');
      setIncludeTitle('');
      setExcludeTitle('');

      alert('Source added.');
    } catch (err) {
      console.error(err);
      alert('Failed to add source. Check console.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminGuard>
      <div className="min-h-screen surface section-y">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-6">
            <h1 className="text-lg font-bold font-heading">Add Source</h1>
            <p className="text-muted-foreground text-sm">
              Add an RSS/HTML source and (optionally) constrain by path/title filters.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="grid gap-6 md:grid-cols-12">
            <section className="card p-5 md:col-span-8 space-y-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Name *</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input"
                  placeholder="e.g., Arseblog"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Custom Key (optional)</label>
                <input
                  value={customKey}
                  onChange={(e) => setCustomKey(e.target.value)}
                  className="input"
                  placeholder="e.g., arsenal-arseblog (slug). Leave blank to auto-generate from name."
                />
                <p className="text-[11px] text-muted-foreground mt-1">Will save as <code>{inferredKey || '—'}</code></p>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Type *</label>
                  <select value={type} onChange={(e) => setType(e.target.value as SourceType)} className="select">
                    <option value="rss">RSS</option>
                    <option value="html">HTML</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">URL *</label>
                  <input
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    className="input"
                    placeholder="https://example.com/feed or https://site/club/news"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Include Path Regex (optional)</label>
                <input
                  value={includePathRegex}
                  onChange={(e) => setIncludePathRegex(e.target.value)}
                  className="input"
                  placeholder="/arsenal|/teams/arsenal"
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Include Title (comma-separated)</label>
                  <input
                    value={includeTitle}
                    onChange={(e) => setIncludeTitle(e.target.value)}
                    className="input"
                    placeholder="Arsenal,Gunners,AFC"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Exclude Title (comma-separated)</label>
                  <input
                    value={excludeTitle}
                    onChange={(e) => setExcludeTitle(e.target.value)}
                    className="input"
                    placeholder="Chelsea,Manchester City"
                  />
                </div>
              </div>
            </section>

            <aside className="md:col-span-4 space-y-6">
              <section className="card p-5">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-foreground">Clubs</h2>
                  <label className="inline-flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                      className="mr-2"
                    />
                    Active
                  </label>
                </div>
                <div className="mt-3 max-h-64 overflow-auto space-y-2">
                  {loadingClubs ? (
                    <div className="text-sm text-muted-foreground">Loading clubs…</div>
                  ) : clubs.length === 0 ? (
                    <div className="text-sm text-muted-foreground">No clubs found. Seed the clubs collection.</div>
                  ) : (
                    clubs.map((c) => (
                      <label key={c.id} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={clubSlugs.includes(c.id)}
                          onChange={() => toggleClub(c.id)}
                        />
                        <span>{c.name}</span>
                        {c.isTop6 && <span className="ml-auto text-[10px] px-1 py-0.5 rounded surface-2 border border-border">Top-6</span>}
                      </label>
                    ))
                  )}
                </div>
              </section>

              <section className="card p-4 sticky top-[88px] space-y-3">
                <button
                  type="submit"
                  disabled={saving || !name.trim() || !url.trim()}
                  className="btn btn-primary w-full disabled:opacity-60"
                >
                  {saving ? 'Saving…' : 'Add Source'}
                </button>
                <a href="/admin" className="btn w-full text-center">Back to Admin</a>
              </section>
            </aside>
          </form>
        </div>
      </div>
    </AdminGuard>
  );
}
```

## 4) Firestore Rules — make sure `isAdmin` is used

If your current rules check `request.auth.token.admin`, change them to `isAdmin` so they align with your `AdminGuard` claim:

```diff
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Public articles (read-only)
    match /articles/{doc} {
      allow read: if true;
      allow write: if false;
    }

    // Admin-only operational collections
-   match /{colName}/{doc} where colName in ['sources','ingestion_runs','mailboxes','config'] {
-     allow read, write: if request.auth.token.admin == true;
-   }
+   match /{colName}/{doc} where colName in ['sources','ingestion_runs','mailboxes','config'] {
+     allow read, write: if request.auth != null && request.auth.token.isAdmin == true;
+   }

    // Clubs readable; admin write
    match /clubs/{doc} {
-     allow read: if true;
-     allow write: if request.auth.token.admin == true;
+     allow read: if true;
+     allow write: if request.auth != null && request.auth.token.isAdmin == true;
    }

    // (Other collections unchanged…)
  }
}
```

Then:

```bash
firebase deploy --only firestore:rules
```

---

## That’s it — quick smoke test

* Visit `/admin` → see two cards.
* Click **Compose Post** → same editor as before (now at `/admin/write`).
* Click **Add Source** → add e.g. “Football.London (Chelsea)” with `type=html`, URL, tick `Chelsea`, save.
* Check Firestore → `/sources` shows your new doc (`name`, `type`, `url`, `clubSlugs`, `isActive`, filters, timestamps).
* Your ingest function should naturally pick up newly added sources on its next run.

If you want a quick “list existing sources” page next to the form (toggle isActive, etc.), say the word and I’ll add `/admin/sources` with table + inline actions.


***     CLARITY PROVIDED  ***

Great qs—quick answers, then copy-paste patches ✅

## 1) “Can’t I have both `admin` and `isAdmin`?”

Yes. Support **both claim names** in Firestore rules (back-compat) and in your client check, so nobody gets locked out if an older token was issued with `admin`.

### Firestore rules (back-compat helper + usage)

```diff
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

+   function isAdmin() {
+     return request.auth != null &&
+       ((request.auth.token.isAdmin == true) || (request.auth.token.admin == true));
+   }

    // Public articles (read-only)
    match /articles/{doc} {
      allow read: if true;
      allow write: if false;
    }

    // Admin-only operational collections
    match /{colName}/{doc} where colName in ['sources','ingestion_runs','mailboxes','config'] {
-     allow read, write: if request.auth != null && request.auth.token.isAdmin == true;
+     allow read, write: if isAdmin();
    }

    // Clubs readable; admin write
    match /clubs/{doc} {
      allow read: if true;
-     allow write: if request.auth != null && request.auth.token.isAdmin == true;
+     allow write: if isAdmin();
    }

    // Add other secured collections here...
  }
}
```

### AdminGuard (also accept either claim)

Patch both places you read the token:

```diff
- const isAdmin = token.claims.isAdmin === true;
+ const isAdmin = token.claims.isAdmin === true || (token.claims as any).admin === true;
```

and in the debug / retry block:

```diff
- const isAdmin = token?.claims?.isAdmin === true;
+ const isAdmin = token?.claims?.isAdmin === true || (token?.claims as any)?.admin === true;
```

That’s it—you now honor either claim name. (Your `ensureAdminClaim()` can keep setting `isAdmin`; the rules remain tolerant of legacy `admin`.)

---

## 2) “Why did you include `includePathRegex`, `includeTitle[]`, `excludeTitle[]`?”

You’ve repeatedly run into **non-news pages** being ingested (contact pages, category hubs, fixture indexes, etc.). These optional fields are a **per-source “precision filter”** so you can:

* **Whitelist** paths (via regex) for HTML sources (e.g., only `/news/` or `/arsenal/`),
* **Keyword-gate** titles you **must include**, and
* **Keyword-block** titles to **exclude** (e.g., “fixtures”, “results”, “contact”, etc.).

They’re **optional**: leave them blank and nothing changes. Use them only when a domain is noisy. If your ingestion code already supports them, they take effect; if not, they’re harmless until we wire them in.

If you prefer not to surface them up front, here are two UI choices:

### A) Hide behind “Advanced filters” (recommended)

Drop-in tweak for `/admin/sources/new/page.tsx`:

```diff
+ const [showAdvanced, setShowAdvanced] = useState(false);

... inside the main form, before advanced fields ...
+ <button type="button" onClick={() => setShowAdvanced(v => !v)} className="btn btn-ghost text-sm">
+   {showAdvanced ? 'Hide' : 'Show'} Advanced Filters
+ </button>

-  <div>
+ {showAdvanced && (<div>
     <label className="block text-xs font-medium text-muted-foreground mb-1">Include Path Regex (optional)</label>
     <input ... />
-  </div>
+ </div>)}

-  <div className="grid md:grid-cols-2 gap-4">
+ {showAdvanced && (<div className="grid md:grid-cols-2 gap-4">
     <div> ... Include Title ... </div>
     <div> ... Exclude Title ... </div>
-  </div>
+ </div>)}
```

### B) Remove them entirely (simplest)

Delete those fields from the form **and** from the payload you `setDoc(...)`. You can re-add later if needed.

---

## (Optional) How the filters are used in ingestion

If your current HTML/RSS ingest doesn’t read these yet, this is the tiny server-side hook you’d add where you already validate items:

```ts
// Pseudocode inside your ingestion loop per item:
const src = /* the source doc */;
const title = item.title?.trim() ?? '';
const url = item.link ?? item.url ?? '';

const includeTitle = Array.isArray(src.includeTitle) ? src.includeTitle : [];
const excludeTitle = Array.isArray(src.excludeTitle) ? src.excludeTitle : [];
const includePathRegex = src.includePathRegex ? new RegExp(src.includePathRegex, 'i') : null;

// Path gating (HTML sources especially)
if (includePathRegex && !includePathRegex.test(new URL(url).pathname)) {
  skip('path not allowed');
}

// Title includes (if provided, must match at least one)
if (includeTitle.length > 0 && !includeTitle.some(k => title.toLowerCase().includes(k.toLowerCase()))) {
  skip('missing required keyword');
}

// Title excludes
if (excludeTitle.some(k => title.toLowerCase().includes(k.toLowerCase()))) {
  skip('blocked keyword');
}
```

This directly addresses your earlier “it’s pulling non-news pages” problem without hard-coding every site.

---

## 3) “Do we need to update rules to write into `sources`?”

Yes—done above. With the `isAdmin()` helper, admins can **create/update** docs in `/sources`. That matches your UI intent (“since it’s admin should be able to write, right?”).

---

If you want, I can also add a `/admin/sources` list view with toggleable `isActive`, inline edit, and delete—just say “add sources list” and I’ll ship it.
