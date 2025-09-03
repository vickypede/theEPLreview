import ArticlesList from '@/components/ArticlesList';

export default function NewsPage() {
  return (
    <main className="min-h-screen surface">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-4xl font-bold text-foreground mb-8">Latest Football News</h1>
        <ArticlesList />
      </div>
    </main>
  );
}
