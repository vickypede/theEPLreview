import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "The EPL Review",
  description: "Premier League news and analysis",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="layer-1 text-primary">
        <Header />
        <main className="min-h-screen">
          {children}
        </main>
      </body>
    </html>
  )
}
