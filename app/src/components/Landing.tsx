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

      {/* News Section */}
      <section className="py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900">Latest News</h2>
            <Link 
              href="/news" 
              className="text-blue-600 hover:text-blue-800 font-semibold text-base"
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
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {articles.slice(0, 6).map((article) => (
                <article key={article.id} className="bg-white rounded-xl border p-4 hover:shadow-md transition-shadow">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">{article.title}</h3>
                  <p className="text-gray-600 text-xs mb-3">{article.sourceName || article.source || ''}</p>
                  {article.publishedAt?.toDate && (
                    <p className="text-gray-500 text-[11px] mb-3">{new Date(article.publishedAt.toDate()).toLocaleString()}</p>
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

      {/* Editorials & Analysis Section - 6 tiles showing all publication types */}
      <section className="py-10 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900">Editorials & Analysis</h2>
            <Link 
              href="/editorials" 
              className="text-blue-600 hover:text-blue-800 font-semibold text-base"
            >
              View All Editorials →
            </Link>
          </div>
          
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {/* 6 tiles showing all publication types */}
            {[
              { 
                type: "Final Whistle", 
                title: "Victors & Vanquished", 
                desc: "Weekend conclusions and key takeaways",
                color: "from-green-600 to-green-700"
              },
              { 
                type: "Matchday Radar", 
                title: "Pre-Match Analysis", 
                desc: "Storylines and tactics ahead of fixtures",
                color: "from-blue-600 to-blue-700"
              },
              { 
                type: "Full-Time Verdict", 
                title: "Post-Match Review", 
                desc: "Big-match analysis ~2 hours after FT",
                color: "from-purple-600 to-purple-700"
              },
              { 
                type: "Pretender List", 
                title: "Fraud Watch", 
                desc: "Call-outs of overrated players/managers",
                color: "from-red-600 to-red-700"
              },
              { 
                type: "High Press", 
                title: "House Opinion", 
                desc: "Punchy takes and editorial voice",
                color: "from-orange-600 to-orange-700"
              },
              { 
                type: "Weekend Roundup", 
                title: "Complete Coverage", 
                desc: "All the weekend's biggest stories",
                color: "from-indigo-600 to-indigo-700"
              }
            ].map((publication, i) => (
              <div key={i} className="bg-white rounded-xl border p-4 hover:shadow-md transition-shadow">
                <div className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold text-white mb-2 bg-gradient-to-r ${publication.color}`}>
                  {publication.type}
                </div>
                <h3 className="text-base font-semibold text-gray-900 mb-1.5">{publication.title}</h3>
                <p className="text-gray-600 text-xs mb-3">{publication.desc}</p>
                <div className="bg-gray-50 rounded-lg p-2.5 mb-3">
                  <p className="text-gray-500 text-[11px]">Content will appear here once publications are created</p>
                </div>
                <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                  Coming Soon →
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Mailbox Section - 3 tiles */}
      <section className="py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900">Mailbox</h2>
            <Link 
              href="/mailbox" 
              className="text-blue-600 hover:text-blue-800 font-semibold text-base"
            >
              View All Letters →
            </Link>
          </div>
          
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {/* 3 Mailbox tiles */}
            {[
              { title: "Fan Question", desc: "Reader asks about tactical changes" },
              { title: "Transfer Talk", desc: "Fan perspective on latest rumors" },
              { title: "Match Reaction", desc: "Supporter thoughts on weekend games" }
            ].map((item, i) => (
              <div key={i} className="bg-white rounded-xl border p-4 hover:shadow-md transition-shadow">
                <div className="text-center">
                  <div className="bg-blue-100 rounded-full w-12 h-12 mx-auto mb-3 flex items-center justify-center">
                    <span className="text-blue-600 text-xl">✉️</span>
                  </div>
                  <h3 className="text-base font-semibold text-gray-900 mb-1.5">{item.title}</h3>
                  <p className="text-gray-600 text-xs mb-3">{item.desc}</p>
                  <div className="bg-gray-100 rounded-lg p-2.5 mb-3">
                    <p className="text-gray-500 text-[11px]">Fan letter content will appear here</p>
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

      {/* Match Reports Section - 3 tiles */}
      <section className="py-10 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900">Match Reports</h2>
            <Link 
              href="/match-reports" 
              className="text-blue-600 hover:text-blue-800 font-semibold text-base"
            >
              View All Reports →
            </Link>
          </div>
          
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {/* 3 Match Report tiles */}
            {[
              { title: "Arsenal vs Chelsea", desc: "Tactical breakdown of key moments" },
              { title: "Manchester Derby", desc: "Analysis of United vs City clash" },
              { title: "Liverpool vs Tottenham", desc: "Post-match insights and stats" }
            ].map((report, i) => (
              <div key={i} className="bg-gray-50 rounded-xl p-4 border border-dashed border-gray-300">
                <div className="text-center">
                  <h3 className="text-base font-semibold text-gray-600 mb-1.5">{report.title}</h3>
                  <p className="text-gray-500 text-xs mb-3">{report.desc}</p>
                  <div className="bg-gray-200 rounded-lg p-3 mb-3">
                    <p className="text-gray-500 text-[11px]">Match Report Content Placeholder</p>
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

      {/* Big Match Review Section - 3 tiles */}
      <section className="py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900">Big Match Review</h2>
            <Link 
              href="/big-match-review" 
              className="text-blue-600 hover:text-blue-800 font-semibold text-base"
            >
              View All Reviews →
            </Link>
          </div>
          
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {/* 3 Big Match Review tiles */}
            {[
              { title: "Title Race Analysis", desc: "Impact on Premier League standings" },
              { title: "Champions League Race", desc: "Top 4 battle implications" },
              { title: "Relegation Battle", desc: "Bottom of table drama" }
            ].map((review, i) => (
              <div key={i} className="bg-white rounded-xl border p-4 hover:shadow-md transition-shadow">
                <div className="text-center">
                  <h3 className="text-base font-semibold text-gray-900 mb-1.5">{review.title}</h3>
                  <p className="text-gray-600 text-xs mb-3">{review.desc}</p>
                  <div className="bg-gray-100 rounded-lg p-3 mb-3">
                    <p className="text-gray-500 text-[11px]">Big Match Review Content Placeholder</p>
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

      {/* Site Products Section - 4 tiles */}
      <section className="py-10 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-10">Site Products</h2>
          
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {/* 4 Site Product tiles */}
            {[
              { title: "Fantasy League", desc: "Premier League fantasy football", icon: "🏆" },
              { title: "Transfer Tracker", desc: "Live transfer updates and rumors", icon: "🔄" },
              { title: "Stats Hub", desc: "Comprehensive player and team statistics", icon: "📊" },
              { title: "Live Scores", desc: "Real-time match updates and scores", icon: "⚽" }
            ].map((product, i) => (
              <div key={i} className="text-center">
                <div className="bg-gray-100 rounded-full w-16 h-16 mx-auto mb-3 flex items-center justify-center">
                  <span className="text-gray-500 text-xl">{product.icon}</span>
                </div>
                <h3 className="text-base font-semibold text-gray-900 mb-1.5">{product.title}</h3>
                <p className="text-gray-600 text-xs mb-3">{product.desc}</p>
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
