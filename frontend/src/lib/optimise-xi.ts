import type { ChipName, SavedSquad, SquadPlayer } from "./dashboard-data";
import { captainMultiplier, estimatePlayerXp, estimateSquadXp, normalizeChip } from "./projections";

/** Official FPL starting formations (DEF-MID-FWD). */
export const VALID_FORMATIONS: ReadonlyArray<readonly [number, number, number]> = [
  [3, 4, 3],
  [3, 5, 2],
  [4, 3, 3],
  [4, 4, 2],
  [4, 5, 1],
  [5, 2, 3],
  [5, 3, 2],
  [5, 4, 1],
];

export type OptimiseXiResult = {
  squad: SavedSquad;
  formation: string;
  beforeXp: number;
  afterXp: number;
  delta: number;
  changed: boolean;
};

function round1(n: number) {
  return Math.round(n * 10) / 10;
}

/** This-GW FDR (1 easy → 5 hard). Neutral 3 if unknown. */
export function playerGwFdr(player: SquadPlayer): number {
  const fdr = player.nextFixtures[0]?.fdr;
  return Number.isFinite(fdr) ? Number(fdr) : 3;
}

/** Average FDR over the next few fixtures (up to 3). */
export function playerRunFdr(player: SquadPlayer, games = 3): number {
  const slice = player.nextFixtures.slice(0, games);
  if (slice.length === 0) return 3;
  return slice.reduce((s, f) => s + (Number.isFinite(f.fdr) ? f.fdr : 3), 0) / slice.length;
}

/**
 * Optimise pick score: Dugout xP + explicit fixture difficulty.
 * Defence/keepers get a stronger FDR weight (clean-sheet / save upside).
 */
export function optimisePickScore(player: SquadPlayer): number {
  const xp = estimatePlayerXp(player);
  const gw = playerGwFdr(player);
  const run = playerRunFdr(player, 3);
  const defBias = player.position === "GKP" || player.position === "DEF" ? 1.25 : 1;

  // Extra FDR beyond the mild adj already inside estimatePlayerXp.
  // Easy GW (1–2) lifts the player; tough GW (4–5) drops them.
  const gwBonus = (3 - gw) * 0.95 * defBias;
  const runBonus = (3 - run) * 0.4 * defBias;
  // Soft preference: avoid starting into FDR 5 when close on xP.
  const brutal = gw >= 5 ? -0.6 : gw >= 4 ? -0.25 : 0;

  return round1(xp + gwBonus + runBonus + brutal);
}

function byPickDesc(a: SquadPlayer, b: SquadPlayer) {
  const diff = optimisePickScore(b) - optimisePickScore(a);
  if (Math.abs(diff) > 0.05) return diff;
  // Tie-break: easier fixture, then higher raw xP
  const fdrDiff = playerGwFdr(a) - playerGwFdr(b);
  if (fdrDiff !== 0) return fdrDiff;
  return estimatePlayerXp(b) - estimatePlayerXp(a);
}

function poolByPosition(pool: SquadPlayer[]) {
  const gkp: SquadPlayer[] = [];
  const def: SquadPlayer[] = [];
  const mid: SquadPlayer[] = [];
  const fwd: SquadPlayer[] = [];
  for (const p of pool) {
    if (p.position === "GKP") gkp.push(p);
    else if (p.position === "DEF") def.push(p);
    else if (p.position === "MID") mid.push(p);
    else fwd.push(p);
  }
  gkp.sort(byPickDesc);
  def.sort(byPickDesc);
  mid.sort(byPickDesc);
  fwd.sort(byPickDesc);
  return { gkp, def, mid, fwd };
}

function sameLineup(a: SquadPlayer[], b: SquadPlayer[]) {
  if (a.length !== b.length) return false;
  const ids = new Set(a.map((p) => p.id));
  return b.every((p) => ids.has(p.id));
}

function assignCaptain(starters: SquadPlayer[]): SquadPlayer[] {
  const ranked = [...starters].sort(byPickDesc);
  const captainId = ranked[0]?.id;
  const viceId = ranked[1]?.id;
  return starters.map((p) => ({
    ...p,
    isCaptain: p.id === captainId,
    isVice: p.id === viceId,
  }));
}

