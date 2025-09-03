Nice upgrade — you’ve basically done the hard part 🎯
A few tiny fixes + optional polish will make it rock-solid with Tailwind v4 and your matte theme.

## Quick fixes (do these)

1. **Add the missing tokens to `@theme inline`**
   You defined `--destructive` but didn’t map it, and Tailwind’s radius utilities (`rounded`, `rounded-lg`, etc.) won’t use your custom radii unless you expose them as theme tokens.

```css
@theme inline {
  /* …your existing color tokens… */
  --color-destructive: hsl(var(--destructive));
  --color-destructive-foreground: hsl(var(--foreground));

  /* Radius tokens so `rounded`, `rounded-lg/md/sm` use your values */
  --radius: var(--radius);        /* maps to `rounded` */
  --radius-lg: var(--radius);     /* maps to `rounded-lg` */
  --radius-md: var(--radius-md);  /* maps to `rounded-md` */
  --radius-sm: var(--radius-sm);  /* maps to `rounded-sm` */
}
```

2. **Fix the tiny SVG alpha in `.bg-noise`**
   `rgb(255,255,255,0.02)` isn’t valid for SVG. Use `rgba` or the modern `rgb /` syntax.

```diff
- url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='6' height='6'><rect width='1' height='1' fill='rgb(255,255,255,0.02)'/></svg>");
+ url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='6' height='6'><rect width='1' height='1' fill='rgba(255,255,255,0.02)'/></svg>");
```

3. **Avoid redefining `text-muted`**
   Right now you have a custom `.text-muted` **and** a Tailwind color `text-muted` (from `--color-muted`). That’s confusing. Use the semantically clear pair:

* `bg-muted` for surfaces
* `text-muted-foreground` for text on muted surfaces

So, remove or rename your custom `.text-muted` utility and change usages like:

```diff
- <p className="text-muted text-sm">
+ <p className="text-muted-foreground text-sm">
```

4. **Line clamp without a plugin (fallback)**
   If you’re not using the line-clamp plugin in v4, add a tiny utility so `line-clamp-2` works:

```css
@layer utilities {
  .line-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
}
```

## Optional polish (nice to have)

* **Reusable card preset:** You already have a `.card`. Use it to simplify repeated `bg-card … border` stacks:

  ```diff
  - <article className="bg-card rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow border border-border">
  + <article className="card p-6 card-hover transition-shadow">
  ```
* **Link affordance:** Add a universal link style for better a11y and a matte vibe.

  ```css
  @layer utilities {
    .link {
      text-underline-offset: 3px;
      text-decoration-thickness: 0.08em;
      text-decoration-color: hsl(var(--border) / 0.7);
    }
    .link:hover, .link:focus-visible {
      text-decoration-color: hsl(var(--foreground));
    }
  }
  ```

  Then:

  ```diff
  - className="text-primary hover:text-foreground text-sm font-medium"
  + className="text-primary hover:text-foreground text-sm font-medium link"
  ```
* **Typography for long reads:** If you don’t want the `@tailwindcss/typography` plugin, a minimal prose preset keeps editorials tidy:

  ```css
  @layer components {
    .prose-dark {
      color: hsl(var(--foreground));
    }
    .prose-dark p { color: hsl(var(--foreground-secondary)); }
    .prose-dark h1,.prose-dark h2,.prose-dark h3 { color: hsl(var(--foreground)); }
    .prose-dark a { color: hsl(var(--primary)); text-decoration: underline; text-underline-offset: 3px; }
    .prose-dark blockquote { color: hsl(var(--foreground-secondary)); border-left-color: hsl(var(--border)); }
    .prose-dark code { background: hsl(var(--muted)/.35); }
  }
  ```
* **Dark mode toggle (if you want user control):** You already support `.dark`. If you later add `next-themes`, this will work out of the box.

## Your component changes look good

