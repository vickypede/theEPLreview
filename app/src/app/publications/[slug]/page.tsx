import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getDocs, getDoc, query, where, limit } from "firebase/firestore";
import { publicationsRef, publicationDoc } from "@/lib/firestoreConverters";
import type { Publication } from "@/types/publication";
import PublicationDetail from "@/components/PublicationDetail";

// Ensure it's not prerendered (we read Firestore)
export const dynamic = "force-dynamic";

type Props = { params: { slug: string } };

async function getPublication(slug: string): Promise<Publication | null> {
  try {
    // Try by slug first
    const col = publicationsRef();
    const q = query(
      col,
      where("slug", "==", slug),
      where("status", "==", "published"),
      limit(1)
    );
    const snap = await getDocs(q);
    if (!snap.empty) return snap.docs[0].data();

    // Fallback: treat slug as document ID
    const docSnap = await getDoc(publicationDoc(slug));
    if (docSnap.exists()) {
      const data = docSnap.data();
      if (data.status === "published") return data;
    }
  } catch {
    // swallow and return null
  }
  return null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const pub = await getPublication(params.slug);
  if (!pub) return { title: "Not Found" };
  return {
    title: `${pub.title} • The EPL Review`,
    description: pub.excerpt || pub.content?.slice(0, 160) || "",
  };
}

export default async function PublicationPage({ params }: Props) {
  const pub = await getPublication(params.slug);
  if (!pub) notFound();
  return <PublicationDetail pub={pub!} />;
}