function asStarter(p: SquadPlayer): SquadPlayer {
  return {
    ...p,
    slot: "starter",
    row: p.position,
    isCaptain: false,
    isVice: false,
  };
}

function asBench(p: SquadPlayer): SquadPlayer {
  return {
    ...p,
    slot: "bench",
    row: p.position,
    isCaptain: false,
    isVice: false,
  };
}

/** Formation score: pick scores for XI (+ captain mult) and bench under BB. */
function scoreLineup(
  starters: SquadPlayer[],
  bench: SquadPlayer[],
  activeChip: ChipName | null,
): number {
  const chip = normalizeChip(activeChip);
  const captain = starters.find((p) => p.isCaptain) ?? [...starters].sort(byPickDesc)[0];
  const mult = captainMultiplier(chip);
  let total = 0;
  for (const p of starters) {
    const s = optimisePickScore(p);
    total += captain && p.id === captain.id ? s * mult : s;
  }
  if (chip === "Bench Boost") {
    total += bench.reduce((sum, p) => sum + optimisePickScore(p), 0);
  }
  return round1(total);
}

/**
 * Pick the best valid Starting XI from the 15-man squad.
 * Ranks by Dugout xP + fixture difficulty (this GW and short run).
 */
export function optimiseStartingXi(
  squad: SavedSquad,
  activeChip: ChipName | null = null,
): OptimiseXiResult {
  const pool = [...squad.starters, ...squad.bench];
  const beforeXp = estimateSquadXp(squad.starters, squad.bench, activeChip);
  const { gkp, def, mid, fwd } = poolByPosition(pool);

  if (gkp.length < 1) {
    return {
      squad,
      formation: squad.formation ?? "unknown",
      beforeXp,
      afterXp: beforeXp,
      delta: 0,
      changed: false,
    };
  }

  const gkpStarter = gkp[0];
  let best: {
    starters: SquadPlayer[];
    bench: SquadPlayer[];
    formation: string;
    score: number;
  } | null = null;

  for (const [d, m, f] of VALID_FORMATIONS) {
    if (def.length < d || mid.length < m || fwd.length < f) continue;

    const xiOutfield = [...def.slice(0, d), ...mid.slice(0, m), ...fwd.slice(0, f)];
    const starterIds = new Set([gkpStarter.id, ...xiOutfield.map((p) => p.id)]);
    const remaining = pool.filter((p) => !starterIds.has(p.id));

    const benchGk = remaining.filter((p) => p.position === "GKP").sort(byPickDesc);
    const benchOut = remaining.filter((p) => p.position !== "GKP").sort(byPickDesc);
    // Auto-sub order: backup GK first, then outfield by pick score.
    const benchRaw = [...benchGk, ...benchOut].slice(0, 4);

    const startersRaw = assignCaptain([gkpStarter, ...xiOutfield].map(asStarter));
    const bench = benchRaw.map(asBench);
    const score = scoreLineup(startersRaw, bench, activeChip);
    const formation = `${d}-${m}-${f}`;

    if (!best || score > best.score) {
      best = { starters: startersRaw, bench, formation, score };
    }
  }

  if (!best) {
    return {
      squad,
      formation: squad.formation ?? "unknown",
      beforeXp,
      afterXp: beforeXp,
      delta: 0,
      changed: false,
    };
  }

  const lineupUnchanged =
    sameLineup(squad.starters, best.starters) && sameLineup(squad.bench, best.bench);
  const afterXp = estimateSquadXp(best.starters, best.bench, activeChip);
  const delta = Math.round((afterXp - beforeXp) * 10) / 10;

  const next: SavedSquad = {
    ...squad,
    formation: best.formation,
    starters: best.starters,
    bench: best.bench,
  };

  return {
    squad: next,
    formation: best.formation,
    beforeXp,
    afterXp,
    delta,
    changed: !lineupUnchanged || Math.abs(delta) > 0.05,
  };
}
