import { unstable_cache } from 'next/cache';
import { getAdminDb } from './firebaseAdmin';
import type { Publication } from '@/types/publication';

async function _getBySlugOrId(slugOrId: string): Promise<Publication | null> {
  const db = getAdminDb();
  // Try by slug (published only)
  const bySlug = await db.collection('publications')
    .where('slug', '==', slugOrId)
    .where('status', '==', 'published')
    .limit(1)
    .get();
  if (!bySlug.empty) {
    const d = bySlug.docs[0];
    return { id: d.id, ...(d.data() as Omit<Publication, 'id'>) } as Publication;
  }
  // Fallback: doc id (if published)
  const snap = await db.collection('publications').doc(slugOrId).get();
  if (!snap.exists) return null;
  const data = snap.data() as Omit<Publication, 'id'>;
  if (data?.status !== 'published') return null;
  return { id: snap.id, ...data } as Publication;
}

async function _getLatest(limitN = 12): Promise<Publication[]> {
  const db = getAdminDb();
  const qs = await db.collection('publications')
    .where('status', '==', 'published')
    .orderBy('publishedAt', 'desc')
    .limit(limitN)
    .get();
  return qs.docs.map(d => ({ id: d.id, ...(d.data() as Omit<Publication, 'id'>) } as Publication));
}

export const getPublicationBySlugOrId = unstable_cache(_getBySlugOrId, ['pub-by-slug'], { revalidate: 120 });
export const getLatestPublications   = unstable_cache(_getLatest,     ['pub-latest'],  { revalidate: 120 });
