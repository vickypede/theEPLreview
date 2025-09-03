"use client";

import { useEffect, useState } from 'react';
import { collection, getDocs, orderBy, limit, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Article } from '@/types';

type UiArticle = Article & { sourceName?: string; source?: string };

export default function ArticlesList() {
  const [articles, setArticles] = useState<UiArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [allArticles, setAllArticles] = useState<UiArticle[]>([]);
  const articlesPerPage = 30;
  const totalPages = 3;

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        if (!db) return;
        const articlesRef = collection(db, 'articles');
        const q = query(articlesRef, orderBy('publishedAt', 'desc'), limit(90));
        const snapshot = await getDocs(q);
        const list = snapshot.docs.map((d) => {
          const data = d.data() as Omit<Article, 'id'> & { sourceName?: string; source?: string };
          return { id: d.id, ...data } as UiArticle;
        });
        if (mounted) {
          setAllArticles(list);
        }
      } catch {
        // ignore
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, []);

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

  if (allArticles.length === 0) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-semibold text-muted-foreground mb-4">No articles yet</h2>
        <p className="text-muted-foreground">Articles will appear here once the ingestion system is running.</p>
      </div>
    );
  }

  return (
    <div>
      {/* Articles Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
        {articles.map((article) => (
          <article key={article.id} className="bg-card rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow border border-border">
            <h2 className="text-xl font-semibold text-foreground mb-2 line-clamp-2">{article.title}</h2>
            <p className="text-muted-foreground text-sm mb-4">{article.sourceName || article.source || ''}</p>
            {article.publishedAt?.toDate && (
              <p className="text-muted-foreground text-xs mb-4">{new Date(article.publishedAt.toDate()).toLocaleString()}</p>
            )}
            <a href={article.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-foreground text-sm font-medium">Read more →</a>
          </article>
        ))}
      </div>

      {/* Pagination */}
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
      <div className="text-center text-muted-foreground">
        <p>
          Showing page {currentPage} of {totalPages} • 
          Articles {((currentPage - 1) * articlesPerPage) + 1} - {Math.min(currentPage * articlesPerPage, allArticles.length)} of {allArticles.length}
        </p>
      </div>
    </div>
  );
}
