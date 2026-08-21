"use client";

import { useDashboard } from "@/context/DashboardContext";
import type { SquadPlayer } from "@/lib/dashboard-data";
import { estimatePlayerGwXp, estimatePlayerXp, resolveCaptainId } from "@/lib/projections";
import { FplJersey } from "./FplJersey";

type Props = {
  player: SquadPlayer;
  selected?: boolean;
  onClick?: () => void;
  variant?: "pitch" | "bench";
};

export function FplPitchPlayer({ player, selected, onClick, variant = "pitch" }: Props) {
  const { starters, activeChip } = useDashboard();
  const isBench = variant === "bench";
  const captainId = resolveCaptainId(starters);
  const isCap = !isBench && captainId === player.id;
  const baseXp = estimatePlayerXp(player);
  const xp = isBench ? baseXp : estimatePlayerGwXp(player, activeChip, captainId);
  const fixtureLabel = `${player.opponent} (${player.home ? "H" : "A"})`;
  const fdr = player.nextFixtures[0]?.fdr ?? 3;
  const mult = isCap ? (activeChip === "Triple Captain" ? 3 : 2) : 1;

  const jerseyRing =
    player.state === "flagged"
      ? "ring-2 ring-[#ff6b5a]"
      : player.state === "incoming"
        ? "ring-2 ring-[#fbbf24]"
        : selected
          ? "ring-2 ring-white ring-offset-2 ring-offset-[#1a6b42]"
          : "";

  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-[4.75rem] flex-col items-center gap-1 transition hover:-translate-y-0.5 focus:outline-none sm:w-[5.25rem]"
    >
      <div className={`relative rounded-md ${jerseyRing}`}>
        <FplJersey
          club={player.club}
          clubColor={player.clubColor}
          isGK={player.position === "GKP"}
          isCaptain={player.isCaptain || isCap}
          isVice={player.isVice && !isCap}
          size={isBench ? "bench" : "pitch"}
        />
        {player.state === "flagged" ? (
          <span className="absolute -right-1 -top-1 rounded-sm bg-[#e8503c] px-1 py-px text-[7px] font-bold text-white">
            OUT
          </span>
        ) : null}
        {player.state === "incoming" ? (
          <span className="absolute -right-1 -top-1 rounded-sm bg-[#f59e0b] px-1 py-px text-[7px] font-bold text-white">
            IN
          </span>
        ) : null}
      </div>

      <div className="w-full overflow-hidden rounded-sm bg-white shadow-sm">
        <p className="truncate px-1 py-0.5 text-center text-[10px] font-bold leading-tight text-[#1a1a1a]" title={player.name}>
          {player.name}
          {isCap ? <span className="text-[var(--coral)]"> (C)</span> : null}
        </p>
        <div
          className="flex items-center justify-between gap-0.5 px-1 py-0.5 text-[9px] font-semibold text-white"
          style={{
            background: isCap
              ? "linear-gradient(90deg, var(--coral), #c44a3a)"
              : fdr <= 2
                ? "#22854f"
                : fdr >= 4
                  ? "#c44a3a"
                  : "rgba(26,26,26,0.75)",
          }}
          title={isCap ? `${baseXp.toFixed(1)} × ${mult}` : undefined}
        >
          <span className="truncate">{fixtureLabel}</span>
          <span className="shrink-0 font-extrabold" title={isCap ? `${baseXp.toFixed(1)} × ${mult}` : undefined}>
            {xp.toFixed(1)}
          </span>
        </div>
      </div>
    </button>
  );
}
