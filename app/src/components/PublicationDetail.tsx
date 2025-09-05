"use client";

import Image from "next/image";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Publication } from "@/types/publication";
import type { Timestamp } from "firebase/firestore";

function friendlyType(type?: string): string {
  if (!type) return "";
  return type
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/** Strict, no-`any` type guard for Firestore Timestamp */
function hasToDate(x: unknown): x is { toDate: () => Date } {
  return !!x && typeof x === "object" && "toDate" in x &&
         typeof (x as { toDate?: unknown }).toDate === "function";
}
function toDate(ts?: unknown): Date | null {
  try {
    if (!ts) return null;
    if (hasToDate(ts)) return ts.toDate();
    if (ts instanceof Date) return ts;
    const n = typeof ts === "number" ? ts : Date.parse(String(ts));
    return Number.isNaN(n) ? null : new Date(n);
  } catch {
    return null;
  }
}

function prettyDate(d?: Date | null): string {
  if (!d) return "";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}

export default function PublicationDetail({ pub }: { pub: Publication }) {
  const pubDate = toDate(pub.publishedAt) || toDate(pub.createdAt);
  const typeLabel = friendlyType(pub.type);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: pub.title,
    description: pub.content?.slice(0, 160) || "",
    author: { "@type": "Person", name: pub.authorByline || "The EPL Review" },
    publisher: { "@type": "Organization", name: "The EPL Review" },
    datePublished: pubDate?.toISOString(),
    image: pub.featuredImage || undefined,
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="max-w-4xl mx-auto px-4 py-6 md:py-8">
        {/* Breadcrumb */}
        <nav className="mb-6 text-sm">
          <Link href="/publications" className="text-[#6F9283] hover:underline">Publications</Link>
          <span className="mx-2 text-gray-400">/</span>
          <span className="text-gray-600">{typeLabel}</span>
        </nav>

        {/* Hero image */}
        {pub.featuredImage && (
          <div className="relative aspect-[16/9] rounded-2xl overflow-hidden mb-6">
            <Image
              src={pub.featuredImage}
              alt={pub.title}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1200px"
              className="object-cover"
              priority
            />
          </div>
        )}

        {/* Meta */}
        <div className="mb-6">
          {typeLabel && (
            <div className="inline-block px-3 py-1 rounded-full text-sm mb-3" style={{ background: "#8D9F87", color: "#0b0b0b" }}>
              {typeLabel}
            </div>
          )}
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-slate-900 mb-4 leading-tight">
            {pub.title}
          </h1>
          <div className="flex items-center gap-4 text-sm text-slate-600">
            <span>{pub.authorByline || "The EPL Review"}</span>
            {pubDate && <span>{prettyDate(pubDate)}</span>}
          </div>
        </div>

        {/* Content */}
        <div className="prose prose-lg max-w-none">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              h1: ({ children }) => <h1 className="text-2xl font-bold mt-8 mb-4 text-slate-900">{children}</h1>,
              h2: ({ children }) => <h2 className="text-xl font-bold mt-6 mb-3 text-slate-900">{children}</h2>,
              h3: ({ children }) => <h3 className="text-lg font-bold mt-4 mb-2 text-slate-900">{children}</h3>,
              p: ({ children }) => <p className="mb-4 text-slate-700 leading-relaxed">{children}</p>,
              ul: ({ children }) => <ul className="mb-4 pl-6 list-disc text-slate-700">{children}</ul>,
              ol: ({ children }) => <ol className="mb-4 pl-6 list-decimal text-slate-700">{children}</ol>,
              li: ({ children }) => <li className="mb-1">{children}</li>,
              blockquote: ({ children }) => (
                <blockquote className="border-l-4 border-[#8D9F87] pl-4 my-4 italic text-slate-600">{children}</blockquote>
              ),
              code: ({ children }) => (
                <code className="bg-gray-100 px-1 py-0.5 rounded text-sm font-mono text-slate-800">{children}</code>
              ),
              pre: ({ children }) => <pre className="bg-gray-100 p-4 rounded-lg overflow-x-auto my-4">{children}</pre>,
              a: ({ href, children }) => (
                <a href={href} className="text-[#6F9283] hover:underline" target="_blank" rel="noopener noreferrer">
                  {children}
                </a>
              ),
            }}
          >
            {pub.content || ""}
          </ReactMarkdown>
        </div>
      </div>
    </>
  );
}
