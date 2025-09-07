import type { MetadataRoute } from "next";
import { getLatestPublications } from "@/lib/publications.server";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = "https://theeplreview.com";
  // Try to fetch latest publications; fall back to static routes if Firestore/env not available
  try {
    const pubs = await getLatestPublications(100);
    const pubEntries: MetadataRoute.Sitemap = pubs.map((p) => ({
      url: `${base}/publications/${p.slug || p.id}`,
      changeFrequency: "hourly",
      priority: 0.9,
    }));
    return [
      { url: `${base}/`, changeFrequency: "hourly", priority: 1.0 },
      { url: `${base}/publications`, changeFrequency: "hourly", priority: 0.9 },
      ...pubEntries,
    ];
  } catch {
    return [
      { url: `${base}/`, changeFrequency: "hourly", priority: 1.0 },
      { url: `${base}/publications`, changeFrequency: "hourly", priority: 0.9 },
    ];
  }
}


