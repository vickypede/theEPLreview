import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/" },
      { userAgent: "*", disallow: ["/admin", "/admin/"] },
    ],
    sitemap: "https://theeplreview.com/sitemap.xml",
    host: "https://theeplreview.com",
  };
}


