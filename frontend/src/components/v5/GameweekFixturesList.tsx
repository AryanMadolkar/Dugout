"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { fetchFixtures, fetchOverview } from "@/lib/api";

function fdrClass(fdr: number) {
  if (fdr <= 2) return "bg-[var(--fdr-easy)] text-[var(--positive)]";
  if (fdr === 3) return "bg-[var(--fdr-neutral)] text-[var(--text-body)]";
  return "bg-[var(--fdr-hard)] text-[var(--coral)]";
}

export function GameweekFixturesList() {
  const [gameweek, setGameweek] = useState<number | null>(null);
  const [fixtures, setFixtures] = useState<
    { id: number; home: string; away: string; homeFdr: number; awayFdr: number; kickoff: string }[]
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchOverview(), fetchFixtures()])
      .then(([overview, rows]) => {
        setGameweek(overview.current_gameweek?.id ?? null);
        setFixtures(
          rows.map((f) => ({
            id: f.id,
            home: f.team_h_short ?? "?",
            away: f.team_a_short ?? "?",
            homeFdr: f.team_h_difficulty ?? 3,
            awayFdr: f.team_a_difficulty ?? 3,
            kickoff: f.kickoff_time
              ? new Intl.DateTimeFormat("en-GB", {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                }).format(new Date(f.kickoff_time))
              : "TBC",
          })),
        );
      })
      .catch(() => setFixtures([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="panel overflow-hidden">
      <div className="border-b border-[var(--border)] px-4 py-3">
        <h2 className="font-label text-[12px] font-bold text-[var(--text-secondary)]">
          Gameweek {gameweek ?? "—"} fixtures
        </h2>
      </div>
      {loading ? (
        <p className="px-4 py-6 text-[13px] text-[var(--text-secondary)]">Loading fixtures…</p>
      ) : fixtures.length === 0 ? (
        <p className="px-4 py-6 text-[13px] text-[var(--text-secondary)]">
          No fixtures loaded.{" "}
          <Link href="/fixtures" className="text-[var(--coral)] hover:underline">
            View fixtures
          </Link>
        </p>
      ) : (
        <div className="divide-y divide-[var(--border)]">
          {fixtures.map((f) => (
            <div key={f.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 transition hover:bg-[var(--canvas)]">
              <div className="flex items-center gap-3">
                <TeamCell code={f.home} fdr={f.homeFdr} />
                <span className="text-[12px] text-[var(--text-secondary)]">vs</span>
                <TeamCell code={f.away} fdr={f.awayFdr} />
              </div>
              <span className="text-[12px] text-[var(--text-secondary)]">{f.kickoff}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function TeamCell({ code, fdr }: { code: string; fdr: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className="min-w-[2.5rem] text-[14px] font-extrabold">{code}</span>
      <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${fdrClass(fdr)}`}>FDR {fdr}</span>
    </div>
  );
}
