import ClubArticlesList from '@/components/ClubArticlesList';

export default function ClubPage({ params }: { params: { slug: string } }) {
  const { slug } = params;
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ClubArticlesList slug={slug} />
      </div>
    </main>
  );
}
