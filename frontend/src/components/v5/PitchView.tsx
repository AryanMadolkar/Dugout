"use client";

import type { SquadPlayer } from "@/lib/dashboard-data";
import { useDashboard } from "@/context/DashboardContext";
import { FplPitchPlayer } from "./FplPitchPlayer";
import { SectionHead } from "./ui/SectionHead";

type Props = {
  squad: SquadPlayer[];
};

const ROWS: SquadPlayer["row"][] = ["FWD", "MID", "DEF", "GKP"];

function inferFormation(squad: SquadPlayer[]): string {
  const counts = { GKP: 0, DEF: 0, MID: 0, FWD: 0 };
  for (const p of squad) {
    counts[p.row] += 1;
  }
  if (counts.GKP === 0) return "unknown";
  return `${counts.DEF}-${counts.MID}-${counts.FWD}`;
}

export function PitchView({ squad }: Props) {
  const { selectedId, setSelectedId } = useDashboard();

  return (
    <div className="panel-elevated pitch-wrap overflow-hidden">
      <SectionHead
        title={`Starting XI · ${inferFormation(squad)}`}
        right={
          <span className="rounded-[3px] bg-[var(--fdr-easy)] px-2 py-0.5 text-[10px] font-bold text-[var(--positive)]">
            £{squad.reduce((s, p) => s + p.price, 0).toFixed(1)}m
          </span>
        }
      />
      <div className="pitch-surface relative min-h-[480px] px-3 py-6 sm:min-h-[520px] sm:px-6">
        {/* Pitch markings — FPL style */}
        <div className="pointer-events-none absolute inset-3 rounded-[2px] border-[1.5px] border-white/30 sm:inset-4" />
        <div className="pointer-events-none absolute left-1/2 top-3 h-[calc(100%-1.5rem)] w-px -translate-x-1/2 bg-white/30 sm:top-4 sm:h-[calc(100%-2rem)]" />
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-[22%] w-[22%] min-h-[4.5rem] min-w-[4.5rem] -translate-x-1/2 -translate-y-1/2 rounded-full border-[1.5px] border-white/30" />
        {/* Penalty areas */}
        <div className="pointer-events-none absolute left-1/2 top-3 h-[16%] w-[44%] -translate-x-1/2 border-[1.5px] border-white/30 border-t-0 sm:top-4" />
        <div className="pointer-events-none absolute bottom-3 left-1/2 h-[16%] w-[44%] -translate-x-1/2 border-[1.5px] border-white/30 border-b-0 sm:bottom-4" />
        {/* Six-yard boxes */}
        <div className="pointer-events-none absolute left-1/2 top-3 h-[7%] w-[22%] -translate-x-1/2 border-[1.5px] border-white/30 border-t-0 sm:top-4" />
        <div className="pointer-events-none absolute bottom-3 left-1/2 h-[7%] w-[22%] -translate-x-1/2 border-[1.5px] border-white/30 border-b-0 sm:bottom-4" />
        {/* Spots */}
        <div className="pointer-events-none absolute left-1/2 top-[11%] h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-white/40" />
        <div className="pointer-events-none absolute bottom-[11%] left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-white/40" />

        {/* Formation rows — FPL spacing */}
        <div className="relative flex h-full min-h-[440px] flex-col justify-between gap-2 py-2 sm:gap-3">
          {ROWS.map((row) => {
            const players = squad.filter((p) => p.row === row);
            return (
              <div
                key={row}
                className="flex flex-wrap items-end justify-center gap-2 sm:gap-3"
                style={{ flex: row === "GKP" ? "0 0 auto" : "1 1 0" }}
              >
                {players.map((player) => (
                  <FplPitchPlayer
                    key={player.id}
                    player={player}
                    selected={selectedId === player.id}
                    onClick={() => setSelectedId(player.id)}
                  />
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
