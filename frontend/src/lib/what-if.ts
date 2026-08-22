import type { ChipName, SavedSquad, SquadPlayer } from "./dashboard-data";
import { computeTeamRating } from "./team-rating";
import { estimatePlayerXp, estimateSquadXp } from "./projections";
import { optimiseStartingXi } from "./optimise-xi";

export type WhatIfMove = {
  outId: string;
  inPlayer: SquadPlayer;
  hit?: number;
};

export type WhatIfScenario = {
  id: string;
  label: string;
  moves: WhatIfMove[];
  captainId?: string;
  formation?: string;
  activeChip?: ChipName | null;
};

export type WhatIfResult = {
  scenario: WhatIfScenario;
  rating: number;
  gwXp: number;
  next4Xp: number;
  formation: string;
};

function applyMoves(squad: SavedSquad, moves: WhatIfMove[]): SavedSquad {
  const replaceInList = (list: SquadPlayer[]) =>
    list.map((p) => {
      const move = moves.find((m) => m.outId === p.id);
      if (!move) return p;
      return {
        ...move.inPlayer,
        id: String(move.inPlayer.fplId ?? move.inPlayer.id),
        slot: p.slot,
        row: p.row,
        isCaptain: p.isCaptain,
        isVice: p.isVice,
      };
    });

  return {
    ...squad,
    starters: replaceInList(squad.starters),
    bench: replaceInList(squad.bench),
  };
}

function next4Xp(starters: SquadPlayer[], bench: SquadPlayer[]): number {
  const all = [...starters, ...bench];
  return Math.round(all.reduce((s, p) => s + estimatePlayerXp(p) * 3.8, 0) * 10) / 10;
}

export function evaluateScenario(
  baseSquad: SavedSquad,
  scenario: WhatIfScenario,
  activeChip: ChipName | null,
): WhatIfResult {
  let squad = applyMoves(baseSquad, scenario.moves);
  const hit = scenario.moves.reduce((s, m) => s + (m.hit ?? 0), 0);
  const optimised = optimiseStartingXi(squad, scenario.activeChip ?? activeChip);
  squad = optimised.squad;

  if (scenario.captainId) {
    squad = {
      ...squad,
      starters: squad.starters.map((p) => ({
        ...p,
        isCaptain: p.id === scenario.captainId,
        isVice: false,
      })),
    };
  }

  const rating = computeTeamRating(squad.starters, squad.bench, undefined, scenario.activeChip ?? activeChip);
  const gwXp = estimateSquadXp(squad.starters, squad.bench, scenario.activeChip ?? activeChip) - hit;

  return {
    scenario,
    rating: rating?.score ?? 0,
    gwXp: Math.round(gwXp * 10) / 10,
    next4Xp: next4Xp(squad.starters, squad.bench),
    formation: squad.formation ?? optimised.formation,
  };
}

export function compareScenarios(
  baseSquad: SavedSquad,
  scenarios: WhatIfScenario[],
  activeChip: ChipName | null,
): { baseline: WhatIfResult; results: WhatIfResult[]; best: WhatIfResult | null } {
  const baselineScenario: WhatIfScenario = { id: "current", label: "Current squad", moves: [] };
  const baseline = evaluateScenario(baseSquad, baselineScenario, activeChip);
  const results = scenarios.map((s) => evaluateScenario(baseSquad, s, activeChip));
  const best = results.length
    ? [...results].sort((a, b) => b.gwXp - a.gwXp || b.rating - a.rating)[0]
    : null;
  return { baseline, results, best };
}

export function scenarioDelta(current: WhatIfResult, proposed: WhatIfResult) {
  return {
    gwDelta: Math.round((proposed.gwXp - current.gwXp) * 10) / 10,
    ratingDelta: proposed.rating - current.rating,
    next4Delta: Math.round((proposed.next4Xp - current.next4Xp) * 10) / 10,
  };
}
