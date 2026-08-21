import type { ChipName, SavedSquad, SquadPlayer } from "./dashboard-data";
import { estimatePlayerXp, estimateSquadXp } from "./projections";

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

function byXpDesc(a: SquadPlayer, b: SquadPlayer) {
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
  gkp.sort(byXpDesc);
  def.sort(byXpDesc);
  mid.sort(byXpDesc);
  fwd.sort(byXpDesc);
  return { gkp, def, mid, fwd };
}

function sameLineup(a: SquadPlayer[], b: SquadPlayer[]) {
  if (a.length !== b.length) return false;
  const ids = new Set(a.map((p) => p.id));
  return b.every((p) => ids.has(p.id));
}

function assignCaptain(starters: SquadPlayer[]): SquadPlayer[] {
  const ranked = [...starters].sort(byXpDesc);
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

/**
 * Pick the highest-xP valid Starting XI from the 15-man squad.
 * Respects FPL formation mins/maxes; ranks by Dugout xP (+ active chip for scoring).
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

    const benchGk = remaining.filter((p) => p.position === "GKP").sort(byXpDesc);
    const benchOut = remaining.filter((p) => p.position !== "GKP").sort(byXpDesc);
    // Auto-sub order: backup GK first, then outfield by xP (highest first).
    const benchRaw = [...benchGk, ...benchOut].slice(0, 4);
    if (benchRaw.length + 11 > pool.length) {
      /* still ok — short squad */
    }

    const startersRaw = assignCaptain([gkpStarter, ...xiOutfield].map(asStarter));
    const bench = benchRaw.map(asBench);
    const score = estimateSquadXp(startersRaw, bench, activeChip);
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
  const afterXp = best.score;
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
