"use client";

export default function Stats() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl font-bold mb-4">Premier League Hub</h1>
          <p className="text-xl opacity-90">Live table and top scorers & assists</p>
        </div>
      </section>

      {/* Stats Grid */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-2">
            
            {/* EPL Table Card */}
            <article className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
                <h2 className="text-xl font-bold text-white">EPL Table</h2>
              </div>
              <div className="p-4">
                <iframe
                  className="w-full h-96 border-0 rounded-lg"
                  src="https://www.scoreaxis.com/widget/standings-widget/8"
                  title="Premier League Table"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
              <footer className="px-6 py-3 bg-gray-50 border-t text-center">
                <small className="text-gray-600">
                  Data by <a href="https://www.scoreaxis.com/" target="_blank" rel="noopener" className="text-blue-600 hover:text-blue-800">ScoreAxis</a>
                </small>
              </footer>
            </article>

            {/* Top Scorers & Assists Card */}
            <article className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
              <div className="bg-gradient-to-r from-green-600 to-green-700 px-6 py-4">
                <h2 className="text-xl font-bold text-white">Top Scorers & Assists</h2>
              </div>
              <div className="p-4">
                <iframe
                  className="w-full h-96 border-0 rounded-lg"
                  src="https://www.scoreaxis.com/widget/league-top-players/8"
                  title="Premier League Top Players"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
              <footer className="px-6 py-3 bg-gray-50 border-t text-center">
                <small className="text-gray-600">
                  Data by <a href="https://www.scoreaxis.com/" target="_blank" rel="noopener" className="text-blue-600 hover:text-blue-800">ScoreAxis</a>
                </small>
              </footer>
            </article>
          </div>
        </div>
      </section>
    </div>
  );
}
