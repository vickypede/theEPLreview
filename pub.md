Awesome — let’s drop in a clean, card-based Publications page that reads straight from your `publications` collection (status=`published`), ordered by `publishedAt` (fallback to `createdAt`). This matches your current dark theme + white cards vibe and supports images.

---

# 1) Route: `/publications`

**`app/src/app/publications/page.tsx`**

```tsx
import type { Metadata } from "next";
import PublicationsGrid from "@/components/PublicationsGrid";

export const metadata: Metadata = {
  title: "Publications • The EPL Review",
  description: "Long-form pieces and editorials from The EPL Review.",
};

export default function PublicationsPage() {
  return (
    <main className="max-w-6xl mx-auto px-4 py-6 md:py-8">
      <h1 className="text-2xl md:text-3xl font-semibold mb-4" style={{ color: "#696D7D" }}>
        Publications
      </h1>
      <p className="mb-6 text-sm md:text-base opacity-80">
        Our latest long-form: Big-Match Reviews, Weekend Conclusions, House Takes and more.
      </p>
      <PublicationsGrid />
    </main>
  );
}
```

---

# 2) Grid + pagination (client fetch from Firestore)

**`app/src/components/PublicationsGrid.tsx`**

```tsx
'use client';

import { useEffect, useState } from "react";
import Link from "next/link";
import { db } from "@/lib/firebase";
import {
  Timestamp,
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  startAfter,
  where,
  QueryDocumentSnapshot,
  DocumentData,
} from "firebase/firestore";
import PublicationCard from "./PublicationCard";

type Publication = {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  content?: string;
  featuredImage?: string | null;
  authorByline?: string;
  type?: string;
  status: "draft" | "published";
  readingTime?: number;
  publishedAt?: Timestamp | null;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
};

const PAGE_SIZE = 12;

function toDate(ts?: Timestamp | null): Date | null {
  try { return ts ? ts.toDate() : null; } catch { return null; }
}

export default function PublicationsGrid() {
  const [items, setItems] = useState<Publication[]>([]);
  const [loading, setLoading] = useState(true);
  const [moreLoading, setMoreLoading] = useState(false);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const baseQuery = (cursor?: QueryDocumentSnapshot<DocumentData>) => {
    const col = collection(db, "publications");
    const q = query(
      col,
      where("status", "==", "published"),
      orderBy("publishedAt", "desc"),
      limit(PAGE_SIZE)
    );
    if (!cursor) return q;
    return query(
      col,
      where("status", "==", "published"),
      orderBy("publishedAt", "desc"),
      startAfter(cursor),
      limit(PAGE_SIZE)
    );
  };

  const load = async () => {
    setLoading(true);
    const snap = await getDocs(baseQuery());
    const docs = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Publication[];
    setItems(docs);
    setLastDoc(snap.docs.length ? snap.docs[snap.docs.length - 1] : null);
    setHasMore(snap.docs.length === PAGE_SIZE);
    setLoading(false);
  };

  const loadMore = async () => {
    if (!lastDoc || !hasMore) return;
    setMoreLoading(true);
    const snap = await getDocs(baseQuery(lastDoc));
    const docs = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Publication[];
    setItems((prev) => [...prev, ...docs]);
    setLastDoc(snap.docs.length ? snap.docs[snap.docs.length - 1] : null);
    setHasMore(snap.docs.length === PAGE_SIZE);
    setMoreLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <div className="grid gap-4 md:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl overflow-hidden bg-white/70 dark:bg-white p-3 shadow animate-pulse"
          >
            <div className="aspect-[16/10] rounded-xl bg-gray-200" />
            <div className="mt-3 h-5 w-3/4 bg-gray-200 rounded" />
            <div className="mt-2 h-4 w-2/3 bg-gray-200 rounded" />
            <div className="mt-4 h-4 w-1/2 bg-gray-200 rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="p-6 rounded-2xl bg-white shadow">
        Nothing published yet. Come back soon.
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-4 md:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((p) => {
          const pubDate = toDate(p.publishedAt) || toDate(p.createdAt) || null;
          return (
            <Link key={p.id} href={`/publications/${p.slug || p.id}`} prefetch={false}>
              <PublicationCard
                title={p.title}
                excerpt={p.excerpt}
                featuredImage={p.featuredImage || null}
                authorByline={p.authorByline || ""}
                type={p.type || ""}
                readingTime={p.readingTime || undefined}
                date={pubDate || undefined}
              />
            </Link>
          );
        })}
      </div>

      {hasMore && (
        <div className="flex justify-center mt-6">
          <button
            disabled={moreLoading}
            onClick={loadMore}
            className="px-4 py-2 rounded-2xl shadow"
            style={{ background: "#6F9283", color: "#fff" }}
          >
            {moreLoading ? "Loading…" : "Load more"}
          </button>
        </div>
      )}
    </>
  );
}
```

