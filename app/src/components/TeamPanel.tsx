"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Club } from "@/types";
import ScoreAxisWidget from "@/components/ScoreAxisWidget";

// ScoreAxis TEAM INFO tokens (new embed format uses widgets.scoreaxis.com + token IDs)
// Keep this in sync with ScoreAxis widget generator output.
const SCOREAXIS_TEAMINFO_TOKENS: Record<string, string> = {
  "arsenal": "62321b19adaf4b2bd73de890",
  "aston-villa": "62321b2eadaf4b2bd73dec16",
  "bournemouth": "62321afdadaf4b2bd73de3c6",
  "brentford": "62321b0fadaf4b2bd73de6fc",
  "brighton": "62321b27adaf4b2bd73deae6",
  "burnley": "62321b39adaf4b2bd73dee20",
  "chelsea": "62321b27adaf4b2bd73deaea",
  "crystal-palace": "62321b19adaf4b2bd73de88c",
  "everton": "62321b48adaf4b2bd73df0e2",
  "fulham": "62321af9adaf4b2bd73de304",
  "luton": "62321b09adaf4b2bd73de5c0",
  "leeds": "62321b19adaf4b2bd73de882",
  "liverpool": "62321afeadaf4b2bd73de3ec",
  "manchester-city": "62321b13adaf4b2bd73de7a6",
  "manchester-united": "62321b0badaf4b2bd73de62c",
  "newcastle": "62321b39adaf4b2bd73dee16",
  "nottingham-forest": "62321b0badaf4b2bd73de632",
  "sheffield-united": "62321b07adaf4b2bd73de560",
  "sunderland": "62321afdadaf4b2bd73de3c2",
  "tottenham": "62321b0fadaf4b2bd73de6f8",
  "west-ham": "62321b27adaf4b2bd73deae4",
  // App slug is "wolves", ScoreAxis token corresponds to wolverhampton.
  "wolves": "62321b39adaf4b2bd73dee10",
};

function buildTeamInfoScriptSrc(teamToken: string, widgetId: string) {
  return `https://widgets.scoreaxis.com/api/football/team-info/${teamToken}?widgetId=${encodeURIComponent(
    widgetId
  )}&lang=en&statsBlock=1&playersBlock=1&matchesBlock=1&links=1&font=heebo&fontSize=14&widgetWidth=auto&widgetHeight=auto&bodyColor=%23ffffff&textColor=%23141416&linkColor=%23141416&borderColor=%23ecf1f7&tabColor=%23f3f8fd`;
}

export default function TeamPanel({ slug }: { slug: string }) {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch clubs from Firestore
  useEffect(() => {
    let mounted = true;
    async function loadClubs() {
      try {
        if (!db) return;
        const clubsRef = collection(db, 'clubs');
        const snapshot = await getDocs(clubsRef);
        const clubsList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Club[];
        
        if (mounted) {
          setClubs(clubsList);
        }
      } catch (error) {
        console.error('Error loading clubs:', error);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadClubs();
    return () => { mounted = false; };
  }, []);

  // Find the team by slug from Firestore data
  const team = useMemo(() => {
    return clubs.find((club) => club.id === slug) ?? null;
  }, [clubs, slug]);

  // Get ScoreAxis token for this team (new format)
  const scoreAxisToken = team ? SCOREAXIS_TEAMINFO_TOKENS[team.id] : null;

  // Debug logging
  console.log('TeamPanel Debug:', {
    slug,
    team,
    scoreAxisToken,
    allClubs: clubs.map(c => ({ id: c.id, name: c.name })),
    scoreAxisMapping: SCOREAXIS_TEAMINFO_TOKENS
  });

  if (loading) {
    return (
      <section className="mb-8">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-foreground">Loading...</h1>
          <p className="text-muted-foreground">Loading team information...</p>
        </div>
      </section>
    );
  }

  if (!team) {
    return (
      <section className="mb-8">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-foreground">Team Not Found</h1>
          <p className="text-muted-foreground">Could not find team information for this club.</p>
        </div>
      </section>
    );
  }

  // Check if team has ScoreAxis token configured
  if (!scoreAxisToken) {
    return (
      <section className="mb-8">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-foreground">{team.name}</h1>
          <p className="text-muted-foreground">Team information and statistics</p>
        </div>
        <div className="max-w-4xl mx-auto">
          <article className="bg-card rounded-lg shadow-md border overflow-hidden border-border">
            <div className="px-4 py-3 border-b surface-2 text-foreground">
              <h3 className="font-semibold">ScoreAxis Not Configured</h3>
            </div>
            <div className="p-6 text-center">
              <p className="text-muted-foreground mb-4">
                Team stats widget not yet configured for <strong className="text-foreground">{team.name}</strong>. 
                Please add this team to the <code className="px-2 py-1 rounded surface-2 border border-border">SCOREAXIS_TEAMINFO_TOKENS</code> mapping in the code.
              </p>
              <p className="text-sm text-muted-foreground">
                To get the token: open the ScoreAxis Team Info widget generator, select {team.name}, and copy the token from the script src (widgets.scoreaxis.com).
              </p>
            </div>
          </article>
        </div>
      </section>
    );
  }

  const widgetId = `team_info_${team.id}`;

  return (
    <section className="mb-8">
      <div className="text-center mb-6">
        <h1 className="text-3xl font-bold text-foreground">{team.name}</h1>
        <p className="text-muted-foreground">Team information and statistics</p>
      </div>

      <div className="max-w-4xl mx-auto">
        {/* Team Info / Stats (includes tabs like Stats / Players / Matches) */}
        <article className="bg-card rounded-lg shadow-md border overflow-hidden border-border">
          <div className="px-4 py-3 border-b surface-2 text-foreground">
            <h3 className="font-semibold">Team Info & Stats</h3>
          </div>
          <div className="p-3">
            <ScoreAxisWidget
              widgetId={widgetId}
              scriptSrc={buildTeamInfoScriptSrc(scoreAxisToken, widgetId)}
              className="w-full rounded-lg"
            />
          </div>
          <div className="px-4 pb-3 text-xs text-muted-foreground">
            Team data by{" "}
            <a
              className="underline text-primary hover:text-foreground"
              href="https://www.scoreaxis.com/"
              target="_blank"
              rel="noreferrer"
            >
              ScoreAxis
            </a>
          </div>
        </article>
      </div>
    </section>
  );
}
