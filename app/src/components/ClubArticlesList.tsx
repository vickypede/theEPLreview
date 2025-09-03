"use client";

import { useEffect, useState } from 'react';
import { collection, getDocs, orderBy, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Article, Club } from '@/types';

type UiArticle = Article & { sourceName?: string; source?: string };

export default function ClubArticlesList({ slug }: { slug: string }) {
  const [club, setClub] = useState<Club | null>(null);
  const [articles, setArticles] = useState<UiArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [allArticles, setAllArticles] = useState<UiArticle[]>([]);
  const articlesPerPage = 30;
  const [totalPages, setTotalPages] = useState(1);

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

        // Load ALL articles for this club (no limit for pagination)
        const articlesRef = collection(db, 'articles');
        const articlesQ = query(
          articlesRef,
          where('clubs', 'array-contains', slug),
          orderBy('publishedAt', 'desc')
        );
        const snapshot = await getDocs(articlesQ);
        const list = snapshot.docs.map((d) => {
          const data = d.data() as Omit<Article, 'id'> & { sourceName?: string; source?: string };
          return { id: d.id, ...data } as UiArticle;
        });
        if (mounted) {
          setAllArticles(list);
          setTotalPages(Math.ceil(list.length / articlesPerPage));
        }
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

  // Calculate current page articles
  useEffect(() => {
    const startIndex = (currentPage - 1) * articlesPerPage;
    const endIndex = startIndex + articlesPerPage;
    const pageArticles = allArticles.slice(startIndex, endIndex);
    setArticles(pageArticles);
  }, [currentPage, allArticles]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (!db) return null;

  if (loading) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-semibold text-muted-foreground mb-4">Loading…</h2>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-foreground mb-2">{club?.name || slug}</h1>
        <p className="text-muted-foreground">Latest news and updates</p>
      </div>
      
      {allArticles.length === 0 ? (
        <div className="text-center py-12">
          <h2 className="text-2xl font-semibold text-muted-foreground mb-4">No articles yet</h2>
          <p className="text-muted-foreground">Articles will appear here once the ingestion system is running.</p>
        </div>
      ) : (
        <>
          {/* Articles Grid */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
            {articles.map((article) => (
              <article key={article.id} className="bg-card rounded-lg shadow-md p-3 sm:p-4 md:p-6 hover:shadow-lg transition-shadow border border-border">
                <h2 className="text-base sm:text-lg md:text-xl font-semibold text-foreground mb-1 sm:mb-2 line-clamp-2">{article.title}</h2>
                <p className="text-muted-foreground text-xs sm:text-sm mb-2 sm:mb-4">{article.sourceName || article.source || ''}</p>
                {article.publishedAt?.toDate && (
                  <p className="text-muted-foreground text-xs mb-2 sm:mb-4">{new Date(article.publishedAt.toDate()).toLocaleString()}</p>
                )}
                <a href={article.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-foreground text-xs sm:text-sm font-medium">Read more →</a>
              </article>
            ))}
          </div>

          {/* Pagination - Only show if more than one page */}
          {totalPages > 1 && (
            <>
              {/* Pagination Controls */}
              <div className="flex justify-center items-center space-x-2 mb-8">
                {/* Previous Page */}
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className={`px-4 py-2 rounded-lg font-medium ${
                    currentPage === 1
                      ? 'surface-2 text-muted-foreground cursor-not-allowed'
                      : 'bg-primary text-primary-foreground hover:text-foreground'
                  }`}
                >
                  Previous
                </button>

                {/* Page Numbers */}
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => handlePageChange(page)}
                    className={`px-4 py-2 rounded-lg font-medium ${
                      currentPage === page
                        ? 'bg-primary text-primary-foreground'
                        : 'surface-2 text-foreground hover:text-primary'
                    }`}
                  >
                    {page}
                  </button>
                ))}

                {/* Next Page */}
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className={`px-4 py-2 rounded-lg font-medium ${
                    currentPage === totalPages
                      ? 'surface-2 text-muted-foreground cursor-not-allowed'
                      : 'bg-primary text-primary-foreground hover:text-foreground'
                  }`}
                >
                  Next
                </button>
              </div>

              {/* Page Info */}
              <div className="text-center text-muted-foreground mb-8">
                <p>
                  Showing page {currentPage} of {totalPages} •
                  Articles {((currentPage - 1) * articlesPerPage) + 1} - {Math.min(currentPage * articlesPerPage, allArticles.length)} of {allArticles.length}
                </p>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}


