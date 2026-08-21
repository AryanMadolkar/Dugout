"use client";

import type { SquadPlayer } from "@/lib/dashboard-data";
import { estimatePlayerXp } from "@/lib/projections";
import { FplJersey } from "./FplJersey";

type Props = {
  player: SquadPlayer;
  selected?: boolean;
  onClick?: () => void;
  variant?: "pitch" | "bench";
};

export function FplPitchPlayer({ player, selected, onClick, variant = "pitch" }: Props) {
  const isBench = variant === "bench";
  const xp = estimatePlayerXp(player);
  const fixtureLabel = `${player.opponent} (${player.home ? "H" : "A"})`;
  const fdr = player.nextFixtures[0]?.fdr ?? 3;

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
          isCaptain={player.isCaptain}
          isVice={player.isVice}
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
        </p>
        <div
          className="flex items-center justify-between gap-0.5 px-1 py-0.5 text-[9px] font-semibold text-white"
          style={{
            background:
              fdr <= 2 ? "#22854f" : fdr >= 4 ? "#c44a3a" : "rgba(26,26,26,0.75)",
          }}
        >
          <span className="truncate">{fixtureLabel}</span>
          <span className="shrink-0 font-extrabold">{xp.toFixed(1)}</span>
        </div>
      </div>
    </button>
  );
}
