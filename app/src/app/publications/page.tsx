import type { Metadata } from "next";
import PublicationsGrid from "@/components/PublicationsGrid";

export const metadata: Metadata = {
  title: "Publications • The EPL Review",
  description: "Long-form pieces and editorials from The EPL Review.",
};

export default function PublicationsPage() {
  return (
    <main className="max-w-6xl mx-auto px-4 py-6 md:py-8">
      <h1 className="text-2xl md:text-3xl font-semibold mb-4" style={{ color: "#696D7D" }}>
        Publications
      </h1>
      <p className="mb-6 text-sm md:text-base opacity-80">
        Our latest long-form: Big-Match Reviews, Weekend Conclusions, House Takes and more.
      </p>
      <PublicationsGrid />
    </main>
  );
}
