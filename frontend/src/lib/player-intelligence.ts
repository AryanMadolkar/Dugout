import type { SquadPlayer } from "./dashboard-data";
import type { Player } from "./types";
import { estimatePlayerXp } from "./projections";
import { optimisePickScore, playerGwFdr, playerRunFdr } from "./optimise-xi";

export type RotationRisk = "LOW" | "MEDIUM" | "HIGH";
export type PlayerVerdict = "BUY" | "HOLD" | "SELL";

export type PriceChangeForecast = {
  risePct: number;
  fallPct: number;
  direction: "rise" | "fall" | "stable";
  nextPrice: number;
  note: string;
};

function clamp(n: number, lo = 0, hi = 100) {
  return Math.min(hi, Math.max(lo, n));
}

/** Estimated start probability for this GW (0–100). */
export function startProbability(player: SquadPlayer, live?: Player | null): number {
  const cop = live?.chance_of_playing_this_round;
  if (cop != null && cop > 0) return clamp(cop);

  const status = live?.status ?? "a";
  if (status === "i" || status === "s") return 25;
  if (status === "d") return 55;

  const news = (live?.news ?? "").toLowerCase();
  if (news.includes("doubt") || news.includes("knock")) return 62;
  if (news.includes("out") || news.includes("injur")) return 35;

  const form = player.form || player.ppg || 0;
  if (form >= 6) return 96;
  if (form >= 4) return 91;
  if (form >= 2.5) return 82;
  if (form > 0) return 72;
  return player.price >= 8 ? 78 : player.price >= 5.5 ? 68 : 58;
}

export function rotationRisk(player: SquadPlayer, live?: Player | null): RotationRisk {
  const sp = startProbability(player, live);
  if (sp >= 85) return "LOW";
  if (sp >= 65) return "MEDIUM";
  return "HIGH";
}

export function goalInvolvementPer90(player: SquadPlayer, live?: Player | null): number {
  const mins = live?.minutes ?? 0;
  if (mins < 90) {
    const form = player.form || player.ppg || 0;
    return Math.round((form / 8) * 100) / 100;
  }
  const g = (live?.goals_scored ?? 0) + (live?.assists ?? 0);
  return Math.round((g / (mins / 90)) * 100) / 100;
}

export function priceChangeForecast(player: SquadPlayer, live?: Player | null): PriceChangeForecast {
  const own = player.ownership;
  const form = player.form || player.ppg || 0;
  const xp = estimatePlayerXp(player);

  let risePct = 15;
  if (own >= 40 && form >= 4) risePct += 45;
  else if (own >= 25 && form >= 3) risePct += 35;
  else if (own >= 15 && xp >= 6) risePct += 28;
  else if (form >= 5) risePct += 22;
  if (player.price >= 12) risePct -= 12;

  let fallPct = 12;
  if (form < 2 && own >= 20) fallPct += 30;
  if (live?.status === "i" || live?.status === "s") fallPct += 25;

  risePct = clamp(risePct, 3, 92);
  fallPct = clamp(fallPct, 3, 85);

  let direction: PriceChangeForecast["direction"] = "stable";
  if (risePct >= 55 && risePct > fallPct + 10) direction = "rise";
  else if (fallPct >= 50 && fallPct > risePct + 8) direction = "fall";

  const delta = direction === "rise" ? 0.1 : direction === "fall" ? -0.1 : 0;
  const nextPrice = Math.round((player.price + delta) * 10) / 10;

  const note =
    direction === "rise"
      ? `${risePct}% chance of rise · act before £${nextPrice.toFixed(1)}m`
      : direction === "fall"
        ? `${fallPct}% chance of fall · budget may improve if you wait`
        : "Price likely stable this window";

  return { risePct, fallPct, direction, nextPrice, note };
}

/** Single-player Dugout Score (1–99). */
export function playerDugoutScore(player: SquadPlayer, live?: Player | null): number {
  const pick = optimisePickScore(player);
  const sp = startProbability(player, live) / 100;
  const gwFdr = playerGwFdr(player);
  const runFdr = playerRunFdr(player, 3);
  const fixture = clamp(((5 - gwFdr) / 4) * 70 + ((5 - runFdr) / 4) * 30);
  const value = clamp((pick / Math.max(player.price, 4)) * 22);
  const form = clamp(((player.form || player.ppg || pick / 2) / 7) * 100);
  const mins = sp * 100;

  return clamp(Math.round(0.28 * pick * 6 + 0.22 * fixture + 0.18 * value + 0.17 * form + 0.15 * mins));
}

export function playerVerdict(
  player: SquadPlayer,
  owned: boolean,
  live?: Player | null,
): { verdict: PlayerVerdict; reason: string } {
  const score = playerDugoutScore(player, live);
  const sp = startProbability(player, live);
  const fdr = playerGwFdr(player);
  const risk = rotationRisk(player, live);

  if (owned) {
    if (sp < 50 || risk === "HIGH") {
      return { verdict: "SELL", reason: `Start probability ${sp}% with ${risk.toLowerCase()} rotation risk.` };
    }
    if (fdr >= 4.5 && score < 55) {
      return { verdict: "SELL", reason: "Tough fixture run and below-par Dugout score for price." };
    }
    if (score >= 75) {
      return { verdict: "HOLD", reason: "Strong score, minutes and fixtures — keep." };
    }
    return { verdict: "HOLD", reason: "No urgent sell signal; monitor minutes before deadline." };
  }

  if (score >= 78 && sp >= 80 && fdr <= 3) {
    return { verdict: "BUY", reason: "Elite score with reliable minutes and a green fixture." };
  }
  if (score >= 65 && fdr <= 2.5) {
    return { verdict: "BUY", reason: "Fixture swing player with upside over the next run." };
  }
  return { verdict: "HOLD", reason: "Watchlist only — wait for clearer minutes or fixture confirmation." };
}

export function differentialEdge(player: SquadPlayer, live?: Player | null): number {
  const score = playerDugoutScore(player, live);
  const own = Math.max(player.ownership, 1);
  return Math.round(((score / own) * 10) * 10) / 10;
}
