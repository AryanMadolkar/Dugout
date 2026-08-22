import type { StrategyMode } from "./strategy-mode";

export type RankStrategy = {
  headline: string;
  bullets: string[];
  captainStyle: string;
  transferStyle: string;
};

/** Rank-aware strategy copy (heuristic until FPL ID linked). */
export function rankStrategy(
  rank: number | null,
  avgOwnership: number,
  mode: StrategyMode,
): RankStrategy {
  const r = rank ?? 500_000;
  const templateHeavy = avgOwnership >= 35;

  if (r <= 50_000) {
    return {
      headline: "Protect your rank",
      bullets: [
        "Reduce captaincy variance — stick to high-floor premiums.",
        templateHeavy ? "Your squad is template-heavy — that's fine at this level." : "Avoid unnecessary hits.",
        "Save chips for double gameweeks unless a clear +10 xP edge appears.",
      ],
      captainStyle: "Safe captain on highest xP premium.",
      transferStyle: "Minimal moves; only fix injuries or price issues.",
    };
  }

  if (r <= 500_000) {
    return {
      headline: "Controlled climbs",
      bullets: [
        templateHeavy
          ? "Your squad is too template-heavy — consider 1–2 controlled differentials."
          : "Good differential mix — don't over-chase every punt.",
        "Target fixture swings 2–3 GWs ahead, not just this week.",
        mode === "AGGRESSIVE" ? "One differential captain per month can move rank." : "Balance hits with banked transfers.",
      ],
      captainStyle: mode === "AGGRESSIVE" ? "Differential captain when fixture + form align." : "Balanced captain on best xP.",
      transferStyle: "1 move per GW unless a -4 clearly clears +4 xP.",
    };
  }

  return {
    headline: "Rank chase mode",
    bullets: [
      `Current rank ~${r.toLocaleString()} — upside beats safety.`,
      "Prioritise differentials with strong minutes under 15% owned.",
      "Use chips aggressively when projected value exceeds +12 xP.",
    ],
    captainStyle: "Aggressive captain on ceiling players.",
    transferStyle: "Take calculated -4s when gain exceeds 4 xP.",
  };
}

export function avgSquadOwnership(starters: { ownership: number }[]): number {
  if (starters.length === 0) return 0;
  return starters.reduce((s, p) => s + p.ownership, 0) / starters.length;
}
