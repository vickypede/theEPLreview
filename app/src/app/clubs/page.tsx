import ClubsList from '@/components/ClubsList';

export default function ClubsPage() {
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">Premier League Clubs</h1>
        <ClubsList />
      </div>
    </main>
  );
}


