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
    <div className="min-h-screen surface">

      {/* News Section */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-3xl font-bold text-foreground">Latest News</h2>
            <Link 
              href="/news" 
              className="text-primary hover:text-foreground font-semibold text-lg"
            >
              View All News →
            </Link>
          </div>
          
          {loading ? (
            <div className="text-center py-12">
              <h3 className="text-2xl font-semibold text-muted-foreground mb-4">Loading latest news…</h3>
            </div>
          ) : articles.length === 0 ? (
            <div className="text-center py-12">
              <h3 className="text-2xl font-semibold text-muted-foreground mb-4">No articles yet</h3>
              <p className="text-muted-foreground">Articles will appear here once the ingestion system is running.</p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {articles.slice(0, 6).map((article) => (
                <article key={article.id} className="bg-card rounded-lg shadow-md p-3 sm:p-3 md:p-3 lg:p-4 hover:shadow-lg transition-shadow border border-border">
                  <h3 className="text-base sm:text-base md:text-base lg:text-lg font-semibold leading-tight text-foreground mb-1 sm:mb-1 md:mb-1 lg:mb-2 line-clamp-2">{article.title}</h3>
                  <p className="text-muted-foreground text-xs sm:text-xs md:text-xs lg:text-sm mb-1 sm:mb-1 md:mb-1 lg:mb-3">{article.sourceName || article.source || ''}</p>
                  {article.publishedAt?.toDate && (
                    <p className="text-muted-foreground text-xs mb-1 sm:mb-1 md:mb-1 lg:mb-3">{new Date(article.publishedAt.toDate()).toLocaleString()}</p>
                  )}
                  <a 
                    href={article.url} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-primary hover:text-foreground text-xs sm:text-xs md:text-xs lg:text-sm font-medium"
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
      <section className="py-16 surface-2">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-3xl font-bold text-foreground">Editorials & Analysis</h2>
            <Link 
              href="/editorials" 
              className="text-primary hover:text-foreground font-semibold text-lg"
            >
              View All Editorials →
            </Link>
          </div>
          
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* 6 tiles showing all publication types */}
            {[
              { 
                type: "Final Whistle", 
                title: "Victors & Vanquished", 
                desc: "Weekend conclusions and key takeaways",
              },
              { 
                type: "Matchday Radar", 
                title: "Pre-Match Analysis", 
                desc: "Storylines and tactics ahead of fixtures",
              },
              { 
                type: "Full-Time Verdict", 
                title: "Post-Match Review", 
                desc: "Big-match analysis ~2 hours after FT",
              },
              { 
                type: "Pretender List", 
                title: "Fraud Watch", 
                desc: "Call-outs of overrated players/managers",
              },
              { 
                type: "High Press", 
                title: "House Opinion", 
                desc: "Punchy takes and editorial voice",
              },
              { 
                type: "Weekend Roundup", 
                title: "Complete Coverage", 
                desc: "All the weekend's biggest stories",
              }
            ].map((publication, i) => (
              <div key={i} className="bg-card rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow border border-border">
                <div className="inline-block px-3 py-1 rounded-full text-xs font-semibold mb-3 bg-muted text-muted-foreground border border-border">
                  {publication.type}
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{publication.title}</h3>
                <p className="text-muted-foreground text-sm mb-4">{publication.desc}</p>
                <div className="surface-3 rounded-lg p-3 mb-4 border border-border">
                  <p className="text-muted-foreground text-xs">Content will appear here once publications are created</p>
                </div>
                <button className="text-primary hover:text-foreground text-sm font-medium">
                  Coming Soon →
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Mailbox Section - 3 tiles */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-3xl font-bold text-foreground">Mailbox</h2>
            <Link 
              href="/mailbox" 
              className="text-primary hover:text-foreground font-semibold text-lg"
            >
              View All Letters →
            </Link>
          </div>
          
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* 3 Mailbox tiles */}
            {[
              { title: "Fan Question", desc: "Reader asks about tactical changes" },
              { title: "Transfer Talk", desc: "Fan perspective on latest rumors" },
              { title: "Match Reaction", desc: "Supporter thoughts on weekend games" }
            ].map((item, i) => (
              <div key={i} className="bg-card rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
                <div className="text-center">
                  <div className="surface-2 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center border border-border">
                    <span className="text-2xl">✉️</span>
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">{item.title}</h3>
                  <p className="text-muted-foreground text-sm mb-4">{item.desc}</p>
                  <div className="surface-3 rounded-lg p-3 mb-4 border border-border">
                    <p className="text-muted-foreground text-xs">Fan letter content will appear here</p>
                  </div>
                  <button className="text-primary hover:text-foreground text-sm font-medium">
                    Coming Soon →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Match Reports Section - 3 tiles */}
      <section className="py-16 surface-2">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-3xl font-bold text-foreground">Match Reports</h2>
            <Link 
              href="/match-reports" 
              className="text-primary hover:text-foreground font-semibold text-lg"
            >
              View All Reports →
            </Link>
          </div>
          
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* 3 Match Report tiles */}
            {[
              { title: "Arsenal vs Chelsea", desc: "Tactical breakdown of key moments" },
              { title: "Manchester Derby", desc: "Analysis of United vs City clash" },
              { title: "Liverpool vs Tottenham", desc: "Post-match insights and stats" }
            ].map((report, i) => (
              <div key={i} className="surface-3 rounded-lg p-6 border-2 border-dashed border-border">
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-foreground mb-2">{report.title}</h3>
                  <p className="text-muted-foreground text-sm mb-4">{report.desc}</p>
                  <div className="surface-2 rounded-lg p-4 mb-4 border border-border">
                    <p className="text-muted-foreground text-xs">Match Report Content Placeholder</p>
                  </div>
                  <button className="text-primary hover:text-foreground text-sm font-medium">
                    Coming Soon →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Big Match Review Section - 3 tiles */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-3xl font-bold text-foreground">Big Match Review</h2>
            <Link 
              href="/big-match-review" 
              className="text-primary hover:text-foreground font-semibold text-lg"
            >
              View All Reviews →
            </Link>
          </div>
          
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* 3 Big Match Review tiles */}
            {[
              { title: "Title Race Analysis", desc: "Impact on Premier League standings" },
              { title: "Champions League Race", desc: "Top 4 battle implications" },
              { title: "Relegation Battle", desc: "Bottom of table drama" }
            ].map((review, i) => (
              <div key={i} className="bg-card rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-foreground mb-2">{review.title}</h3>
                  <p className="text-muted-foreground text-sm mb-4">{review.desc}</p>
                  <div className="surface-2 rounded-lg p-4 mb-4 border border-border">
                    <p className="text-muted-foreground text-xs">Big Match Review Content Placeholder</p>
                  </div>
                  <button className="text-primary hover:text-foreground text-sm font-medium">
                    Coming Soon →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Site Products Section - 4 tiles */}
      <section className="py-16 surface-2">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-foreground text-center mb-12">Site Products</h2>
          
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            {/* 4 Site Product tiles */}
            {[
              { title: "Fantasy League", desc: "Premier League fantasy football", icon: "🏆" },
              { title: "Transfer Tracker", desc: "Live transfer updates and rumors", icon: "🔄" },
              { title: "Stats Hub", desc: "Comprehensive player and team statistics", icon: "📊" },
              { title: "Live Scores", desc: "Real-time match updates and scores", icon: "⚽" }
            ].map((product, i) => (
              <div key={i} className="text-center">
                <div className="surface-2 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center border border-border">
                  <span className="text-2xl">{product.icon}</span>
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{product.title}</h3>
                <p className="text-muted-foreground text-sm mb-4">{product.desc}</p>
                <button className="text-primary hover:text-foreground text-sm font-medium">
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
