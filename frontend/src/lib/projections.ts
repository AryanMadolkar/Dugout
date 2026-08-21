import type { ChipName, SquadPlayer } from "./dashboard-data";

const POSITION_FLOOR: Record<SquadPlayer["position"], number> = {
  GKP: 3.4,
  DEF: 3.8,
  MID: 4.4,
  FWD: 5.0,
};

/** Chips selectable for this GW (only one at a time). */
export const PLAYABLE_CHIPS: ChipName[] = ["Wildcard", "Free Hit", "Bench Boost", "Triple Captain"];

/** Chips that change same-squad GW projected points. */
export const PROJECTION_CHIPS: ChipName[] = ["Triple Captain", "Bench Boost"];

function round1(n: number) {
  return Math.round(n * 10) / 10;
}

/** Accept common aliases from UI / scan / storage. */
export function normalizeChip(chip: ChipName | string | null | undefined): ChipName | null {
  if (!chip) return null;
  const raw = String(chip).trim();
  const lower = raw.toLowerCase().replace(/[_-]+/g, " ");
  if (lower === "triple captain" || lower === "tc") return "Triple Captain";
  if (lower === "bench boost" || lower === "bb") return "Bench Boost";
  if (lower === "free hit" || lower === "fh") return "Free Hit";
  if (lower === "wildcard" || lower === "wc") return "Wildcard";
  if ((PLAYABLE_CHIPS as readonly string[]).includes(raw)) return raw as ChipName;
  return null;
}

/**
 * Dugout GW expected points (single-player, before captain multiplier).
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
    core = ep * 1.1 + floor * 0.45;
  }

  if (player.price >= 5.5) {
    core = Math.max(core, floor * 0.9);
  }

  const fixtureAdj = (3 - fdr) * 0.45;
  const priceBonus = player.price >= 12 ? 0.8 : player.price >= 9 ? 0.45 : player.price >= 7 ? 0.2 : 0;
  const ownBonus = player.ownership >= 40 ? 0.2 : 0;

  return round1(Math.min(18, Math.max(1.5, core + fixtureAdj + priceBonus + ownBonus)));
}

/** Captain ×2 by default; ×3 with Triple Captain. */
export function captainMultiplier(activeChip: ChipName | null): number {
  return normalizeChip(activeChip) === "Triple Captain" ? 3 : 2;
}

/** Who receives the captain multiplier (scan C, else highest xP starter). */
export function resolveCaptainId(starters: SquadPlayer[]): string | null {
  const marked = starters.find((p) => p.isCaptain);
  if (marked) return marked.id;
  if (starters.length === 0) return null;
  return [...starters].sort((a, b) => estimatePlayerXp(b) - estimatePlayerXp(a))[0]?.id ?? null;
}

/** Effective GW xP for display — applies C×2 / TC×3 for the captain. */
export function estimatePlayerGwXp(
  player: SquadPlayer,
  activeChip: ChipName | null = null,
  captainId: string | null = player.isCaptain ? player.id : null,
): number {
  const base = estimatePlayerXp(player);
  if (captainId && player.id === captainId) {
    return round1(base * captainMultiplier(activeChip));
  }
  return base;
}

/**
 * Squad projected points for the GW.
 * - Captain always counts ×2 (or ×3 with Triple Captain)
 * - Bench Boost adds full bench (no captain multiplier on bench)
 */
export function estimateSquadXp(
  starters: SquadPlayer[],
  bench: SquadPlayer[] = [],
  activeChip: ChipName | null = null,
): number {
  const chip = normalizeChip(activeChip);
  const captainId = resolveCaptainId(starters);
  let total = starters.reduce((sum, p) => sum + estimatePlayerGwXp(p, chip, captainId), 0);

  if (chip === "Bench Boost") {
    total += bench.reduce((sum, p) => sum + estimatePlayerXp(p), 0);
  }

  return round1(total);
}

export function projectionChipLabel(activeChip: ChipName | null): string {
  const chip = normalizeChip(activeChip);
  if (chip === "Triple Captain") return "XI + captain ×3";
  if (chip === "Bench Boost") return "XI + captain ×2 + bench";
  if (chip === "Free Hit") return "XI + captain ×2 · Free Hit";
  if (chip === "Wildcard") return "XI + captain ×2 · Wildcard";
  return "XI + captain ×2";
}
