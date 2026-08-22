import type { ManagerContext } from "./api";
import type { SquadPlayer } from "./dashboard-data";
import type { StrategyMode } from "./strategy-mode";

export function squadToApiPayload(players: SquadPlayer[]) {
  return players.map((p) => ({
    id: p.id,
    fplId: p.fplId,
    name: p.name,
    club: p.club,
    position: p.position,
    price: p.price,
    xp: p.xp,
    form: p.form,
    ownership: p.ownership,
    isCaptain: p.isCaptain,
    isVice: p.isVice,
    slot: p.slot,
  }));
}

export function managerAdviceContext(input: {
  bank: number;
  freeTransfers: number;
  fplRank: number | null;
  strategyMode: StrategyMode;
}): ManagerContext {
  return {
    bank: input.bank,
    freeTransfers: input.freeTransfers,
    fplRank: input.fplRank,
    strategyMode: input.strategyMode,
  };
}
