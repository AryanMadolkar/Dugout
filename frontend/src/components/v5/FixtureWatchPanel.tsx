"use client";

import { useEffect, useState } from "react";
import { fetchFixtures, fetchOverview, fetchTeams, triggerIngest, type Team } from "@/lib/api";
import type { Fixture } from "@/lib/types";
import { SectionHead } from "./ui/SectionHead";

type Cell = {
  opp: string;
  home: boolean;
  fdr: number;
} | null;

type WatchRow = {
  club: string;
  cells: Cell[];
};

/** Green easy · yellow mid · red hard */
function fdrCell(fdr: number) {
  if (fdr <= 2) return "bg-[var(--fdr-easy)] text-[var(--positive)]";
  if (fdr === 3) return "bg-[#fde68a] text-[#92400e]";
  return "bg-[var(--fdr-hard)] text-[var(--coral-dark)]";
}

function clubsFromFixtures(batches: Fixture[][]): string[] {
  const set = new Set<string>();
  for (const fixtures of batches) {
    for (const f of fixtures) {
      if (f.team_h_short) set.add(f.team_h_short);
      if (f.team_a_short) set.add(f.team_a_short);
    }
  }
  return [...set].sort((a, b) => a.localeCompare(b));
}

function buildRows(clubs: string[], fixturesByGw: Fixture[][]): WatchRow[] {
  const byClub: Record<string, Cell[]> = {};
  for (const club of clubs) {
    byClub[club] = fixturesByGw.map(() => null);
  }

  fixturesByGw.forEach((fixtures, gwIndex) => {
    for (const f of fixtures) {
      const home = f.team_h_short;
      const away = f.team_a_short;
      if (!home || !away) continue;
      if (byClub[home]) {
        byClub[home][gwIndex] = {
          opp: away,
          home: true,
          fdr: f.team_h_difficulty ?? 3,
        };
      }
      if (byClub[away]) {
        byClub[away][gwIndex] = {
          opp: home,
          home: false,
          fdr: f.team_a_difficulty ?? 3,
        };
      }
    }
  });

  return clubs.map((club) => ({ club, cells: byClub[club] ?? [] }));
}

async function loadWatchData(): Promise<{ rows: WatchRow[]; gwLabels: string[] }> {
  let overview = await fetchOverview();
  let teams: Team[] = await fetchTeams().catch(() => []);
  let startGw = overview.current_gameweek?.id ?? 1;
  let gwIds = [startGw, startGw + 1, startGw + 2];
  let fixtureBatches = await Promise.all(gwIds.map((id) => fetchFixtures(id).catch(() => [] as Fixture[])));

  const empty =
    teams.length === 0 && fixtureBatches.every((b) => b.length === 0);

  if (empty) {
    try {
      await triggerIngest();
    } catch {
      /* ignore — retry reads anyway */
    }
    overview = await fetchOverview();
    teams = await fetchTeams().catch(() => []);
    startGw = overview.current_gameweek?.id ?? 1;
    gwIds = [startGw, startGw + 1, startGw + 2];
    fixtureBatches = await Promise.all(gwIds.map((id) => fetchFixtures(id).catch(() => [] as Fixture[])));
  }

  const clubs =
    teams.length > 0
      ? teams.map((t) => t.short_name).filter(Boolean).sort((a, b) => a.localeCompare(b))
      : clubsFromFixtures(fixtureBatches);

  return {
    rows: buildRows(clubs, fixtureBatches),
    gwLabels: gwIds.map((id) => `GW${id}`),
  };
}

export function FixtureWatchPanel() {
  const [rows, setRows] = useState<WatchRow[]>([]);
  const [gwLabels, setGwLabels] = useState<string[]>(["GW", "GW+1", "GW+2"]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    loadWatchData()
      .then((data) => {
        if (cancelled) return;
        setGwLabels(data.gwLabels);
        setRows(data.rows);
      })
      .catch((err) => {
        if (!cancelled) {
          setRows([]);
          setError(err instanceof Error ? err.message : "Could not load fixtures");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="panel-elevated overflow-hidden">
      <SectionHead title="Fixture watch · next 3 GWs" />
      <div className="p-4">
        {loading ? (
          <p className="text-[13px] text-[var(--text-secondary)]">Loading fixtures…</p>
        ) : error ? (
          <p className="text-[13px] text-[var(--coral)]">{error}</p>
        ) : rows.length === 0 ? (
          <p className="text-[13px] text-[var(--text-secondary)]">No fixture data yet. Try refreshing the page.</p>
        ) : (
          <div className="overflow-x-auto rounded-[3px] border border-[var(--border)]">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="bg-[var(--navy)] text-white">
                  <th className="sticky left-0 bg-[var(--navy)] py-2 pl-3 text-left font-label text-[10px]">Club</th>
                  {gwLabels.map((label) => (
                    <th key={label} className="px-1 py-2 text-center font-label text-[10px]">
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={row.club} className={i % 2 === 0 ? "bg-white" : "bg-[var(--canvas)]"}>
                    <td className="sticky left-0 bg-inherit py-1.5 pl-3 font-extrabold text-[var(--navy)]">
                      {row.club}
                    </td>
                    {row.cells.map((cell, j) => (
                      <td key={j} className="px-1 py-1.5 text-center">
                        {cell ? (
                          <span
                            className={`inline-block min-w-[2.75rem] rounded px-1.5 py-0.5 text-[11px] font-bold ${fdrCell(cell.fdr)}`}
                            title={`${cell.home ? "Home" : "Away"} · FDR ${cell.fdr}`}
                          >
                            {cell.home ? cell.opp : `@${cell.opp}`}
                          </span>
                        ) : (
                          <span className="inline-block min-w-[2.75rem] rounded bg-[var(--canvas)] px-1.5 py-0.5 text-[11px] text-[var(--text-secondary)]">
                            —
                          </span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-3 text-[12px] text-[var(--text-secondary)]">
          All Premier League clubs · opponent short name · green easy · yellow mid · red hard (@ = away).
        </p>
      </div>
    </section>
  );
}
