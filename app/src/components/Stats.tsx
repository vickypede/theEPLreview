"use client";

export default function Stats() {
  return (
    <div className="min-h-screen surface">
      {/* Stats Grid */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Page header (consistent with Publications) */}
          <h1 className="text-2xl md:text-3xl font-semibold mb-4" style={{ color: '#696D7D' }}>
            Premier League Hub
          </h1>
          <p className="mb-6 text-sm md:text-base opacity-80">
            Live table and top scorers & assists.
          </p>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-2">
            
            {/* EPL Table Card */}
            <article className="bg-card rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow border border-border">
              <div className="px-6 py-4 border-b border-border">
                <h2 className="text-xl font-bold text-foreground">EPL Table</h2>
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
              <footer className="px-6 py-3 surface-2 border-t border-border text-center">
                <small className="text-muted-foreground">
                  Data by <a href="https://www.scoreaxis.com/" target="_blank" rel="noopener" className="text-primary hover:text-foreground">ScoreAxis</a>
                </small>
              </footer>
            </article>

            {/* Top Scorers & Assists Card */}
            <article className="bg-card rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow border border-border">
              <div className="px-6 py-4 border-b border-border">
                <h2 className="text-xl font-bold text-foreground">Top Scorers & Assists</h2>
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
              <footer className="px-6 py-3 surface-2 border-t border-border text-center">
                <small className="text-muted-foreground">
                  Data by <a href="https://www.scoreaxis.com/" target="_blank" rel="noopener" className="text-primary hover:text-foreground">ScoreAxis</a>
                </small>
              </footer>
            </article>
          </div>
        </div>
      </section>
    </div>
  );
}
