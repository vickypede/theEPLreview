import { collection, getDocs, orderBy, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { notFound } from 'next/navigation';
import { Article, Club } from '@/types';

// Generate static params for all clubs
export async function generateStaticParams() {
  try {
    if (!db) throw new Error('No db on server');
    const clubsRef = collection(db, 'clubs');
    const snapshot = await getDocs(clubsRef);
    const clubs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Club[];
    return clubs.map((club) => ({ slug: club.id }));
  } catch {
    return [
      { slug: 'arsenal' },
      { slug: 'chelsea' },
      { slug: 'liverpool' },
      { slug: 'manchester-city' },
      { slug: 'manchester-united' },
      { slug: 'tottenham' }
    ];
  }
}

export default async function ClubPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  if (!db) {
    return (
      <main className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Club: {slug}</h1>
            <h2 className="text-2xl font-semibold text-gray-600 mb-4">Data not available</h2>
            <p className="text-gray-500">This page will show club articles once the data is available.</p>
          </div>
        </div>
      </main>
    );
  }

  try {
    const clubRef = collection(db, 'clubs');
    const clubQuery = query(clubRef, where('id', '==', slug));
    const clubSnapshot = await getDocs(clubQuery);
    if (clubSnapshot.empty) {
      notFound();
    }

    const club = clubSnapshot.docs[0].data() as Club;

    const articlesRef = collection(db, 'articles');
    const articlesQuery = query(
      articlesRef,
      where('clubs', 'array-contains', slug),
      orderBy('publishedAt', 'desc')
    );
    const articlesSnapshot = await getDocs(articlesQuery);
    const articles = articlesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Article[];

    return (
      <main className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">{club.name}</h1>
            <p className="text-gray-600">Latest news and updates</p>
          </div>
          {articles.length === 0 ? (
            <div className="text-center py-12">
              <h2 className="text-2xl font-semibold text-gray-600 mb-4">No articles yet for {club.name}</h2>
              <p className="text-gray-500">Articles will appear here once the ingestion system is running.</p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {articles.map((article: Article) => (
                <article key={article.id} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
                  <h2 className="text-xl font-semibold text-gray-900 mb-2 line-clamp-2">{article.title}</h2>
                  <p className="text-gray-600 text-sm mb-4">{article.source}</p>
                  {article.publishedAt?.toDate && (
                    <p className="text-gray-500 text-xs">{new Date(article.publishedAt.toDate()).toLocaleDateString()}</p>
                  )}
                  <a href={article.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 text-sm font-medium">Read more →</a>
                </article>
              ))}
            </div>
          )}
        </div>
      </main>
    );
  } catch {
    return (
      <main className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Club: {slug}</h1>
            <h2 className="text-2xl font-semibold text-gray-600 mb-4">Data not available</h2>
            <p className="text-gray-500">This page will show club articles once the data is available.</p>
          </div>
        </div>
      </main>
    );
  }
}
