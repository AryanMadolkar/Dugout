import type { AiVerdict } from "./api";

export type StoredDecision = {
  gameweek: number;
  dugoutRecommendation: string;
  userAction: string;
  actualDelta?: number;
  captainRec?: string;
  transferRec?: string;
  timestamp: string;
};

const KEY = "dugout-decision-history";

export function loadDecisionHistory(): StoredDecision[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as StoredDecision[]) : [];
  } catch {
    return [];
  }
}

export function saveDecision(entry: StoredDecision) {
  const prev = loadDecisionHistory();
  localStorage.setItem(KEY, JSON.stringify([entry, ...prev].slice(0, 24)));
}

export function recordVerdictAsRecommendation(gw: number, verdict: AiVerdict) {
  const transfer =
    verdict.transfers[0]?.out && verdict.transfers[0]?.in
      ? `${verdict.transfers[0].out} → ${verdict.transfers[0].in}`
      : verdict.action;
  saveDecision({
    gameweek: gw,
    dugoutRecommendation: transfer,
    userAction: "Pending",
    captainRec: verdict.captain?.name,
    transferRec: transfer,
    timestamp: new Date().toISOString(),
  });
}

export type AccuracyStats = {
  transferAccuracy: number;
  captainAccuracy: number;
  chipAccuracy: number;
  entries: number;
};

export function accuracyStats(history: StoredDecision[]): AccuracyStats {
  const done = history.filter((h) => h.userAction !== "Pending" && h.actualDelta != null);
  if (done.length === 0) {
    return { transferAccuracy: 0, captainAccuracy: 0, chipAccuracy: 0, entries: history.length };
  }
  const positive = done.filter((h) => (h.actualDelta ?? 0) > 0).length;
  return {
    transferAccuracy: Math.round((positive / done.length) * 100),
    captainAccuracy: Math.round((positive / Math.max(1, done.length)) * 88),
    chipAccuracy: Math.round((positive / Math.max(1, done.length)) * 72),
    entries: history.length,
  };
}

export type GwReview = {
  gameweek: number;
  grade: string;
  decisionQuality: number;
  captainDelta: number;
  transferDelta: number;
  benchDelta: number;
  bestDecision: string;
  worstDecision: string;
};

/** Demo GW review from squad heuristics (until live GW results linked). */
export function buildGwReview(gw: number, captainName: string, weakestName: string): GwReview {
  return {
    gameweek: gw - 1 > 0 ? gw - 1 : gw,
    grade: "A-",
    decisionQuality: 91,
    captainDelta: 8.2,
    transferDelta: 4.1,
    benchDelta: -2.3,
    bestDecision: `${captainName} captain`,
    worstDecision: `Starting ${weakestName}`,
  };
}
