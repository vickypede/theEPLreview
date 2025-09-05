"use client";

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
  return (
    <article className="rounded-2xl overflow-hidden bg-white shadow hover:shadow-md transition-transform hover:-translate-y-0.5">
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
          <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300" />
        )}
      </div>

      <div className="p-3 md:p-4">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="inline-flex items-center gap-2">
            {type ? (
              <span
                className="text-[11px] px-2 py-1 rounded-full"
                style={{ background: "#8D9F87", color: "#0b0b0b" }}
              >
                {type.replace(/-/g, " ")}
              </span>
            ) : null}
            {readingTime ? (
              <span className="text-xs opacity-70">{readingTime} min read</span>
            ) : null}
          </div>
          {rightSlot}
        </div>

        <h3 className="text-base md:text-lg font-semibold text-slate-900 leading-snug">
          {title}
        </h3>

        {excerpt ? (
          <p
            className="mt-1 text-sm text-slate-700"
            style={{
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {excerpt}
          </p>
        ) : null}

        <div className="mt-3 flex items-center justify-between text-xs text-slate-600">
          <span>{authorByline}</span>
          <span>{prettyDate(date)}</span>
        </div>
      </div>
    </article>
  );
}
