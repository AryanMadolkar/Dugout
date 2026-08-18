"use client";

import type { SquadPlayer } from "@/lib/dashboard-data";

const POS_STRIPE: Record<SquadPlayer["position"], string> = {
  GKP: "pos-stripe-gkp",
  DEF: "pos-stripe-def",
  MID: "pos-stripe-mid",
  FWD: "pos-stripe-fwd",
};

type Props = {
  player: SquadPlayer;
  selected?: boolean;
  onClick?: () => void;
  compact?: boolean;
};

export function PlayerCard({ player, selected, onClick, compact }: Props) {
  const outline =
    player.state === "flagged"
      ? "ring-2 ring-[var(--coral)] shadow-[0_0_0_3px_rgba(232,80,60,0.15)]"
      : player.state === "incoming"
        ? "ring-2 ring-[var(--amber)] shadow-[0_0_0_3px_rgba(217,119,6,0.15)]"
        : selected
          ? "ring-2 ring-[var(--navy)] shadow-[0_4px_12px_rgba(16,30,46,0.2)]"
          : "";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`player-card group relative flex w-full flex-col items-center overflow-hidden border border-white/80 bg-white/95 p-2 text-center backdrop-blur-sm transition hover:-translate-y-1 hover:shadow-lg ${POS_STRIPE[player.position]} ${outline}`}
    >
      {player.state === "flagged" ? (
        <span className="absolute left-0 right-0 top-0 bg-[var(--coral)] py-0.5 text-[8px] font-bold uppercase tracking-wider text-white">
          Out
        </span>
      ) : null}
      {player.state === "incoming" ? (
        <span className="absolute left-0 right-0 top-0 bg-[var(--amber)] py-0.5 text-[8px] font-bold uppercase tracking-wider text-white">
          In
        </span>
      ) : null}

      {player.isCaptain ? (
        <span
          className="absolute -right-1 -top-1 z-10 flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-bold text-white"
          style={{ background: "linear-gradient(135deg, var(--coral), var(--coral-dark))", boxShadow: "0 2px 6px rgba(232,80,60,0.5)" }}
        >
          C
        </span>
      ) : null}
      {player.isVice ? (
        <span className="absolute -right-1 -top-1 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--navy)] text-[9px] font-bold text-white">
          V
        </span>
      ) : null}

      <div
        className={`relative flex items-center justify-center rounded-full ${compact ? "mt-0 h-9 w-9" : "mt-1 h-11 w-11"}`}
        style={{
          background: `linear-gradient(135deg, ${player.clubColor}22 0%, ${player.clubColor}44 100%)`,
          boxShadow: `inset 0 0 0 2px ${player.clubColor}`,
        }}
      >
        <span className="text-[11px] font-extrabold text-[var(--navy)]">{player.initials}</span>
      </div>

      <p className={`mt-1 w-full truncate font-bold ${compact ? "text-[11px]" : "text-[12px]"}`}>{player.name}</p>

      {!compact ? (
        <>
          <div className="mt-0.5 flex items-center justify-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full ring-1 ring-black/10" style={{ background: player.clubColor }} />
            <span className="font-label text-[10px] text-[var(--text-secondary)]">
              {player.club} · £{player.price}m
            </span>
          </div>
          <p
            className={`mt-0.5 rounded px-1.5 py-0.5 text-[10px] font-semibold ${
              player.home ? "bg-[var(--fdr-easy)] text-[var(--positive)]" : "bg-[var(--fdr-neutral)] text-[var(--text-body)]"
            }`}
          >
            {player.home ? "H" : "A"} {player.opponent}
          </p>
        </>
      ) : (
        <span className="font-label mt-0.5 text-[10px] text-[var(--text-secondary)]">£{player.price}m</span>
      )}

      <p
        className={`font-extrabold text-[var(--navy)] ${compact ? "mt-0.5 text-[13px]" : "mt-1 text-[15px]"}`}
      >
        {player.xp.toFixed(1)}
      </p>
      {!compact ? <p className="font-label text-[9px] text-[var(--text-secondary)]">xP</p> : null}
    </button>
  );
}
