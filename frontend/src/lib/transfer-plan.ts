import type { SquadPlayer } from "./dashboard-data";
import type { TransferAdviceMove } from "./api";

export type TransferPlanStep = {
  gameweek: number;
  action: string;
  move: TransferAdviceMove | null;
  projectedGain: number;
  bankAfter: number;
  reason: string;
};

export type TransferPlan = {
  steps: TransferPlanStep[];
  totalGain4Gw: number;
  wildcardWindow: number | null;
};

/** Build a 4–6 GW transfer roadmap from current advice + squad state. */
export function buildTransferPlan(
  currentGw: number,
  moves: TransferAdviceMove[],
  bank: number,
  freeTransfers: number,
): TransferPlan {
  const steps: TransferPlanStep[] = [];
  let runningBank = bank;
  let ft = freeTransfers;
  let totalGain = 0;

  const primary = moves[0];
  if (primary?.out && primary?.in) {
    const delta = (primary.inXp ?? 0) - (primary.outXp ?? 0);
    const priceDelta = primary.priceDelta ?? 0;
    runningBank -= priceDelta;
    totalGain += delta;
    steps.push({
      gameweek: currentGw,
      action: ft >= 1 ? "TRANSFER" : "TRANSFER (-4)",
      move: primary,
      projectedGain: Math.round(delta * 10) / 10,
      bankAfter: Math.round(runningBank * 10) / 10,
      reason: primary.reason ?? "Highest projected gain this window.",
    });
    ft = Math.max(0, ft - 1);
  } else {
    steps.push({
      gameweek: currentGw,
      action: "ROLL",
      move: null,
      projectedGain: 0,
      bankAfter: runningBank,
      reason: "No clear single move — bank a free transfer.",
    });
  }

  for (let i = 1; i <= 4; i++) {
    const gw = currentGw + i;
    ft = Math.min(2, ft + 1);
    if (i === 2 && primary?.in) {
      steps.push({
        gameweek: gw,
        action: "ROLL",
        move: null,
        projectedGain: 0,
        bankAfter: runningBank,
        reason: "Let new signing settle; reassess fixture swing.",
      });
    } else if (i === 3) {
      steps.push({
        gameweek: gw,
        action: "UPGRADE DEF",
        move: null,
        projectedGain: 2.4,
        bankAfter: runningBank,
        reason: "Target a defender with a green run if bank allows.",
      });
      totalGain += 2.4;
    } else if (i === 4) {
      const wcGw = currentGw + 4;
      steps.push({
        gameweek: gw,
        action: "WILDCARD WINDOW",
        move: null,
        projectedGain: 8,
        bankAfter: runningBank,
        reason: `Consider Wildcard around GW${wcGw} if fixture pain stacks up.`,
      });
    } else {
      steps.push({
        gameweek: gw,
        action: "ROLL",
        move: null,
        projectedGain: 0,
        bankAfter: runningBank,
        reason: "Hold structure unless injury or price change forces a move.",
      });
    }
  }

  return {
    steps,
    totalGain4Gw: Math.round(totalGain * 10) / 10,
    wildcardWindow: currentGw + 4,
  };
}

export function weakestOutfield(starters: SquadPlayer[]): SquadPlayer | null {
  if (starters.length === 0) return null;
  const outfield = starters.filter((p) => p.position !== "GKP");
  return [...outfield].sort((a, b) => (a.xp || 0) - (b.xp || 0))[0] ?? null;
}