---

# 3) Card component with image + meta

**`app/src/components/PublicationCard.tsx`**

```tsx
"use client";

import Image from "next/image";
import { ReactNode } from "react";

function prettyDate(d?: Date) {
  if (!d) return "";
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function PublicationCard({
  title,
  excerpt,
  featuredImage,
  authorByline,
  type,
  readingTime,
  date,
  rightSlot,
}: {
  title: string;
  excerpt?: string;
  featuredImage?: string | null;
  authorByline?: string;
  type?: string;
  readingTime?: number;
  date?: Date;
  rightSlot?: ReactNode;
}) {
  return (
    <article className="rounded-2xl overflow-hidden bg-white shadow hover:shadow-md transition-transform hover:-translate-y-0.5">
      <div className="relative aspect-[16/10]">
        {featuredImage ? (
          <Image
            src={featuredImage}
            alt={title}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover"
            priority={false}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300" />
        )}
      </div>

      <div className="p-3 md:p-4">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="inline-flex items-center gap-2">
            {type ? (
              <span
                className="text-[11px] px-2 py-1 rounded-full"
                style={{ background: "#8D9F87", color: "#0b0b0b" }}
              >
                {type.replace(/-/g, " ")}
              </span>
            ) : null}
            {readingTime ? (
              <span className="text-xs opacity-70">{readingTime} min read</span>
            ) : null}
          </div>
          {rightSlot}
        </div>

        <h3 className="text-base md:text-lg font-semibold text-slate-900 leading-snug">
          {title}
        </h3>

        {excerpt ? (
          <p
            className="mt-1 text-sm text-slate-700"
            style={{
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {excerpt}
          </p>
        ) : null}

        <div className="mt-3 flex items-center justify-between text-xs text-slate-600">
          <span>{authorByline}</span>
          <span>{prettyDate(date)}</span>
        </div>
      </div>
    </article>
  );
}
```

---

# 4) Allow Firebase Storage images in Next/Image

**`app/next.config.js`** (merge if you already have one)

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "firebasestorage.googleapis.com" },
      // Optional: if you ever serve via storage.googleapis.com
      { protocol: "https", hostname: "storage.googleapis.com" },
    ],
  },
};

module.exports = nextConfig;
```

> Your example URL is on `firebasestorage.googleapis.com`, so this is enough.

---

# 5) (One-time) Firestore index for fast sorting

Because we filter by `status` and order by `publishedAt`, Firestore will likely ask for a composite index. Pre-add it:

**`firestore.indexes.json`** (add to the array)

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
  ],
  "fieldOverrides": []
}
```

Then:

```bash
firebase deploy --only firestore:indexes
```

---

# 6) Notes on images / admin upload

* Your admin form already uploads to `publications/{timestamp}_{filename}` and writes the download URL to the document’s `featuredImage`. The card simply uses that URL — no extra lookup required.
* If some posts don’t have images, the card shows a soft gradient fallback.

---

# 7) (Optional next step)

When you’re ready, we can wire a detail page at `/publications/[slug]` that renders `title`, `featuredImage`, and `content` (markdown) with the same style.

---

That’s it — paste these files in and you’ll have a polished, image-forward publications index fed by Firestore, sorted newest first.


Yes—let’s wire the full publication detail route so clicking a card opens `/publications/[slug]` with the hero image, title, date, author, type, reading time, and the markdown body.

Below are drop-in files you can paste. This version fetches from Firestore on the client (so it works with your existing `db` from `@/lib/firebase`), shows a nice skeleton while loading, and gracefully 404s if the post isn’t found or isn’t published.

> One-time install for markdown rendering:
>
> ```bash
> npm i react-markdown remark-gfm
> ```

---

### 1) Route file: `app/src/app/publications/[slug]/page.tsx`

