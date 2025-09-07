import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL("https://theeplreview.com"),
  title: {
    default: "The EPL Review",
    template: "%s | The EPL Review",
  },
  description: "Premier League news and analysis",
  alternates: { canonical: "/" },
  openGraph: {
    siteName: "The EPL Review",
    url: "https://theeplreview.com/",
    type: "website",
    title: "The EPL Review",
    description: "Premier League news and analysis",
  },
  twitter: {
    card: "summary_large_image",
    site: "@theeplreview", // update to real handle if different
    title: "The EPL Review",
    description: "Premier League news and analysis",
  },
  icons: { icon: "/favicon.ico", apple: "/apple-icon.png" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {/* Organization & WebSite JSON-LD */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              name: "The EPL Review",
              url: "https://theeplreview.com/",
              logo: "https://theeplreview.com/icon.png",
              sameAs: [
                "https://x.com/yourhandle",
                "https://www.instagram.com/yourhandle",
                "https://github.com/yourorg",
              ],
            }),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              url: "https://theeplreview.com/",
              name: "The EPL Review",
              alternateName: "EPL Review",
              potentialAction: {
                "@type": "SearchAction",
                target: "https://theeplreview.com/search?q={query}",
                "query-input": "required name=query",
              },
            }),
          }}
        />
        <Header />
        <main className="surface min-h-screen">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
