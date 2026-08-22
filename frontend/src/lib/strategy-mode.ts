import type { SquadPlayer } from "./dashboard-data";
import { estimatePlayerXp } from "./projections";
import { optimisePickScore } from "./optimise-xi";
import { playerDugoutScore } from "./player-intelligence";

export type StrategyMode = "SAFE" | "BALANCED" | "AGGRESSIVE";

export const STRATEGY_MODES: StrategyMode[] = ["SAFE", "BALANCED", "AGGRESSIVE"];

export const STRATEGY_COPY: Record<
  StrategyMode,
  { title: string; subtitle: string; captainHint: string }
> = {
  SAFE: {
    title: "Safe",
    subtitle: "Protect rank and minimize variance.",
    captainHint: "Favour high-ownership, high-minutes premiums.",
  },
  BALANCED: {
    title: "Balanced",
    subtitle: "Maximize expected points.",
    captainHint: "Best mix of xP, fixtures and reliability.",
  },
  AGGRESSIVE: {
    title: "Aggressive",
    subtitle: "Chase upside and differentials.",
    captainHint: "Lean into low-owned ceiling players.",
  },
};

/** Strategy-adjusted pick score for captain / XI / transfers. */
export function strategyPickScore(player: SquadPlayer, mode: StrategyMode): number {
  const base = optimisePickScore(player);
  const own = player.ownership;
  const score = playerDugoutScore(player);

  if (mode === "SAFE") {
    const ownBoost = own >= 40 ? 1.8 : own >= 25 ? 1.2 : own >= 15 ? 0.5 : -0.8;
    const reliability = player.form >= 4 ? 0.6 : 0;
    return base + ownBoost + reliability;
  }
  if (mode === "AGGRESSIVE") {
    const diffBoost = own <= 8 ? 2.2 : own <= 15 ? 1.4 : own <= 25 ? 0.4 : -0.6;
    const ceiling = (player.form || player.ppg || estimatePlayerXp(player)) >= 6 ? 1 : 0;
    return base + diffBoost + ceiling + score * 0.02;
  }
  return base;
}

export function rankCaptainCandidates(starters: SquadPlayer[], mode: StrategyMode) {
  return [...starters]
    .map((p) => ({
      player: p,
      xp: estimatePlayerXp(p),
      score: strategyPickScore(p, mode),
      confidence: Math.min(95, Math.round(55 + strategyPickScore(p, mode) * 2 + (p.form || 0) * 2)),
    }))
    .sort((a, b) => b.score - a.score);
}