```tsx
import PublicationDetail from "@/components/PublicationDetail";

export default function PublicationDetailPage({
  params,
}: {
  params: { slug: string };
}) {
  return (
    <main className="max-w-3xl mx-auto px-4 py-6 md:py-8">
      <PublicationDetail slug={decodeURIComponent(params.slug)} />
    </main>
  );
}
```

---

### 2) Client component: `app/src/components/PublicationDetail.tsx`

```tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  where,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

type Publication = {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  content?: string;
  featuredImage?: string | null;
  authorByline?: string;
  type?: string;
  status: "draft" | "published";
  readingTime?: number;
  publishedAt?: Timestamp | null;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
};

function toDate(ts?: Timestamp | null): Date | null {
  try {
    return ts ? ts.toDate() : null;
  } catch {
    return null;
  }
}

function formatDate(d?: Date | null) {
  if (!d) return "";
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function PublicationDetail({ slug }: { slug: string }) {
  const [pub, setPub] = useState<Publication | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let active = true;

    async function fetchBySlug() {
      setLoading(true);
      setNotFound(false);

      try {
        // First: by slug + status=published
        const q = query(
          collection(db, "publications"),
          where("slug", "==", slug),
          where("status", "==", "published"),
          limit(1)
        );
        const snap = await getDocs(q);

        if (!active) return;

        if (!snap.empty) {
          const d = snap.docs[0];
          setPub({ id: d.id, ...(d.data() as any) });
          setLoading(false);
          return;
        }

        // Fallback: treat slug as document ID (if someone shares an ID link)
        const asId = await getDoc(doc(db, "publications", slug));
        if (!active) return;

        if (asId.exists()) {
          const data = asId.data() as any;
          if (data.status === "published") {
            setPub({ id: asId.id, ...data });
            setLoading(false);
            return;
          }
        }

        setNotFound(true);
        setLoading(false);
      } catch (e) {
        console.error(e);
        setNotFound(true);
        setLoading(false);
      }
    }

    fetchBySlug();
    return () => {
      active = false;
    };
  }, [slug]);

  const dateToShow = useMemo(
    () => toDate(pub?.publishedAt) || toDate(pub?.createdAt),
    [pub]
  );

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-6 w-1/3 bg-gray-300 rounded" />
        <div className="relative w-full aspect-[16/9] bg-gray-200 rounded-2xl" />
        <div className="h-5 w-3/4 bg-gray-300 rounded" />
        <div className="h-4 w-full bg-gray-200 rounded" />
        <div className="h-4 w-11/12 bg-gray-200 rounded" />
        <div className="h-4 w-10/12 bg-gray-200 rounded" />
      </div>
    );
  }

  if (notFound || !pub) {
    return (
      <div className="rounded-2xl bg-white shadow p-6">
        <h1 className="text-xl font-semibold mb-2">Not found</h1>
        <p className="mb-4">This publication doesn’t exist or isn’t public.</p>
        <Link
          href="/publications"
          className="inline-block px-4 py-2 rounded-2xl shadow"
          style={{ background: "#6F9283", color: "#fff" }}
        >
          Back to Publications
        </Link>
      </div>
    );
  }

  return (
    <article className="space-y-5">
      {/* Breadcrumb */}
      <div className="text-sm opacity-80">
        <Link href="/" className="hover:underline">
          Home
        </Link>{" "}
        /{" "}
        <Link href="/publications" className="hover:underline">
          Publications
        </Link>{" "}
        / <span>{pub.title}</span>
      </div>

      {/* Title */}
      <h1 className="text-2xl md:text-3xl font-semibold" style={{ color: "#696D7D" }}>
        {pub.title}
      </h1>

      {/* Meta */}
      <div className="flex flex-wrap items-center gap-2 text-xs md:text-sm text-slate-600">
        {pub.type ? (
          <span
            className="text-[11px] px-2 py-1 rounded-full"
            style={{ background: "#8D9F87", color: "#0b0b0b" }}
          >
            {pub.type.replace(/-/g, " ")}
          </span>
        ) : null}
        {pub.authorByline ? <span>By {pub.authorByline}</span> : null}
        {dateToShow ? <span>• {formatDate(dateToShow)}</span> : null}
        {pub.readingTime ? <span>• {pub.readingTime} min read</span> : null}
      </div>

      {/* Hero image */}
      <div className="relative w-full aspect-[16/9] rounded-2xl overflow-hidden bg-background-tertiary">
        {pub.featuredImage ? (
          <Image
            src={pub.featuredImage}
            alt={pub.title}
            fill
            className="object-cover"
            sizes="100vw"
            priority={false}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300" />
        )}
      </div>

      {/* Excerpt (optional) */}
      {pub.excerpt ? (
        <p className="text-base md:text-lg text-slate-800 rounded-2xl bg-white p-4 shadow">
          {pub.excerpt}
        </p>
      ) : null}

      {/* Body */}
      <div className="rounded-2xl bg-white shadow p-4 md:p-6">
        <div className="prose prose-sm md:prose-base max-w-none prose-headings:mt-6 prose-p:leading-7">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {pub.content || ""}
          </ReactMarkdown>
        </div>
      </div>

      {/* Footer nav */}
      <div className="pt-2">
        <Link
          href="/publications"
          className="inline-block px-4 py-2 rounded-2xl shadow"
          style={{ background: "#6F9283", color: "#fff" }}
        >
          Back to Publications
        </Link>
      </div>
    </article>
  );
}
```

