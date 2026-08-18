"use client";

import { useMemo } from "react";
import { useDashboard } from "@/context/DashboardContext";
import { SectionHead } from "./ui/SectionHead";

function fdrCell(fdr: number) {
  if (fdr <= 2) return "bg-[var(--fdr-easy)] text-[var(--positive)]";
  if (fdr === 3) return "bg-[var(--fdr-neutral)] text-[var(--text-body)]";
  return "bg-[var(--fdr-hard)] text-[var(--coral-dark)]";
}

export function FixtureWatchPanel() {
  const { starters, hasSquad } = useDashboard();

  const watch = useMemo(() => {
    const clubs = [...new Set(starters.map((p) => p.club))].slice(0, 6);
    if (clubs.length === 0) return null;
    const fdr: Record<string, number[]> = {};
    for (const club of clubs) {
      const player = starters.find((p) => p.club === club);
      fdr[club] = (player?.nextFixtures ?? []).slice(0, 3).map((f) => f.fdr);
    }
    const gameweeks = [1, 2, 3].slice(0, Math.max(...Object.values(fdr).map((r) => r.length), 0));
    return { clubs, gameweeks: gameweeks.length ? gameweeks : [1, 2, 3], fdr };
  }, [starters]);

  if (!hasSquad || !watch) {
    return (
      <section className="panel overflow-hidden">
        <SectionHead title="Fixture watch" />
        <p className="p-4 text-[13px] text-[var(--text-secondary)]">Scan your squad to see fixture difficulty.</p>
      </section>
    );
  }

  return (
    <section className="panel-elevated overflow-hidden">
      <SectionHead title="Fixture watch · next 3 GWs" />
      <div className="p-4">
        <div className="overflow-x-auto rounded-[3px] border border-[var(--border)]">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="bg-[var(--navy)] text-white">
                <th className="py-2 pl-3 text-left font-label text-[10px]">Club</th>
                {watch.gameweeks.map((gw, i) => (
                  <th key={gw} className="px-1 py-2 text-center font-label text-[10px]">
                    +{i + 1}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {watch.clubs.map((club, row) => (
                <tr key={club} className={row % 2 === 0 ? "bg-white" : "bg-[var(--canvas)]"}>
                  <td className="py-2 pl-3 font-extrabold text-[var(--navy)]">{club}</td>
                  {(watch.fdr[club] ?? []).map((rating, i) => (
                    <td key={i} className="px-1 py-2 text-center">
                      <span className={`inline-block min-w-[1.75rem] rounded px-1 py-0.5 text-[11px] font-bold ${fdrCell(rating)}`}>
                        {rating}
                      </span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-[13px] text-[var(--text-secondary)]">
          FDR for clubs in your starting XI, from live FPL fixture data.
        </p>
      </div>
    </section>
  );
}
