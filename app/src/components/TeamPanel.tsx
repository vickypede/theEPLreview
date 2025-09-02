"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Club } from "@/types";

// ScoreAxis ID mapping - these are the widget IDs from ScoreAxis
// Keep this in sync when you get new IDs from their widget generator
const SCOREAXIS_IDS: Record<string, number> = {
  "arsenal": 1,
  "manchester-city": 2,
  "liverpool": 3,
  "chelsea": 18,
  "manchester-united": 5,
  "tottenham": 6,
  "newcastle-united": 7,
  "aston-villa": 8,
  "brighton": 9,
  "west-ham": 10,
  "brentford": 11,
  "fulham": 12,
  "crystal-palace": 13,
  "wolves": 14,
  "everton": 15,
  "nottingham-forest": 16,
  "burnley": 17,
  "luton-town": 4,
  "sheffield-united": 19,
  "bournemouth": 20,
};

function saSrc(
  type: "team-info" | "team-next-match",
  teamId: number,
  inst: string
) {
  // ScoreAxis supports auto height via postMessage; ?autoHeight=1 helps in some setups
  return `https://www.scoreaxis.com/widget/${type}/${teamId}?autoHeight=1&inst=${encodeURIComponent(
    inst
  )}`;
}

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

  if (loading) {
    return (
      <section className="mb-8">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Loading...</h1>
          <p className="text-gray-600">Loading team information...</p>
        </div>
      </section>
    );
  }

  if (!team) {
    return (
      <section className="mb-8">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Team Not Found</h1>
          <p className="text-gray-600">Could not find team information for this club.</p>
        </div>
      </section>
    );
  }

  // Check if team has ScoreAxis ID configured
  if (!scoreAxisId) {
    return (
      <section className="mb-8">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">{team.name}</h1>
          <p className="text-gray-600">Team information and statistics</p>
        </div>
        <div className="max-w-4xl mx-auto">
          <article className="bg-white rounded-lg shadow-md border overflow-hidden">
            <div className="px-4 py-3 border-b bg-gradient-to-r from-yellow-600 to-yellow-700 text-white">
              <h3 className="font-semibold">ScoreAxis Not Configured</h3>
            </div>
            <div className="p-6 text-center">
              <p className="text-gray-600 mb-4">
                Team stats widget not yet configured for <strong>{team.name}</strong>. 
                Please add this team to the <code className="bg-gray-100 px-2 py-1 rounded">SCOREAXIS_IDS</code> mapping in the code.
              </p>
              <p className="text-sm text-gray-500">
                To get the ID: visit <a href="https://www.scoreaxis.com/free-soccer-widgets/team-info-widget/" target="_blank" rel="noreferrer" className="underline text-blue-600">ScoreAxis Team Info Widget</a>, select {team.name}, and copy the number from the iframe src.
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
        <h1 className="text-3xl font-bold text-gray-900">{team.name}</h1>
        <p className="text-gray-600">Team information and statistics</p>
      </div>

      <div className="max-w-4xl mx-auto">
        {/* Team Info / Stats (includes tabs like Stats / Players / Matches) */}
        <article className="bg-white rounded-lg shadow-md border overflow-hidden">
          <div className="px-4 py-3 border-b bg-gradient-to-r from-emerald-600 to-emerald-700 text-white">
            <h3 className="font-semibold">Team Info & Stats</h3>
          </div>
          <div className="p-3">
            <iframe
              key={`info-${scoreAxisId}`}
              data-inst={instInfo}
              src={saSrc("team-info", scoreAxisId, instInfo)}
              title={`${team.name} – Team Info`}
              className="w-full rounded-lg border-0"
              style={{ height: 420 }}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
          <div className="px-4 pb-3 text-xs text-gray-500">
            Team data by{" "}
            <a
              className="underline text-blue-600 hover:text-blue-800"
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