---

### 3) (Optional) Loading UI for the route: `app/src/app/publications/[slug]/loading.tsx`

```tsx
export default function Loading() {
  return (
    <div className="space-y-4 animate-pulse max-w-3xl mx-auto px-4 py-6 md:py-8">
      <div className="h-6 w-1/3 bg-gray-300 rounded" />
      <div className="relative w-full aspect-[16/9] bg-gray-200 rounded-2xl" />
      <div className="h-5 w-3/4 bg-gray-300 rounded" />
      <div className="h-4 w-full bg-gray-200 rounded" />
      <div className="h-4 w-11/12 bg-gray-200 rounded" />
      <div className="h-4 w-10/12 bg-gray-200 rounded" />
    </div>
  );
}
```

---

### 4) (Already done earlier)

Your `PublicationsGrid` links to `/publications/${p.slug || p.id}`—no changes needed. The detail page above supports both slug and (as a fallback) document ID, and only renders if `status === "published"`.

---

That’s it. After adding these files and installing the markdown deps, clicking any publication card will open a polished detail page with the hero image, title, meta (author/date/type/reading time), and the full markdown body—matching your site’s style.


**** 

Perfect summary — and yes, clicking a card should open a full publication page at `/publications/[slug]` with hero image, title, meta, and markdown body.

Below I’ve:

* answered your questions decisively,
* added a nav link,
* upgraded the detail page with JSON-LD for SEO and markdown element styling (no extra Tailwind plugins needed),
* kept everything aligned with your current theme and Firebase setup.

---

## Quick answers

* **Dependencies:** install now
  `npm i react-markdown remark-gfm`

* **Styling:** I’ve kept your soft neutral palette; the few hex codes remain (they match your look). You can swap them for CSS variables later, no other changes needed.

* **Navigation:** I added a “Publications” link (snippet below).

* **Type mapping:** I added a `friendlyType()` helper so `big-match-review` renders as “Big Match Review” automatically (no hardcoded list required).

* **Implementation order:** Everything below is ready to paste now. Grid + Detail are already wired.

---

## 1) Add “Publications” to your header nav

Update your `Header` nav array (where you define links):

```ts
const nav = [
  { href: "/", label: "Home" },
  { href: "/clubs", label: "Clubs" },
  { href: "/news", label: "News" },
  { href: "/publications", label: "Publications" },
  { href: "/table", label: "Table" },
  { href: "/profile", label: "Log in" },
];
```

(Everything else in your header can stay as-is.)

---

## 2) Publications Grid — already links to detail

No changes required to the grid you pasted earlier; `Link` already points to `/publications/${p.slug || p.id}`.

---

## 3) Detail route (drop-in)

### `app/src/app/publications/[slug]/page.tsx`

```tsx
import PublicationDetail from "@/components/PublicationDetail";

export default function PublicationDetailPage({
  params,
}: {
  params: { slug: string };
}) {
  return (
    <main className="max-w-3xl mx-auto px-4 py-6 md:py-8">
      <PublicationDetail slug={decodeURIComponent(params.slug)} />
    </main>
  );
}
```

### `app/src/app/publications/[slug]/loading.tsx` (optional)

