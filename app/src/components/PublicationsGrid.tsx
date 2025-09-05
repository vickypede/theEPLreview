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
