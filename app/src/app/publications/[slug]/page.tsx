import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import PublicationDetail from "@/components/PublicationDetail";

type Props = { params: { slug: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const pub = await getPublication(params.slug);
  if (!pub) return { title: "Not Found" };
  return {
    title: `${pub.title} • The EPL Review`,
    description: pub.excerpt || pub.content?.slice(0, 160) || "",
  };
}

async function getPublication(slug: string) {
  try {
    // Try by slug first
    const col = db.collection("publications");
    const q = col.where("slug", "==", slug).where("status", "==", "published").limit(1);
    const snap = await q.get();
    if (!snap.empty) return { id: snap.docs[0].id, ...snap.docs[0].data() };

    // Fallback: treat slug as document ID
    const docSnap = await getDoc(doc(db, "publications", slug));
    if (docSnap.exists()) {
      const data = docSnap.data();
      if (data.status === "published") return { id: docSnap.id, ...data };
    }
  } catch {
    /* noop */
  }
  return null;
}

export default async function PublicationPage({ params }: Props) {
  const pub = await getPublication(params.slug);
  if (!pub) notFound();
  return <PublicationDetail pub={pub} />;
}
