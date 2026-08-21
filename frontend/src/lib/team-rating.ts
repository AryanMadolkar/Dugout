import type { SquadPlayer } from "./dashboard-data";
import type { Player } from "./types";
import { estimatePlayerXp, estimateSquadXp } from "./projections";

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

/**
 * Team rating from FPL metrics, each bar 0–100:
 * - Expected pts: Dugout GW projection (XI + captain) vs ~65 (strong week)
 * - Form: avg form / PPG / projected xP
 * - Fixtures: inverted FDR (1 easy → 100, 5 hard → 0)
 * - Depth: bench combined xPts vs ~18
 */
export function computeTeamRating(
  starters: SquadPlayer[],
  bench: SquadPlayer[],
  liveById?: Map<number, Player>,
): TeamRating | null {
  if (starters.length === 0) return null;

  const xi = starters.map((p) => withLive(p, liveById));
  const bn = bench.map((p) => withLive(p, liveById));

  const projectedGw = estimateSquadXp(xi);
  const xiScore = clamp((projectedGw / 65) * 100);

  const perfs = xi.map((p) => {
    if (p.form > 0) return { value: p.form, source: "form" as const };
    if ((p.ppg ?? 0) > 0) return { value: p.ppg as number, source: "ppg" as const };
    return { value: estimatePlayerXp(p), source: "xp" as const };
  });
  const avgPerf = perfs.reduce((s, p) => s + p.value, 0) / perfs.length;
  const usingForm = perfs.some((p) => p.source === "form");
  const formScore = clamp((avgPerf / (usingForm ? 6 : 5.5)) * 100);
  const formHint = usingForm ? `Avg form ${avgPerf.toFixed(1)}` : `Avg xPts ${avgPerf.toFixed(1)}`;

  const avgFdr = xi.reduce((s, p) => s + fdrOf(p), 0) / xi.length;
  const fixtureScore = clamp(((5 - avgFdr) / 4) * 100);

  const benchXp = bn.reduce((s, p) => s + estimatePlayerXp(p), 0);
  const depthScore = clamp((benchXp / 18) * 100);

  const score = clamp(0.4 * xiScore + 0.25 * formScore + 0.2 * fixtureScore + 0.15 * depthScore);

  let verdict: string;
  let verdictTone: TeamRating["verdictTone"];
  if (score >= 80) {
    verdict = "Elite";
    verdictTone = "good";
  } else if (score >= 70) {
    verdict = "Strong";
    verdictTone = "good";
  } else if (score >= 55) {
    verdict = "Solid";
    verdictTone = "ok";
  } else if (score >= 40) {
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
    bars: [
      { label: "Expected pts", value: xiScore, hint: `${projectedGw.toFixed(1)} GW xPts` },
      { label: "Form", value: formScore, hint: formHint },
      { label: "Fixtures", value: fixtureScore, hint: `Avg FDR ${avgFdr.toFixed(1)}` },
      { label: "Depth", value: depthScore, hint: `${benchXp.toFixed(1)} bench xPts` },
    ],
  };
}
