import ClubArticlesList from '@/components/ClubArticlesList';
import TeamPanel from '@/components/TeamPanel';

export default function ClubPage({ params }: { params: { slug: string } }) {
  const { slug } = params;
  return (
    <main className="min-h-screen surface">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Team Panel - Next Match & Stats */}
        <TeamPanel slug={slug} />
        
        {/* Club Articles List */}
        <ClubArticlesList slug={slug} />
      </div>
    </main>
  );
}
