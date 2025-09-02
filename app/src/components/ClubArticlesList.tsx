"use client";

import { useEffect, useState } from 'react';
import { collection, getDocs, limit, orderBy, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Article, Club } from '@/types';

type UiArticle = Article & { sourceName?: string; source?: string };

export default function ClubArticlesList({ slug }: { slug: string }) {
  const [club, setClub] = useState<Club | null>(null);
  const [articles, setArticles] = useState<UiArticle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        if (!db) return;
        // Load club by id (slug)
        const clubsRef = collection(db, 'clubs');
        const clubQ = query(clubsRef, where('id', '==', slug));
        const clubSnap = await getDocs(clubQ);
        const clubDoc = clubSnap.docs[0];
        if (clubDoc) {
          const data = clubDoc.data() as Omit<Club, 'id'>;
          if (mounted) setClub({ id: slug, ...data });
        }

        // Load latest articles for this club
        const articlesRef = collection(db, 'articles');
        const articlesQ = query(
          articlesRef,
          where('clubs', 'array-contains', slug),
          orderBy('publishedAt', 'desc'),
          limit(30)
        );
        const snapshot = await getDocs(articlesQ);
        const list = snapshot.docs.map((d) => {
          const data = d.data() as Omit<Article, 'id'> & { sourceName?: string; source?: string };
          return { id: d.id, ...data } as UiArticle;
        });
        if (mounted) setArticles(list);
      } catch {
        // ignore
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [slug]);

  if (!db) return null;

  if (loading) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-semibold text-gray-600 mb-4">Loading…</h2>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">{club?.name || slug}</h1>
        <p className="text-gray-600">Latest news and updates</p>
      </div>
      {articles.length === 0 ? (
        <div className="text-center py-12">
          <h2 className="text-2xl font-semibold text-gray-600 mb-4">No articles yet</h2>
          <p className="text-gray-500">Articles will appear here once the ingestion system is running.</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {articles.map((article) => (
            <article key={article.id} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
              <h2 className="text-xl font-semibold text-gray-900 mb-2 line-clamp-2">{article.title}</h2>
              <p className="text-gray-600 text-sm mb-4">{article.sourceName || article.source || ''}</p>
              {article.publishedAt?.toDate && (
                <p className="text-gray-500 text-xs">{new Date(article.publishedAt.toDate()).toLocaleString()}</p>
              )}
              <a href={article.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 text-sm font-medium">Read more →</a>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}


