import type { ChipName, ChipUsageMap, SquadPlayer } from "./dashboard-data";
import { CHIP_NAMES } from "./dashboard-data";
import { estimatePlayerXp } from "./projections";

export type ChipWindow = {
  chip: ChipName;
  bestGw: number;
  projectedValue: number;
  label: string;
  reason: string;
  available: boolean;
};

export type ChipTimeline = {
  windows: ChipWindow[];
  recommendation: string;
  nextOptimal: { chip: ChipName; gw: number; value: number } | null;
  upcomingGws: number[];
};

function avgFdr(players: SquadPlayer[], gwOffset: number): number {
  if (players.length === 0) return 3;
  let t = 0;
  let c = 0;
  for (const p of players) {
    const f = p.nextFixtures[gwOffset]?.fdr ?? 3;
    t += f;
    c += 1;
  }
  return c ? t / c : 3;
}

function benchStrength(bench: SquadPlayer[]): number {
  return bench.reduce((s, p) => s + estimatePlayerXp(p), 0);
}

/** Heuristic optimal chip windows over upcoming gameweeks. */
export function buildChipTimeline(
  currentGw: number,
  starters: SquadPlayer[],
  bench: SquadPlayer[],
  chipUsage: ChipUsageMap,
  horizon = 8,
): ChipTimeline {
  const upcomingGws = Array.from({ length: horizon }, (_, i) => currentGw + i);
  const captain = starters.find((p) => p.isCaptain) ?? starters[0];
  const captainXp = captain ? estimatePlayerXp(captain) : 6;
  const benchXp = benchStrength(bench);

  const windows: ChipWindow[] = CHIP_NAMES.map((chip) => {
    const available = chipUsage[chip] !== "used";
    let bestGw = currentGw + 2;
    let projectedValue = 0;
    let reason = "";

    if (chip === "Wildcard") {
      bestGw = currentGw + 4;
      projectedValue = 14 + Math.max(0, avgFdr(starters, 2) - 2.8) * 4;
      reason = "Restructure into a softer fixture block mid-run.";
    } else if (chip === "Free Hit") {
      bestGw = currentGw + 6;
      projectedValue = 8 + avgFdr(starters, 0) * 1.2;
      reason = "Navigate a blank or brutal double gameweek.";
    } else if (chip === "Bench Boost") {
      bestGw = currentGw + 5;
      projectedValue = benchXp * 0.85 + (5 - avgFdr(bench, 0)) * 2;
      reason = `Bench projects ${benchXp.toFixed(1)} xP when fixtures align.`;
    } else {
      bestGw = currentGw + 3;
      projectedValue = captainXp * (5 - (captain?.nextFixtures[0]?.fdr ?? 3)) * 0.9;
      reason = `${captain?.name ?? "Captain"} ceiling + soft fixture spike.`;
    }

    return {
      chip,
      bestGw,
      projectedValue: Math.round(projectedValue * 10) / 10,
      label: `GW${bestGw}`,
      reason,
      available,
    };
  });

  const availableWindows = windows.filter((w) => w.available).sort((a, b) => b.projectedValue - a.projectedValue);
  const nextOptimal = availableWindows[0]
    ? { chip: availableWindows[0].chip, gw: availableWindows[0].bestGw, value: availableWindows[0].projectedValue }
    : null;

  const recommendation =
    nextOptimal && nextOptimal.value >= 12
      ? `Save chips · next optimal: ${nextOptimal.chip} around GW${nextOptimal.gw}`
      : "Save all chips — no clear spike this window.";

  return { windows, recommendation, nextOptimal, upcomingGws };
}
