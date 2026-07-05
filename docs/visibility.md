Short answer: you’re not (yet) indexed/recognised as the brand people mean when they type “epl review,” and Google now rewards sites that are fast, indexable, and clearly branded—with original value on top of any aggregation. Here’s the 2025-proof plan that actually moves the needle.

# 1) Confirm indexing + fix it fast

* **Verify your domain in Search Console** as a *Domain property* (DNS TXT). Then:

  * Use **URL Inspection → Test live URL → Request Indexing** for `/`, `/news`, `/clubs`, and a few article pages. ([Google][1], [Google Help][2])
* If nothing shows for `site:theeplreview.com`, you’re not indexed yet (or blocked). Ask Google to recrawl after the fixes below. Crawling can take days. ([Google for Developers][3])

# 2) Ship the must-have technical signals (Next.js App Router)

Add these in your repo under `app/src/app/…`:

**A. robots.txt + sitemap** (built-in Next routes)

```ts
// app/src/app/robots.ts
import type { MetadataRoute } from "next";
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/" }],
    sitemap: "https://theeplreview.com/sitemap.xml",
    host: "https://theeplreview.com",
  };
}
```

```ts
// app/src/app/sitemap.ts
import type { MetadataRoute } from "next";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = "https://theeplreview.com";
  // Start with your core routes; later, include latest clubs/articles from Firestore.
  return [
    { url: `${base}/`, changeFrequency: "hourly", priority: 1.0 },
    { url: `${base}/news`, changeFrequency: "hourly", priority: 0.9 },
    { url: `${base}/clubs`, changeFrequency: "daily", priority: 0.8 },
    // …add more top pages
  ];
}
```

**B. Canonical + site name (so Google shows *your* brand)**

```ts
// app/src/app/layout.tsx (add/merge)
export const metadata = {
  metadataBase: new URL("https://theeplreview.com"),
  title: {
    default: "The EPL Review",
    template: "%s | The EPL Review",
  },
  alternates: { canonical: "/" },
  icons: { icon: "/favicon.ico", apple: "/apple-icon.png" },
};
```

Add **WebSite JSON-LD** with preferred name + alternateName:

```tsx
// in the same layout, inside <html> just before </body>
<script
  type="application/ld+json"
  dangerouslySetInnerHTML={{
    __html: JSON.stringify({
      "@context": "https://schema.org",
      "@type": "WebSite",
      "url": "https://theeplreview.com/",
      "name": "The EPL Review",
      "alternateName": "EPL Review",
      "potentialAction": {
        "@type": "SearchAction",
        "target": "https://theeplreview.com/search?q={query}",
        "query-input": "required name=query"
      }
    })
  }}
/>
```

This is exactly what Google uses to understand + display your **site name** in results. ([Google for Developers][4])

**C. Organization JSON-LD** (helps entity/brand understanding)

```tsx
<script
  type="application/ld+json"
  dangerouslySetInnerHTML={{
    __html: JSON.stringify({
      "@context":"https://schema.org",
      "@type":"Organization",
      "name":"The EPL Review",
      "url":"https://theeplreview.com/",
      "logo":"https://theeplreview.com/icon.png",
      "sameAs":[
        "https://x.com/yourhandle",
        "https://www.instagram.com/yourhandle",
        "https://github.com/yourorg"
      ]
    })
  }}
/>
```

(Keep “sameAs” consistent everywhere.)

**D. News/Article markup for your original pieces**
On editorial pages (not link-only cards), output **NewsArticle/Article** JSON-LD (headline, author, datePublished, image, publisher) to qualify for richer presentation. ([Google for Developers][5])

**E. Favicon & sitename visuals**
Ensure a clean favicon (≥48px) and consistent brand text; Google pairs the favicon with your site name in SERPs. ([Google for Developers][6])

**F. WWW → apex redirect + HTTPS only**
Point both `www` and apex in Firebase Hosting and set a 301 to your primary (`https://theeplreview.com`). That avoids duplicate variants competing.

# 3) Make sure Google can *render* your pages

* Your site is Next.js on Firebase Hosting, which is fine. Keep key pages **SSR/ISR** (not client-only), so Googlebot gets full HTML. If any detail pages 404 from CSR-only navigation, they won’t index—fix those to server render.
* After deploy, use **URL Inspection → View crawled page → Page resources** to confirm Google can fetch CSS/JS. ([Google Help][2])

# 4) Pass 2025 quality bars (this is where rankings come from)

* Google’s 2024–2025 updates specifically de-rank **unoriginal/low-value** and scaled/AI-spun content. If you’re aggregating links, add *your* value: short analysis bullets, context, or club-specific angles. ([blog.google][7])
* Avoid anything that looks like “search-engine-first” or spam tactics; recent spam updates get harsher. ([Search Engine Land][8], [Google for Developers][9])
* Aim for Core Web Vitals (especially LCP). Next/Image with `priority` on hero, preconnect fonts, and keep JS light.

# 5) Earn the brand query (“the epl review”)

Right now, **eplreview\.com** (no “the”) exists and can hog that phrase. You need to teach Google that **“The EPL Review”** = your site:

