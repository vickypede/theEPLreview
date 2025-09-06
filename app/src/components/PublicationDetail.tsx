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

function formatRelativeOrDate(d?: Date | null): string {
  if (!d) return "";
  const now = Date.now();
  const ms = now - d.getTime();
  const minutes = Math.floor(ms / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  return d.toLocaleDateString(undefined, { day: "2-digit", month: "long", year: "numeric" });
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
          <span className="mx-2 text-muted-foreground">/</span>
          <span className="text-muted-foreground">{typeLabel}</span>
        </nav>

        {/* Title */}
        <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-foreground mb-3 leading-tight">
          {pub.title}
        </h1>

        {/* Date */}
        {pubDate && (
          <div className="mb-6 text-sm text-muted-foreground">
            {formatRelativeOrDate(pubDate)}
          </div>
        )}

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

        {/* Content */}
        <div className="max-w-none">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              h1: ({ children }) => <h1 className="text-2xl font-bold mt-8 mb-4 text-foreground">{children}</h1>,
              h2: ({ children }) => <h2 className="text-xl font-bold mt-6 mb-3 text-foreground">{children}</h2>,
              h3: ({ children }) => <h3 className="text-lg font-bold mt-4 mb-2 text-foreground">{children}</h3>,
              p: ({ children }) => <p className="mb-4 text-foreground/90 leading-relaxed">{children}</p>,
              ul: ({ children }) => <ul className="mb-4 pl-6 list-disc text-foreground/90">{children}</ul>,
              ol: ({ children }) => <ol className="mb-4 pl-6 list-decimal text-foreground/90">{children}</ol>,
              li: ({ children }) => <li className="mb-1">{children}</li>,
              blockquote: ({ children }) => (
                <blockquote className="border-l-4 border-[#8D9F87] pl-4 my-4 italic text-muted-foreground">{children}</blockquote>
              ),
              code: ({ children }) => (
                <code className="bg-[hsl(var(--muted)_/_0.35)] px-1 py-0.5 rounded text-sm font-mono text-foreground">{children}</code>
              ),
              pre: ({ children }) => <pre className="bg-[hsl(var(--muted)_/_0.35)] p-4 rounded-lg overflow-x-auto my-4">{children}</pre>,
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

        {/* Author footer */}
        <div className="mt-8 text-sm text-foreground">
          {pub.authorByline || "The EPL Review"}
        </div>
      </div>
    </>
  );
}