```tsx
export default function Loading() {
  return (
    <div className="space-y-4 animate-pulse max-w-3xl mx-auto px-4 py-6 md:py-8">
      <div className="h-6 w-1/3 bg-gray-300 rounded" />
      <div className="relative w-full aspect-[16/9] bg-gray-200 rounded-2xl" />
      <div className="h-5 w-3/4 bg-gray-300 rounded" />
      <div className="h-4 w-full bg-gray-200 rounded" />
      <div className="h-4 w-11/12 bg-gray-200 rounded" />
      <div className="h-4 w-10/12 bg-gray-200 rounded" />
    </div>
  );
}
```

### `app/src/components/PublicationDetail.tsx`

```tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  where,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

type Publication = {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  content?: string;
  featuredImage?: string | null;
  authorByline?: string;
  type?: string;
  status: "draft" | "published";
  readingTime?: number;
  publishedAt?: Timestamp | null;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
};

function toDate(ts?: Timestamp | null): Date | null {
  try { return ts ? ts.toDate() : null; } catch { return null; }
}

function formatDate(d?: Date | null) {
  if (!d) return "";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function friendlyType(raw?: string) {
  if (!raw) return "";
  return raw
    .split("-")
    .map(s => s.charAt(0).toUpperCase() + s.slice(1))
    .join(" ");
}

export default function PublicationDetail({ slug }: { slug: string }) {
  const [pub, setPub] = useState<Publication | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let active = true;

    async function fetchBySlug() {
      setLoading(true);
      setNotFound(false);
      try {
        // Prefer slug + published
        const q = query(
          collection(db, "publications"),
          where("slug", "==", slug),
          where("status", "==", "published"),
          limit(1)
        );
        const snap = await getDocs(q);
        if (!active) return;

        if (!snap.empty) {
          const d = snap.docs[0];
          setPub({ id: d.id, ...(d.data() as any) });
          setLoading(false);
          return;
        }

        // Fallback: slug as document ID (if someone shared a raw ID link)
        const byId = await getDoc(doc(db, "publications", slug));
        if (!active) return;

        if (byId.exists()) {
          const data = byId.data() as any;
          if (data.status === "published") {
            setPub({ id: byId.id, ...data });
            setLoading(false);
            return;
          }
        }

        setNotFound(true);
        setLoading(false);
      } catch (e) {
        console.error(e);
        setNotFound(true);
        setLoading(false);
      }
    }

    fetchBySlug();
    return () => { active = false; };
  }, [slug]);

  const dateToShow = useMemo(
    () => toDate(pub?.publishedAt) || toDate(pub?.createdAt),
    [pub]
  );

  // Article JSON-LD (client-safe)
  const jsonLd = useMemo(() => {
    if (!pub) return null;
    const origin = typeof window !== "undefined" ? window.location.origin : "https://theeplreview.com";
    const url = `${origin}/publications/${pub.slug || pub.id}`;
    return {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: pub.title,
      image: pub.featuredImage ? [pub.featuredImage] : undefined,
      datePublished: dateToShow ? dateToShow.toISOString() : undefined,
      dateModified: (toDate(pub.updatedAt) || dateToShow)?.toISOString(),
      author: pub.authorByline ? { "@type": "Person", name: pub.authorByline } : undefined,
      mainEntityOfPage: { "@type": "WebPage", "@id": url },
    };
  }, [pub, dateToShow]);

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-6 w-1/3 bg-gray-300 rounded" />
        <div className="relative w-full aspect-[16/9] bg-gray-200 rounded-2xl" />
        <div className="h-5 w-3/4 bg-gray-300 rounded" />
        <div className="h-4 w-full bg-gray-200 rounded" />
        <div className="h-4 w-11/12 bg-gray-200 rounded" />
        <div className="h-4 w-10/12 bg-gray-200 rounded" />
      </div>
    );
  }

  if (notFound || !pub) {
    return (
      <div className="rounded-2xl bg-white shadow p-6">
        <h1 className="text-xl font-semibold mb-2">Not found</h1>
        <p className="mb-4">This publication doesn’t exist or isn’t public.</p>
        <Link
          href="/publications"
          className="inline-block px-4 py-2 rounded-2xl shadow"
          style={{ background: "#6F9283", color: "#fff" }}
        >
          Back to Publications
        </Link>
      </div>
    );
  }

  return (
    <article className="space-y-5">
      {/* JSON-LD for SEO */}
      {jsonLd ? (
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      ) : null}

      {/* Breadcrumb */}
      <div className="text-sm opacity-80">
        <Link href="/" className="hover:underline">Home</Link> /{" "}
        <Link href="/publications" className="hover:underline">Publications</Link> /{" "}
        <span>{pub.title}</span>
      </div>

      {/* Title */}
      <h1 className="text-2xl md:text-3xl font-semibold" style={{ color: "#696D7D" }}>
        {pub.title}
      </h1>

      {/* Meta */}
      <div className="flex flex-wrap items-center gap-2 text-xs md:text-sm text-slate-600">
        {pub.type ? (
          <span
            className="text-[11px] px-2 py-1 rounded-full"
            style={{ background: "#8D9F87", color: "#0b0b0b" }}
          >
            {friendlyType(pub.type)}
          </span>
        ) : null}
        {pub.authorByline ? <span>By {pub.authorByline}</span> : null}
        {dateToShow ? <span>• {formatDate(dateToShow)}</span> : null}
        {pub.readingTime ? <span>• {pub.readingTime} min read</span> : null}
      </div>

      {/* Hero image */}
      <div className="relative w-full aspect-[16/9] rounded-2xl overflow-hidden bg-background-tertiary">
        {pub.featuredImage ? (
          <Image
            src={pub.featuredImage}
            alt={pub.title}
            fill
            className="object-cover"
            sizes="100vw"
            priority={false}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300" />
        )}
      </div>

      {/* Excerpt */}
      {pub.excerpt ? (
        <p className="text-base md:text-lg text-slate-800 rounded-2xl bg-white p-4 shadow">
          {pub.excerpt}
        </p>
      ) : null}

      {/* Markdown body — styled without extra plugins */}
      <div className="rounded-2xl bg-white shadow p-4 md:p-6">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            h1: ({ children }) => <h2 className="text-2xl font-semibold mt-6 mb-2">{children}</h2>,
            h2: ({ children }) => <h3 className="text-xl font-semibold mt-6 mb-2">{children}</h3>,
            h3: ({ children }) => <h4 className="text-lg font-semibold mt-5 mb-2">{children}</h4>,
            p:  ({ children }) => <p className="leading-7 my-3">{children}</p>,
            a:  ({ children, href }) => <a href={href} className="underline hover:opacity-80">{children}</a>,
            ul: ({ children }) => <ul className="list-disc pl-6 my-3 space-y-1">{children}</ul>,
            ol: ({ children }) => <ol className="list-decimal pl-6 my-3 space-y-1">{children}</ol>,
            li: ({ children }) => <li className="leading-7">{children}</li>,
            blockquote: ({ children }) => (
              <blockquote className="border-l-4 pl-4 italic my-3 opacity-80">{children}</blockquote>
            ),
            code: ({ children }) => (
              <code className="bg-gray-100 px-1 py-0.5 rounded text-sm">{children}</code>
            ),
            pre: ({ children }) => (
              <pre className="bg-gray-100 p-3 rounded overflow-x-auto text-sm">{children}</pre>
            ),
            img: ({ src, alt }) => (
              <span className="block my-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src || ""} alt={alt || ""} className="rounded-xl max-w-full" />
              </span>
            ),
          }}
        >
          {pub.content || ""}
        </ReactMarkdown>
      </div>

      {/* Footer nav */}
      <div className="pt-2">
        <Link
          href="/publications"
          className="inline-block px-4 py-2 rounded-2xl shadow"
          style={{ background: "#6F9283", color: "#fff" }}
        >
          Back to Publications
        </Link>
      </div>
    </article>
  );
}
```

---

## 4) Images config (already set)

Your `next.config.js` with `firebasestorage.googleapis.com` remote pattern is correct for your example URL.

---

## 5) Firestore index (already noted)

Status + `publishedAt` composite index is recommended:

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
  ],
  "fieldOverrides": []
}
```

Deploy: `firebase deploy --only firestore:indexes`

---

## Done ✅

* Grid lists **published** posts newest first, with images.
* Clicking a card opens `/publications/[slug]` showing title, hero image, byline, date, type badge, reading time, and markdown body.
* Detail page adds JSON-LD for better SEO and doesn’t rely on Tailwind Typography.

If you want server-rendered meta tags (Open Graph/Twitter cards) next, I can switch the detail route to a server component that reads Firestore via Admin SDK and sets `generateMetadata()`—but this version is already production-friendly and matches your stack.
