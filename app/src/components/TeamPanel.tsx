"use client";

import { useEffect, useMemo } from "react";

type Team = { name: string; slug: string; id: number };

// ⬇️ REPLACE the ids with the real ScoreAxis team IDs you copy from the Team Info widget generator.
// How: open https://www.scoreaxis.com/free-soccer-widgets/team-info-widget/,
// select a team, then copy the number in the iframe src after /widget/team-info/{ID}
const TEAMS: Team[] = [
  { name: "Arsenal", slug: "arsenal", id: 1 },
  { name: "Manchester City", slug: "manchester-city", id: 2 },
  { name: "Liverpool", slug: "liverpool", id: 3 },
  { name: "Chelsea", slug: "chelsea", id: 18 },
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
  { name: "Luton Town", slug: "luton-town", id: 4 },
  { name: "Sheffield United", slug: "sheffield-united", id: 19 },
  { name: "Bournemouth", slug: "bournemouth", id: 20 },
];

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
  useScoreAxisAutoHeight();

  const team = useMemo(() => TEAMS.find((t) => t.slug === slug) ?? null, [slug]);
  if (!team) return null;

  // unique inst values per iframe (important when the page has multiple widgets)
  const instInfo = `info_${team.id}`;

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
              key={`info-${team.id}`}
              data-inst={instInfo}
              src={saSrc("team-info", team.id, instInfo)}
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
