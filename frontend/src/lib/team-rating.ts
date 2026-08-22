import type { ChipName, SquadPlayer } from "./dashboard-data";
import type { Player } from "./types";
import { estimatePlayerXp, estimateSquadXp } from "./projections";
import { optimisePickScore } from "./optimise-xi";
import { startProbability } from "./player-intelligence";

export type RatingBar = {
  label: string;
  value: number;
  hint: string;
};

export type TeamRating = {
  score: number;
  verdict: string;
  verdictTone: "good" | "ok" | "warn";
  bars: RatingBar[];
  projectedGw: number;
  weakness: string;
};

function clamp(n: number, lo = 0, hi = 100) {
  return Math.round(Math.min(hi, Math.max(lo, n)));
}

function liveFor(player: SquadPlayer, liveById?: Map<number, Player>) {
  return player.fplId != null ? liveById?.get(player.fplId) : undefined;
}

function withLive(player: SquadPlayer, liveById?: Map<number, Player>): SquadPlayer {
  const live = liveFor(player, liveById);
  if (!live) return player;
  return {
    ...player,
    xp: live.ep_next ?? live.ep_this ?? live.points_per_game ?? player.xp,
    form: live.form ?? player.form,
    ppg: live.points_per_game ?? player.ppg,
    ownership: live.selected_by_percent ?? player.ownership,
    price: live.price ?? player.price,
  };
}

function fdrOf(player: SquadPlayer) {
  return player.nextFixtures[0]?.fdr ?? 3;
}

function weakestLabel(bars: RatingBar[]): string {
  const sorted = [...bars].sort((a, b) => a.value - b.value);
  const w = sorted[0];
  if (!w) return "Squad balance";
  const map: Record<string, string> = {
    "Starting XI": "starting XI quality",
    Fixtures: "fixture difficulty",
    Form: "recent form",
    Value: "price efficiency",
    Depth: "squad depth",
    Rotation: "rotation risk",
  };
  return `Your biggest weakness is ${map[w.label] ?? w.label.toLowerCase()}.`;
}

/**
 * Dugout Score — 0–100 with six fantasy-game dimensions.
 */
export function computeTeamRating(
  starters: SquadPlayer[],
  bench: SquadPlayer[],
  liveById?: Map<number, Player>,
  activeChip: ChipName | null = null,
): TeamRating | null {
  if (starters.length === 0) return null;

  const xi = starters.map((p) => withLive(p, liveById));
  const bn = bench.map((p) => withLive(p, liveById));

  const projectedGw = estimateSquadXp(xi, bn, activeChip);
  const benchmark = activeChip === "Bench Boost" ? 80 : activeChip === "Triple Captain" ? 72 : 65;
  const startingXi = clamp((projectedGw / benchmark) * 100);

  const avgFdr = xi.reduce((s, p) => s + fdrOf(p), 0) / xi.length;
  const fixtures = clamp(((5 - avgFdr) / 4) * 100);

  const perfs = xi.map((p) => {
    if (p.form > 0) return p.form;
    if ((p.ppg ?? 0) > 0) return p.ppg as number;
    return estimatePlayerXp(p);
  });
  const avgPerf = perfs.reduce((s, v) => s + v, 0) / perfs.length;
  const form = clamp((avgPerf / 6) * 100);

  const valueScores = xi.map((p) => estimatePlayerXp(p) / Math.max(p.price, 4));
  const value = clamp((valueScores.reduce((s, v) => s + v, 0) / valueScores.length / 1.4) * 100);

  const benchXp = bn.reduce((s, p) => s + estimatePlayerXp(p), 0);
  const depth = clamp((benchXp / 18) * 100);

  const rotScores = xi.map((p) => startProbability(p, liveFor(p, liveById)));
  const rotation = clamp(rotScores.reduce((s, v) => s + v, 0) / rotScores.length);

  const pickAvg = xi.reduce((s, p) => s + optimisePickScore(p), 0) / xi.length;
  const startingXiBlend = clamp(0.6 * startingXi + 0.4 * (pickAvg / 8) * 100);

  const bars: RatingBar[] = [
    { label: "Starting XI", value: startingXiBlend, hint: `${projectedGw.toFixed(1)} GW xPts` },
    { label: "Fixtures", value: fixtures, hint: `Avg FDR ${avgFdr.toFixed(1)}` },
    { label: "Form", value: form, hint: `Avg ${avgPerf.toFixed(1)}` },
    { label: "Value", value: value, hint: "xP per £m" },
    { label: "Depth", value: depth, hint: `${benchXp.toFixed(1)} bench xPts` },
    { label: "Rotation", value: rotation, hint: `${Math.round(rotation)}% avg start prob` },
  ];

  const score = clamp(
    0.28 * startingXiBlend +
      0.2 * fixtures +
      0.18 * form +
      0.14 * value +
      0.1 * depth +
      0.1 * rotation,
  );

  let verdict: string;
  let verdictTone: TeamRating["verdictTone"];
  if (score >= 85) {
    verdict = "Elite";
    verdictTone = "good";
  } else if (score >= 75) {
    verdict = "Good";
    verdictTone = "good";
  } else if (score >= 62) {
    verdict = "Solid";
    verdictTone = "ok";
  } else if (score >= 48) {
    verdict = "Average";
    verdictTone = "ok";
  } else {
    verdict = "Needs work";
    verdictTone = "warn";
  }

  return {
    score,
    verdict,
    verdictTone,
    projectedGw,
    bars,
    weakness: weakestLabel(bars),
  };
}
