"use client";

import { useEffect, useState } from 'react';
import { collection, getDocs, orderBy, limit, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Article } from '@/types';
import Link from 'next/link';

type UiArticle = Article & { sourceName?: string; source?: string };

export default function Landing() {
  const [articles, setArticles] = useState<UiArticle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        if (!db) return;
        const articlesRef = collection(db, 'articles');
        const q = query(articlesRef, orderBy('publishedAt', 'desc'), limit(6));
        const snapshot = await getDocs(q);
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
    return () => { mounted = false; };
  }, []);

  if (!db) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl font-bold mb-6">The EPL Review</h1>
          <p className="text-xl mb-8">Your comprehensive source for Premier League news, analysis, and insights</p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link 
              href="/clubs" 
              className="bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
            >
              Browse Clubs
            </Link>
            <Link 
              href="/news" 
              className="border-2 border-white text-white px-6 py-3 rounded-lg font-semibold hover:bg-white hover:text-blue-600 transition-colors"
            >
              Latest News
            </Link>
          </div>
        </div>
      </section>

      {/* News Section */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900">Latest News</h2>
            <Link 
              href="/news" 
              className="text-blue-600 hover:text-blue-800 font-semibold text-lg"
            >
              View All News →
            </Link>
          </div>
          
          {loading ? (
            <div className="text-center py-12">
              <h3 className="text-2xl font-semibold text-gray-600 mb-4">Loading latest news…</h3>
            </div>
          ) : articles.length === 0 ? (
            <div className="text-center py-12">
              <h3 className="text-2xl font-semibold text-gray-600 mb-4">No articles yet</h3>
              <p className="text-gray-500">Articles will appear here once the ingestion system is running.</p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {articles.slice(0, 6).map((article) => (
                <article key={article.id} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2 line-clamp-2">{article.title}</h3>
                  <p className="text-gray-600 text-sm mb-4">{article.sourceName || article.source || ''}</p>
                  {article.publishedAt?.toDate && (
                    <p className="text-gray-500 text-xs mb-4">{new Date(article.publishedAt.toDate()).toLocaleString()}</p>
                  )}
                  <a 
                    href={article.url} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    Read more →
                  </a>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Match Reports Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900">Match Reports</h2>
            <Link 
              href="/match-reports" 
              className="text-blue-600 hover:text-blue-800 font-semibold text-lg"
            >
              View All Reports →
            </Link>
          </div>
          
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* Placeholder Match Reports */}
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-gray-50 rounded-lg p-6 border-2 border-dashed border-gray-300">
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-gray-600 mb-2">Match Report {i}</h3>
                  <p className="text-gray-500 text-sm mb-4">Detailed analysis of recent Premier League matches</p>
                  <div className="bg-gray-200 rounded-lg p-4 mb-4">
                    <p className="text-gray-500 text-xs">Match Report Content Placeholder</p>
                  </div>
                  <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                    Coming Soon →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Big Match Review Section */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900">Big Match Review</h2>
            <Link 
              href="/big-match-review" 
              className="text-blue-600 hover:text-blue-800 font-semibold text-lg"
            >
              View All Reviews →
            </Link>
          </div>
          
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* Placeholder Big Match Reviews */}
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Big Match Review {i}</h3>
                  <p className="text-gray-600 text-sm mb-4">In-depth analysis of key Premier League fixtures</p>
                  <div className="bg-gray-100 rounded-lg p-4 mb-4">
                    <p className="text-gray-500 text-xs">Big Match Review Content Placeholder</p>
                  </div>
                  <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                    Coming Soon →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Mailbox Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900">Mailbox</h2>
            <Link 
              href="/mailbox" 
              className="text-blue-600 hover:text-blue-800 font-semibold text-lg"
            >
              View All Letters →
            </Link>
          </div>
          
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* Placeholder Mailbox Items */}
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-gray-50 rounded-lg p-6 border-2 border-dashed border-gray-300">
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-gray-600 mb-2">Fan Letter {i}</h3>
                  <p className="text-gray-500 text-sm mb-4">Reader questions and fan perspectives</p>
                  <div className="bg-gray-200 rounded-lg p-4 mb-4">
                    <p className="text-gray-500 text-xs">Mailbox Content Placeholder</p>
                  </div>
                  <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                    Coming Soon →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Editorials Section */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900">Editorials & Analysis</h2>
            <Link 
              href="/editorials" 
              className="text-blue-600 hover:text-blue-800 font-semibold text-lg"
            >
              View All Editorials →
            </Link>
          </div>
          
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* Placeholder Editorials */}
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Editorial {i}</h3>
                  <p className="text-gray-600 text-sm mb-4">Expert opinion and tactical analysis</p>
                  <div className="bg-gray-100 rounded-lg p-4 mb-4">
                    <p className="text-gray-500 text-xs">Editorial Content Placeholder</p>
                  </div>
                  <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                    Coming Soon →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Site Products Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">Site Products</h2>
          
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            {/* Placeholder Site Products */}
            {[
              { title: "Fantasy League", desc: "Premier League fantasy football" },
              { title: "Transfer Tracker", desc: "Live transfer updates and rumors" },
              { title: "Stats Hub", desc: "Comprehensive player and team statistics" },
              { title: "Live Scores", desc: "Real-time match updates and scores" }
            ].map((product, i) => (
              <div key={i} className="text-center">
                <div className="bg-gray-100 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                  <span className="text-gray-500 text-2xl">📊</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{product.title}</h3>
                <p className="text-gray-600 text-sm mb-4">{product.desc}</p>
                <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                  Coming Soon →
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
