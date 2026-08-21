import type { ChipAvailability, ChipName, ChipUsageMap, SquadPlayer } from "./dashboard-data";
import { CHIP_NAMES } from "./dashboard-data";
import { estimatePlayerXp } from "./projections";

export type ChipRecommendation = {
  chip: ChipName | "Hold";
  score: number;
  headline: string;
  reason: string;
  alternatives: { chip: ChipName; score: number; note: string }[];
};

function avgFdr(players: SquadPlayer[], games = 1): number {
  if (players.length === 0) return 3;
  let total = 0;
  let count = 0;
  for (const p of players) {
    const slice = p.nextFixtures.slice(0, games);
    if (slice.length === 0) {
      total += 3;
      count += 1;
      continue;
    }
    for (const f of slice) {
      total += f.fdr;
      count += 1;
    }
  }
  return count ? total / count : 3;
}

function isAvailable(status: ChipAvailability) {
  return status !== "used";
}

/**
 * Heuristic chip recommendation from squad strength + fixture run.
 * Not a full optimiser — ranks chips the manager still has available.
 */
export function recommendChipStrategy(
  starters: SquadPlayer[],
  bench: SquadPlayer[],
  chipUsage: ChipUsageMap,
): ChipRecommendation | null {
  if (starters.length === 0) return null;

  const captain = starters.find((p) => p.isCaptain) ?? [...starters].sort((a, b) => estimatePlayerXp(b) - estimatePlayerXp(a))[0];
  const captainXp = estimatePlayerXp(captain);
  const captainFdr = captain.nextFixtures[0]?.fdr ?? 3;

  const benchXp = bench.reduce((s, p) => s + estimatePlayerXp(p), 0);
  const benchFdr = avgFdr(bench, 1);
  const xiFdr1 = avgFdr(starters, 1);
  const xiFdr3 = avgFdr(starters, 3);

  const easyRun = starters.filter((p) => {
    const f = p.nextFixtures.slice(0, 3);
    if (!f.length) return false;
    return f.reduce((s, x) => s + x.fdr, 0) / f.length <= 2.4;
  }).length;
  const hardRun = starters.filter((p) => {
    const f = p.nextFixtures.slice(0, 3);
    if (!f.length) return false;
    return f.reduce((s, x) => s + x.fdr, 0) / f.length >= 3.6;
  }).length;

  const scored: { chip: ChipName; score: number; note: string }[] = [];

  // Triple Captain — premium captain + soft fixture
  scored.push({
    chip: "Triple Captain",
    score: captainXp * (5.5 - captainFdr) * 1.8 + (captain.price >= 10 ? 4 : 0) + (captain.ownership >= 30 ? 2 : 0),
    note: `${captain.name} projects ${captainXp.toFixed(1)} xP (FDR ${captainFdr})`,
  });

  // Bench Boost — strong bench + soft fixtures
  scored.push({
    chip: "Bench Boost",
    score: benchXp * (5.2 - benchFdr) * 1.4 + (bench.length >= 4 ? 3 : 0),
    note: `Bench projects ${benchXp.toFixed(1)} xP · avg FDR ${benchFdr.toFixed(1)}`,
  });

  // Free Hit — painful GW fixtures / many hard matches
  scored.push({
    chip: "Free Hit",
    score: hardRun * 4.5 + xiFdr1 * 3.2 + (xiFdr1 >= 3.8 ? 8 : 0) - easyRun * 2,
    note: `XI avg FDR ${xiFdr1.toFixed(1)} this GW · ${hardRun} hard runs next 3`,
  });

  // Wildcard — structural fixture pain over a stretch, or thin squad quality
  const squadXp = starters.reduce((s, p) => s + estimatePlayerXp(p), 0);
  scored.push({
    chip: "Wildcard",
    score: hardRun * 3.5 + xiFdr3 * 2.5 + (squadXp < 45 ? 10 : 0) + (easyRun <= 2 ? 4 : 0) - (squadXp > 58 ? 8 : 0),
    note: `Next-3 FDR ${xiFdr3.toFixed(1)} · XI xP ${squadXp.toFixed(1)} · ${hardRun} tough schedules`,
  });

  const available = scored
    .filter((s) => isAvailable(chipUsage[s.chip]))
    .sort((a, b) => b.score - a.score);

  if (available.length === 0) {
    return {
      chip: "Hold",
      score: 0,
      headline: "All chips marked used",
      reason: "Update chip availability if any remain, or wait for the next chip window.",
      alternatives: [],
    };
  }

  const best = available[0];
  // Hold if nothing is compelling
  const holdThreshold = best.chip === "Free Hit" ? 14 : best.chip === "Wildcard" ? 16 : 12;
  if (best.score < holdThreshold) {
    return {
      chip: "Hold",
      score: best.score,
      headline: "Hold chips this week",
      reason: `Best option (${best.chip}) isn't strong enough yet — ${best.note}. Wait for a clearer fixture / captain spike.`,
      alternatives: available.slice(0, 3).map((a) => ({ chip: a.chip, score: Math.round(a.score), note: a.note })),
    };
  }

  const headlines: Record<ChipName, string> = {
    "Triple Captain": `Play Triple Captain on ${captain.name}`,
    "Bench Boost": "Play Bench Boost this GW",
    "Free Hit": "Consider Free Hit this GW",
    Wildcard: "Wildcard into a better fixture run",
  };

  return {
    chip: best.chip,
    score: Math.round(best.score),
    headline: headlines[best.chip],
    reason: best.note,
    alternatives: available.slice(1, 3).map((a) => ({ chip: a.chip, score: Math.round(a.score), note: a.note })),
  };
}

export function chipIsSet(chipUsage: ChipUsageMap): boolean {
  return CHIP_NAMES.some((n) => chipUsage[n] !== "unknown");
}
