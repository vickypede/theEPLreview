import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "The EPL Review",
  description: "Premier League news and analysis",
  icons: {
    icon: [
      { url: "/pink_stacked.png", type: "image/png" },
    ],
    shortcut: [
      { url: "/pink_stacked.png", type: "image/png" },
    ],
    apple: [
      { url: "/pink_stacked.png", type: "image/png" },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Header />
        <main className="surface min-h-screen">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
