import { notFound } from 'next/navigation';
import { getPublicationBySlugOrId } from '@/lib/publications.server';
import PublicationDetail from '@/components/PublicationDetail';

export const revalidate = 120;

type Props = { params: Promise<{ slug: string }> };

export default async function PublicationPage({ params }: Props) {
  const { slug } = await params;
  const pub = await getPublicationBySlugOrId(slug);
  if (!pub) return notFound();
  return <PublicationDetail pub={pub} />;
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const pub = await getPublicationBySlugOrId(slug);
  if (!pub) return { title: 'Not Found' };
  return {
    title: `${pub.title} • The EPL Review`,
    description: pub.excerpt || pub.content?.slice(0, 160) || '',
    alternates: { canonical: `/publications/${pub.slug || pub.id}` },
  };
}
