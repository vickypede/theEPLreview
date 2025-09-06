import Image from "next/image";
import { ReactNode } from "react";

function prettyDate(d?: Date) {
  if (!d) return "";
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function PublicationCard({
  title,
  excerpt,
  featuredImage,
  authorByline,
  type,
  readingTime,
  date,
  rightSlot,
}: {
  title: string;
  excerpt?: string;
  featuredImage?: string | null;
  authorByline?: string;
  type?: string;
  readingTime?: number;
  date?: Date;
  rightSlot?: ReactNode;
}) {
  const formattedType = (type || "")
    .split("-")
    .filter(Boolean)
    .map((word) => word[0]?.toUpperCase() + word.slice(1))
    .join(" ");

  return (
    <article className="h-full flex flex-col overflow-hidden card card-hover transition-transform hover:-translate-y-0.5">
      <div className="relative aspect-[16/10]">
        {featuredImage ? (
          <Image
            src={featuredImage}
            alt={title}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover"
            priority={false}
          />
        ) : (
          <div className="w-full h-full surface-2" />
        )}
      </div>

      {/* 3-row layout: [badges] [title+excerpt] [meta] */}
      <div className="p-3 md:p-4 grid grid-rows-[auto_1fr_auto] gap-2 min-h-[170px]">
        {/* Top badges / right slot */}
        <div className="flex items-center justify-between gap-2">
          <div className="inline-flex items-center gap-2">
            {formattedType ? (
              <span
                className="inline-block text-[11px] px-2 py-1 rounded-full border border-border"
                style={{ background: "#8D9F87", color: "#0b0b0b" }}
              >
                {formattedType}
              </span>
            ) : null}
            {readingTime ? (
              <span className="text-xs text-muted-foreground">{readingTime} min read</span>
            ) : null}
          </div>
          {rightSlot}
        </div>

        {/* Middle content: title + excerpt (both clamped) */}
        <div className="min-h-0">
          <h3
            className="text-base md:text-lg font-semibold text-foreground leading-snug"
            style={{
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
            title={title}
          >
            {title}
          </h3>

          {excerpt ? (
            <p
              className="mt-1 text-sm text-muted-foreground"
              style={{
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
              title={excerpt}
            >
              {excerpt}
            </p>
          ) : null}
        </div>

        {/* Bottom meta row pinned */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="text-sm font-medium" style={{ color: "#f25a87" }}>Read →</span>
          <span>{prettyDate(date)}</span>
        </div>
      </div>
    </article>
  );
}
