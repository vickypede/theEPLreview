"use client";

import ScoreAxisWidget from "@/components/ScoreAxisWidget";

const SCOREAXIS_EPL_LEAGUE_TOKEN = "6232265abf1fa71a672159ec";

function buildLeagueTableScriptSrc(widgetId: string) {
  // Matches the new ScoreAxis embed snippet format (widgets.scoreaxis.com/api/football/...).
  return `https://widgets.scoreaxis.com/api/football/league-table/${SCOREAXIS_EPL_LEAGUE_TOKEN}?widgetId=${encodeURIComponent(
    widgetId
  )}&lang=en&teamLogo=1&tableLines=0&homeAway=1&header=1&position=1&goals=1&gamesCount=1&diff=1&winCount=1&drawCount=1&loseCount=1&lastGames=1&points=1&teamsLimit=all&links=1&font=heebo&fontSize=14&widgetWidth=auto&widgetHeight=auto&bodyColor=%23ffffff&textColor=%23141416&linkColor=%23141416&borderColor=%23ecf1f7&tabColor=%23f3f8fd`;
}

function buildTopPlayersScriptSrc(widgetId: string) {
  return `https://widgets.scoreaxis.com/api/football/league-top-players/${SCOREAXIS_EPL_LEAGUE_TOKEN}?widgetId=${encodeURIComponent(
    widgetId
  )}&lang=en&playersCount=10&goalsBlock=1&assistsBlock=1&cardsBlock=1&font=heebo&fontSize=14&widgetWidth=auto&widgetHeight=auto&bodyColor=%23ffffff&textColor=%23141416&linkColor=%23141416&borderColor=%23ecf1f7&tabColor=%23f3f8fd`;
}

export default function Stats() {
  const tableWidgetId = "epl_table";
  const topPlayersWidgetId = "epl_top_players";

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
                <ScoreAxisWidget
                  widgetId={tableWidgetId}
                  scriptSrc={buildLeagueTableScriptSrc(tableWidgetId)}
                  className="w-full rounded-lg"
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
                <ScoreAxisWidget
                  widgetId={topPlayersWidgetId}
                  scriptSrc={buildTopPlayersScriptSrc(topPlayersWidgetId)}
                  className="w-full rounded-lg"
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
