"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Club } from "@/types";

// ScoreAxis ID mapping - these are the widget IDs from ScoreAxis
// Keep this in sync when you get new IDs from their widget generator
// link to get Ids https://www.scoreaxis.com/free-soccer-widgets/team-info-widget/ !!!
const SCOREAXIS_IDS: Record<string, number> = {
  "arsenal": 19,
  "manchester-city": 9,
  "liverpool": 8,
  "chelsea": 18,
  "manchester-united": 14,
  "tottenham": 6,
  "newcastle": 20,
  "aston-villa": 15,
  "brighton": 78,
  "west-ham": 1,
  "brentford": 236,
  "fulham": 11,
  "crystal-palace": 51,
  "wolves": 29,
  "everton": 13,
  "nottingham-forest": 63,
  "burnley": 27,
  "luton-town": 115,
  "sheffield-united": 21,
  "bournemouth": 52,
  "leeds": 71,
};



function useScoreAxisAutoHeight() {
  useEffect(() => {
    const onMsg = (event: MessageEvent) => {
      const data = event.data as { inst?: string; appHeight?: string };
      if (!data?.inst || !data?.appHeight) return;
      const iframe = document.querySelector<HTMLIFrameElement>(
        `iframe[data-inst="${data.inst}"]`
      );
      if (iframe) iframe.style.height = `${parseInt(data.appHeight, 10)}px`;
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, []);
}

export default function TeamPanel({ slug }: { slug: string }) {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);
  useScoreAxisAutoHeight();

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

  // Get ScoreAxis ID for this team
  const scoreAxisId = team ? SCOREAXIS_IDS[team.id] : null;

  // Debug logging
  console.log('TeamPanel Debug:', {
    slug,
    team,
    scoreAxisId,
    allClubs: clubs.map(c => ({ id: c.id, name: c.name })),
    scoreAxisMapping: SCOREAXIS_IDS
  });

  // Generate ScoreAxis URL with conditional parameters
  // Liverpool (ID 8) only supports basic parameters, others support enhanced features
  const generateScoreAxisUrl = (teamId: number, instanceId: string) => {
    if (teamId === 8) {
      // Liverpool ID 8 - basic parameters only
      return `https://www.scoreaxis.com/widget/team-info/${teamId}?autoHeight=1&inst=${instanceId}`;
    } else {
      // Other teams - enhanced parameters
      return `https://www.scoreaxis.com/widget/team-info/${teamId}?autoHeight=1&teamLogo=1&statsTab=1&playersTab=1&inst=${instanceId}`;
    }
  };

  if (loading) {
    return (
      <section className="mb-8">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-foreground">Loading...</h1>
          <p className="text-muted">Loading team information...</p>
        </div>
      </section>
    );
  }

  if (!team) {
    return (
      <section className="mb-8">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-foreground">Team Not Found</h1>
          <p className="text-muted">Could not find team information for this club.</p>
        </div>
      </section>
    );
  }

  // Check if team has ScoreAxis ID configured
  if (!scoreAxisId) {
    return (
      <section className="mb-8">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-foreground">{team.name}</h1>
          <p className="text-muted">Team information and statistics</p>
        </div>
        <div className="max-w-4xl mx-auto">
          <article className="bg-card rounded-lg shadow-md border overflow-hidden border-border">
            <div className="px-4 py-3 border-b surface-2 text-foreground">
              <h3 className="font-semibold">ScoreAxis Not Configured</h3>
            </div>
            <div className="p-6 text-center">
              <p className="text-muted mb-4">
                Team stats widget not yet configured for <strong className="text-foreground">{team.name}</strong>. 
                Please add this team to the <code className="px-2 py-1 rounded surface-2 border border-border">SCOREAXIS_IDS</code> mapping in the code.
              </p>
              <p className="text-sm text-muted">
                To get the ID: visit <a href="https://www.scoreaxis.com/free-soccer-widgets/team-info-widget/" target="_blank" rel="noreferrer" className="underline text-primary">ScoreAxis Team Info Widget</a>, select {team.name}, and copy the number from the iframe src.
              </p>
            </div>
          </article>
        </div>
      </section>
    );
  }

  // unique inst values per iframe (important when the page has multiple widgets)
  const instInfo = `info_${scoreAxisId}`;

  return (
    <section className="mb-8">
      <div className="text-center mb-6">
        <h1 className="text-3xl font-bold text-foreground">{team.name}</h1>
        <p className="text-muted">Team information and statistics</p>
      </div>

      <div className="max-w-4xl mx-auto">
        {/* Team Info / Stats (includes tabs like Stats / Players / Matches) */}
        <article className="bg-card rounded-lg shadow-md border overflow-hidden border-border">
          <div className="px-4 py-3 border-b surface-2 text-foreground">
            <h3 className="font-semibold">Team Info & Stats</h3>
          </div>
          <div className="p-3">
            <iframe
              key={`info-${scoreAxisId}`}
              data-inst={instInfo}
              src={generateScoreAxisUrl(scoreAxisId, instInfo)}
              title={`${team.name} – Team Info`}
              className="w-full rounded-lg border-0"
              style={{ height: 420 }}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
          <div className="px-4 pb-3 text-xs text-muted">
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
