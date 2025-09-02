"use client";

import { useEffect, useState } from "react";

// Team configuration with ScoreAxis IDs
// Get each ID by opening ScoreAxis' Team Info widget page,
// selecting a team, and copying the number in the iframe src
// after /widget/team-info/{ID}
const TEAMS = [
  { name: "Arsenal", slug: "arsenal", id: 1 },
  { name: "Manchester City", slug: "manchester-city", id: 2 },
  { name: "Liverpool", slug: "liverpool", id: 3 },
  { name: "Chelsea", slug: "chelsea", id: 4 },
  { name: "Manchester United", slug: "manchester-united", id: 5 },
  { name: "Tottenham Hotspur", slug: "tottenham", id: 6 },
  { name: "Newcastle United", slug: "newcastle-united", id: 7 },
  { name: "Aston Villa", slug: "aston-villa", id: 8 },
  { name: "Brighton & Hove Albion", slug: "brighton", id: 9 },
  { name: "West Ham United", slug: "west-ham", id: 10 },
  { name: "Brentford", slug: "brentford", id: 11 },
  { name: "Fulham", slug: "fulham", id: 12 },
  { name: "Crystal Palace", slug: "crystal-palace", id: 13 },
  { name: "Wolverhampton Wanderers", slug: "wolves", id: 14 },
  { name: "Everton", slug: "everton", id: 15 },
  { name: "Nottingham Forest", slug: "nottingham-forest", id: 16 },
  { name: "Burnley", slug: "burnley", id: 17 },
  { name: "Luton Town", slug: "luton-town", id: 18 },
  { name: "Sheffield United", slug: "sheffield-united", id: 19 },
  { name: "Bournemouth", slug: "bournemouth", id: 20 },
];

// Helper to build ScoreAxis widget URLs
const saSrc = (type: "team-info" | "team-next-match", teamId: number, inst: string) =>
  `https://www.scoreaxis.com/widget/${type}/${teamId}&inst=${inst}`;

// Type for ScoreAxis postMessage data
interface ScoreAxisMessage {
  inst?: string;
  appHeight?: string;
}

interface TeamPanelProps {
  slug: string;
}

export default function TeamPanel({ slug }: TeamPanelProps) {
  const [teamId, setTeamId] = useState<number | null>(null);

  // Find team by slug and set ID
  useEffect(() => {
    const team = TEAMS.find(t => t.slug === slug);
    if (team) {
      setTeamId(team.id);
    }
  }, [slug]);

  // Auto-height listener (ScoreAxis posts back the height via postMessage)
  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      const data = e.data as ScoreAxisMessage;
      const inst = data?.inst;
      const appHeight = data?.appHeight;
      if (!inst || !appHeight) return;
      const iframe = document.querySelector<HTMLIFrameElement>(`iframe[data-inst="${inst}"]`);
      if (iframe) iframe.style.height = `${parseInt(appHeight, 10)}px`;
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, []);

  // Don't render if team not found
  if (!teamId) {
    return null;
  }

  const team = TEAMS.find(t => t.id === teamId);

  return (
    <section className="mb-8">
      {/* Team Header */}
      <div className="text-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{team?.name}</h1>
        <p className="text-gray-600">Team information and upcoming matches</p>
      </div>

      {/* Widgets */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Next Match */}
        <article className="bg-white rounded-lg shadow-md border overflow-hidden">
          <div className="px-4 py-3 border-b bg-gradient-to-r from-purple-600 to-purple-700 text-white">
            <h3 className="font-semibold">Next Match</h3>
          </div>
          <div className="p-3">
            <iframe
              key={`next-${teamId}`} // forces refresh on change
              data-inst="next"
              src={saSrc("team-next-match", teamId, "next")}
              title="Team Next Match"
              className="w-full rounded-lg border-0"
              style={{ height: 420 }}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
          <div className="px-4 pb-3 text-xs text-gray-500">
            Data by <a className="underline text-blue-600 hover:text-blue-800" href="https://www.scoreaxis.com/" target="_blank" rel="noreferrer">ScoreAxis</a>
          </div>
        </article>

        {/* Team Stats / Info */}
        <article className="bg-white rounded-lg shadow-md border overflow-hidden">
          <div className="px-4 py-3 border-b bg-gradient-to-r from-emerald-600 to-emerald-700 text-white">
            <h3 className="font-semibold">Team Stats</h3>
          </div>
          <div className="p-3">
            <iframe
              key={`info-${teamId}`}
              data-inst="info"
              src={saSrc("team-info", teamId, "info")}
              title="Team Info / Stats"
              className="w-full rounded-lg border-0"
              style={{ height: 420 }}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
          <div className="px-4 pb-3 text-xs text-gray-500">
            Team data by <a className="underline text-blue-600 hover:text-blue-800" href="https://www.scoreaxis.com/" target="_blank" rel="noreferrer">ScoreAxis</a>
          </div>
        </article>
      </div>
    </section>
  );
}
