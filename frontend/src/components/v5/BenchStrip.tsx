"use client";

import type { SquadPlayer } from "@/lib/dashboard-data";
import { useDashboard } from "@/context/DashboardContext";
import { FplPitchPlayer } from "./FplPitchPlayer";
import { SectionHead } from "./ui/SectionHead";

type Props = {
  bench: SquadPlayer[];
};

export function BenchStrip({ bench }: Props) {
  const { selectedId, setSelectedId } = useDashboard();
  const benchValue = bench.reduce((s, p) => s + p.price, 0);

  return (
    <div className="panel overflow-hidden">
      <SectionHead
        title="Bench · auto-sub order"
        right={
          <span className="text-[11px] text-[var(--text-secondary)]">
            <strong className="text-[var(--navy)]">£{benchValue.toFixed(1)}m</strong> benched
          </span>
        }
      />
      {/* FPL-style bench strip — dark bar with shirts */}
      <div
        className="flex items-start justify-around gap-1 px-3 py-4 sm:gap-2 sm:px-4"
        style={{ background: "linear-gradient(180deg, #2a2a2a 0%, #1a1a1a 100%)" }}
      >
        {bench.map((player, i) => (
          <div key={player.id} className="relative flex flex-col items-center">
            <span
              className="mb-1 flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold text-white"
              style={{ background: "rgba(255,255,255,0.2)" }}
            >
              {i + 1}
            </span>
            <FplPitchPlayer
              player={player}
              selected={selectedId === player.id}
              onClick={() => setSelectedId(player.id)}
              variant="bench"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
