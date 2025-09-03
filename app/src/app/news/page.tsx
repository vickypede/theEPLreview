import ArticlesList from '@/components/ArticlesList';

export default function NewsPage() {
  return (
    <main className="min-h-screen surface">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ArticlesList />
      </div>
    </main>
  );
}
