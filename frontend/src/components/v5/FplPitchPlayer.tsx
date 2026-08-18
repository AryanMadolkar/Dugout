"use client";

import type { SquadPlayer } from "@/lib/dashboard-data";
import { FplJersey } from "./FplJersey";

type Props = {
  player: SquadPlayer;
  selected?: boolean;
  onClick?: () => void;
  variant?: "pitch" | "bench";
};

export function FplPitchPlayer({ player, selected, onClick, variant = "pitch" }: Props) {
  const isBench = variant === "bench";
  const fixtureLabel = `${player.opponent} (${player.home ? "H" : "A"})`;

  const ring =
    player.state === "flagged"
      ? "ring-2 ring-[#ff6b5a] ring-offset-1 ring-offset-transparent"
      : player.state === "incoming"
        ? "ring-2 ring-[#fbbf24] ring-offset-1 ring-offset-transparent"
        : selected
          ? "ring-2 ring-white ring-offset-1 ring-offset-transparent"
          : "";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group flex flex-col items-center gap-0.5 px-0.5 transition hover:scale-105 focus:outline-none ${ring}`}
      style={{ minWidth: isBench ? 64 : 72, maxWidth: isBench ? 80 : 88 }}
    >
      {/* Shirt */}
      <div className="relative">
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

      {/* Name pill — FPL white bar */}
      <div
        className="w-full truncate rounded-sm px-1 py-px text-center text-[10px] font-bold leading-tight text-[#1a1a1a] shadow-sm"
        style={{ background: "rgba(255,255,255,0.95)", maxWidth: isBench ? 72 : 80 }}
        title={player.name}
      >
        {player.name}
      </div>

      {/* Fixture — FPL format: MCI (H) */}
      <div
        className="rounded-sm px-1.5 py-px text-[9px] font-semibold leading-tight text-white/90"
        style={{
          background: "rgba(0,0,0,0.35)",
          textShadow: "0 1px 2px rgba(0,0,0,0.5)",
        }}
      >
        {fixtureLabel}
      </div>

      {/* xP / points */}
      <div className="flex items-baseline gap-0.5">
        <span
          className={`font-extrabold leading-none text-white ${isBench ? "text-[13px]" : "text-[15px]"}`}
          style={{ textShadow: "0 1px 3px rgba(0,0,0,0.6)" }}
        >
          {player.xp.toFixed(1)}
        </span>
        {!isBench ? (
          <span className="text-[8px] font-semibold uppercase text-white/70">xp</span>
        ) : null}
      </div>
    </button>
  );
}
