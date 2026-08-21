import type { SquadPlayer } from "./dashboard-data";

const POSITION_FLOOR: Record<SquadPlayer["position"], number> = {
  GKP: 3.4,
  DEF: 3.8,
  MID: 4.4,
  FWD: 5.0,
};

function round1(n: number) {
  return Math.round(n * 10) / 10;
}

/**
 * Dugout GW expected points.
 * Blends FPL ep_next with form / PPG, then adjusts for fixture difficulty and premium price.
 * Early-season ep_next alone is often too low — we lift toward position baselines.
 */
export function estimatePlayerXp(player: SquadPlayer): number {
  const ep = Number.isFinite(player.xp) ? player.xp : 0;
  const form = Number.isFinite(player.form) ? player.form : 0;
  const ppg = Number.isFinite(player.ppg) ? (player.ppg as number) : 0;
  const fdr = player.nextFixtures[0]?.fdr ?? 3;
  const floor = POSITION_FLOOR[player.position];

  let core: number;
  if (form > 0 && ppg > 0) {
    core = 0.3 * ep + 0.4 * form + 0.3 * ppg;
  } else if (form > 0) {
    core = 0.35 * ep + 0.65 * form;
  } else if (ppg > 0) {
    core = 0.4 * ep + 0.6 * ppg;
  } else {
    // Official EP only (typical early season) — blend up toward a playable baseline
    core = ep * 1.1 + floor * 0.45;
  }

  // Never sit far below the position floor when the player is a starter-quality price
  if (player.price >= 5.5) {
    core = Math.max(core, floor * 0.9);
  }

  const fixtureAdj = (3 - fdr) * 0.45;
  const priceBonus = player.price >= 12 ? 0.8 : player.price >= 9 ? 0.45 : player.price >= 7 ? 0.2 : 0;
  const ownBonus = player.ownership >= 40 ? 0.2 : 0;

  return round1(Math.min(18, Math.max(1.5, core + fixtureAdj + priceBonus + ownBonus)));
}

/** XI projected points with captain ×2 (vice not doubled). */
export function estimateSquadXp(starters: SquadPlayer[]): number {
  return round1(
    starters.reduce((sum, p) => sum + estimatePlayerXp(p) * (p.isCaptain ? 2 : 1), 0),
  );
}