* Consistent brand text in `<title>`, `<h1>`, JSON-LD (`name` + `alternateName`), and social “sameAs”. ([Google for Developers][4])
* Ask partner YouTubers and your socials to *link with anchor text “The EPL Review”*. Those mentions help Google choose your site name and brand entity. (Google considers multiple signals when picking the site name.) ([gsqi.com][10])

# 6) News visibility in 2025 (don’t chase old advice)

* There’s **no longer a manual “apply to Google News.”** Inclusion is algorithmic; ensure your content is indexable and high-quality, and Google News will pull it if eligible. ([Google Help][11], [Search Engine Land][12], [PPC Land][13])

---

## Action split: what we'll do now (in code) vs what you'll do later

What I will implement now (code changes you can deploy tonight)
- robots.txt route: add `app/src/app/robots.ts` allowing crawl and pointing to the sitemap.
- sitemap route: add `app/src/app/sitemap.ts` and make it dynamic (latest 100–500 publication slugs from Firestore via `getLatestPublications`, cached with ISR).
- Global metadata in `app/src/app/layout.tsx`:
  - `metadataBase`, site title template (`%s | The EPL Review`), canonical, icons.
  - Include OpenGraph + Twitter defaults (site name, logo, URL).
  - Add WebSite + Organization JSON‑LD (you provide final social URLs).
- Publications detail pages:
  - Ensure `generateMetadata` returns canonical to the slug URL.
  - Keep/verify NewsArticle JSON‑LD on article pages.
- Route‑level robots:
  - Add `noindex` to `admin/*` and any preview/search/listing routes that shouldn’t index.
- Minor perf nudges:
  - Confirm top hero images use `next/image` with `priority` on homepage and publications.

What you will do later (off‑code / configuration / promotion)
- Verify the domain in Google Search Console (Domain property) and request indexing for `/`, `/publications`, and a few article URLs.
- Configure canonical domain on Vercel:
  - Primary: `https://theeplreview.com`
  - 301 redirects from `http` and `www` to primary.
- Provide live social profile links (X, Instagram, GitHub, etc.) so they can be added to Organization JSON‑LD `sameAs`.
- Get a handful of clean backlinks using anchor “The EPL Review” (YouTube descriptions, X bio, LinkedIn, GitHub README).
- Continue publishing original posts (short, opinionated, with NewsArticle markup) and re‑request indexing for each.

## Quick checklist you can do today

1. Verify domain in Search Console → request indexing for `/`. ([Google][1])
2. Add `robots.ts` and `sitemap.ts` (above), redeploy.
3. Set `metadataBase`, canonical, and JSON-LD (WebSite + Organization). ([Google for Developers][4])
4. Ensure SSR for club/news/detail pages (no client-only 404s).
5. Publish 3–5 **original** posts this week (short, opinionated “what this means for \[club]”), each with **NewsArticle** markup. ([Google for Developers][5])
6. Get 3–10 clean backlinks (YouTube descriptions, X bio, GitHub README) using **“The EPL Review”** as anchor. ([gsqi.com][10])
7. Re-request indexing for those URLs and check coverage next week. ([Google for Developers][3])

If you want, I can tailor the JSON-LD and sitemap to your exact routes and add a tiny server util that pulls the latest 100 article URLs from Firestore for the sitemap (so Google keeps finding fresh pages).

[1]: https://search.google.com/search-console/about?utm_source=chatgpt.com "Google Search Console"
[2]: https://support.google.com/webmasters/answer/9012289?hl=en&utm_source=chatgpt.com "URL Inspection Tool - Search Console Help"
[3]: https://developers.google.com/search/docs/crawling-indexing/ask-google-to-recrawl?utm_source=chatgpt.com "Ask Google to recrawl your URLs bookmark_border"
[4]: https://developers.google.com/search/docs/appearance/site-names?utm_source=chatgpt.com "Site Names in Google Search"
[5]: https://developers.google.com/search/docs/appearance/structured-data/search-gallery?utm_source=chatgpt.com "Structured Data Markup that Google Search Supports"
[6]: https://developers.google.com/search/blog/2023/09/site-names-global-rollout?utm_source=chatgpt.com "Site names on Google Search now available for all ..."
[7]: https://blog.google/products/search/google-search-update-march-2024/?utm_source=chatgpt.com "New ways we're tackling spammy, low-quality content on ..."
[8]: https://searchengineland.com/google-releases-august-2025-spam-update-461232?utm_source=chatgpt.com "Google releases August 2025 spam update"
[9]: https://developers.google.com/search/docs/essentials/spam-policies?utm_source=chatgpt.com "Spam Policies for Google Web Search"
[10]: https://www.gsqi.com/marketing-blog/site-name-problems-google-search/?utm_source=chatgpt.com "9 tips for troubleshooting why your site name isn't showing ..."
[11]: https://support.google.com/news/publisher-center/announcements/10146168?hl=en&utm_source=chatgpt.com "Announcements - Publisher Center Help"
[12]: https://searchengineland.com/google-publisher-center-to-stop-allowing-you-to-add-publications-439978?utm_source=chatgpt.com "Google Publisher Center to stop allowing you to add ..."
[13]: https://ppc.land/google-news-shifts-to-automated-publication-pages/?utm_source=chatgpt.com "Google News shifts to automated publication pages"