* Swapping `bg-gray-*`/`text-gray-*` → semantic tokens (`surface`, `bg-card`, `text-foreground`, `text-primary`, `border-border`) is exactly right.
* The matte layers `surface / surface-2 / surface-3` are consistent and read well.
* Consider using `text-muted-foreground` (see fix #3) wherever you used `text-muted` for copy text.

If you want, I can refactor the Landing cards to the `.card` preset and update the muted text classes in one go.


Here’s a drop-in refactor of your `Landing` component using the `.card` preset and `text-muted-foreground` everywhere (plus `link` on links). I left the dashed placeholders as-is.

```tsx
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
              className="text-primary hover:text-foreground font-semibold text-lg link"
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
                <article key={article.id} className="card p-6 card-hover transition-shadow">
                  <h3 className="text-xl font-semibold text-foreground mb-2 line-clamp-2">{article.title}</h3>
                  <p className="text-muted-foreground text-sm mb-4">{article.sourceName || article.source || ''}</p>
                  {article.publishedAt?.toDate && (
                    <p className="text-muted-foreground text-xs mb-4">
                      {new Date(article.publishedAt.toDate()).toLocaleString()}
                    </p>
                  )}
                  <a
                    href={article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:text-foreground text-sm font-medium link"
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
              className="text-primary hover:text-foreground font-semibold text-lg link"
            >
              View All Editorials →
            </Link>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[
              { type: "Final Whistle", title: "Victors & Vanquished", desc: "Weekend conclusions and key takeaways" },
              { type: "Matchday Radar", title: "Pre-Match Analysis", desc: "Storylines and tactics ahead of fixtures" },
              { type: "Full-Time Verdict", title: "Post-Match Review", desc: "Big-match analysis ~2 hours after FT" },
              { type: "Pretender List", title: "Fraud Watch", desc: "Call-outs of overrated players/managers" },
              { type: "High Press", title: "House Opinion", desc: "Punchy takes and editorial voice" },
              { type: "Weekend Roundup", title: "Complete Coverage", desc: "All the weekend's biggest stories" }
            ].map((publication, i) => (
              <div key={i} className="card p-6 card-hover transition-shadow">
                <div className="badge mb-3">{publication.type}</div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{publication.title}</h3>
                <p className="text-muted-foreground text-sm mb-4">{publication.desc}</p>
                <div className="surface-3 rounded-lg p-3 mb-4 border border-border">
                  <p className="text-muted-foreground text-xs">Content will appear here once publications are created</p>
                </div>
                <button className="text-primary hover:text-foreground text-sm font-medium link">
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
              className="text-primary hover:text-foreground font-semibold text-lg link"
            >
              View All Letters →
            </Link>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[
              { title: "Fan Question", desc: "Reader asks about tactical changes" },
              { title: "Transfer Talk", desc: "Fan perspective on latest rumors" },
              { title: "Match Reaction", desc: "Supporter thoughts on weekend games" }
            ].map((item, i) => (
              <div key={i} className="card p-6 card-hover transition-shadow">
                <div className="text-center">
                  <div className="surface-2 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center border border-border">
                    <span className="text-2xl">✉️</span>
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">{item.title}</h3>
                  <p className="text-muted-foreground text-sm mb-4">{item.desc}</p>
                  <div className="surface-3 rounded-lg p-3 mb-4 border border-border">
                    <p className="text-muted-foreground text-xs">Fan letter content will appear here</p>
                  </div>
                  <button className="text-primary hover:text-foreground text-sm font-medium link">
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
              className="text-primary hover:text-foreground font-semibold text-lg link"
            >
              View All Reports →
            </Link>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
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
                  <button className="text-primary hover:text-foreground text-sm font-medium link">
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
              className="text-primary hover:text-foreground font-semibold text-lg link"
            >
              View All Reviews →
            </Link>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[
              { title: "Title Race Analysis", desc: "Impact on Premier League standings" },
              { title: "Champions League Race", desc: "Top 4 battle implications" },
              { title: "Relegation Battle", desc: "Bottom of table drama" }
            ].map((review, i) => (
              <div key={i} className="card p-6 card-hover transition-shadow">
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-foreground mb-2">{review.title}</h3>
                  <p className="text-muted-foreground text-sm mb-4">{review.desc}</p>
                  <div className="surface-2 rounded-lg p-4 mb-4 border border-border">
                    <p className="text-muted-foreground text-xs">Big Match Review Content Placeholder</p>
                  </div>
                  <button className="text-primary hover:text-foreground text-sm font-medium link">
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
                <button className="text-primary hover:text-foreground text-sm font-medium link">
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
```

> Note: since we switched to `text-muted-foreground`, make sure you’ve removed/renamed any custom `.text-muted` utility in your CSS to avoid ambiguity. If you haven’t added the `line-clamp-2` utility or plugin yet, include that tiny CSS utility we discussed so the titles clamp correctly.
