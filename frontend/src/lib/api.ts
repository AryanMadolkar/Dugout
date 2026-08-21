import type { Fixture, IngestResult, Overview, Player } from "./types";
import type { SavedSquad, SquadPlayer } from "./dashboard-data";

function withProtocol(url: string): string {
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("/")) return url;
  return `https://${url}`;
}

/** Resolve API base at call time — VERCEL is not available in the browser bundle. */
export function getApiUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");

  if (typeof window !== "undefined") {
    const isLocal =
      window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
    if (isLocal) return envUrl ? withProtocol(envUrl) : "http://localhost:8000";
    if (envUrl && !envUrl.includes("localhost")) return withProtocol(envUrl);
    return "/api/backend";
  }

  if (envUrl && !envUrl.includes("localhost")) return withProtocol(envUrl);
  return envUrl ? withProtocol(envUrl) : "/api/backend";
}

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${getApiUrl()}${path}`, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`API ${path} failed (${response.status})`);
  }
  return response.json() as Promise<T>;
}

export function fetchOverview() {
  return getJson<Overview>("/api/overview");
}

export function fetchPlayers(params?: { sort?: string; limit?: number; q?: string; position?: string }) {
  const search = new URLSearchParams();
  if (params?.sort) search.set("sort", params.sort);
  if (params?.limit) search.set("limit", String(params.limit));
  if (params?.q) search.set("q", params.q);
  if (params?.position) search.set("position", params.position);
  const qs = search.toString();
  return getJson<Player[]>(`/api/players${qs ? `?${qs}` : ""}`);
}

export function fetchFixtures(event?: number) {
  const qs = event != null ? `?event=${event}` : "";
  return getJson<Fixture[]>(`/api/fixtures${qs}`);
}

/** Next N gameweeks of fixtures in one request (avoids empty columns on cold Vercel instances). */
export function fetchUpcomingFixtures(count = 3) {
  return getJson<Fixture[]>(`/api/fixtures?upcoming=${count}`);
}

export type Team = {
  id: number;
  name: string;
  short_name: string;
};

export function fetchTeams() {
  return getJson<Team[]>("/api/teams");
}

export type PlayerHistoryGw = {
  round: number;
  total_points: number;
  minutes: number;
  goals_scored: number;
  assists: number;
  clean_sheets: number;
  bonus: number;
  was_home: boolean | null;
  opponent_team: number | null;
};

export type PlayerHistory = {
  player_id: number;
  form: number;
  games_used: number;
  season_points: number;
  history: PlayerHistoryGw[];
};

export function fetchPlayerHistory(playerId: number) {
  return getJson<PlayerHistory>(`/api/players/${playerId}/history`);
}

export type AiVerdict = {
  headline: string;
  summary: string;
  action: string;
  confidence: number;
  transfers: { out?: string | null; in?: string | null; reason?: string }[];
  captain: { name: string; reason?: string } | null;
  risks: string[];
  source: string;
  gameweek: number | null;
};

export async function fetchAiVerdict(squad: unknown[], activeChip: string | null): Promise<AiVerdict> {
  const response = await fetch(`${getApiUrl()}/api/ai/verdict`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ squad, activeChip }),
  });
  if (!response.ok) {
    let detail = `Gemini verdict failed (${response.status})`;
    try {
      const body = (await response.json()) as { detail?: string };
      if (body.detail) detail = body.detail;
    } catch {
      /* ignore */
    }
    throw new Error(detail);
  }
  return response.json() as Promise<AiVerdict>;
}

export type TransferAdviceMove = {
  out?: string | null;
  in?: string | null;
  outClub?: string | null;
  inClub?: string | null;
  position?: string | null;
  outPrice?: number | null;
  inPrice?: number | null;
  priceDelta?: number | null;
  outXp?: number | null;
  inXp?: number | null;
  reason?: string;
};

export type TransferAdvice = {
  headline: string;
  summary: string;
  action: string;
  confidence: number;
  transfers: TransferAdviceMove[];
  source: string;
  gameweek: number | null;
};

export async function fetchTransferAdvice(
  squad: unknown[],
  activeChip: string | null,
): Promise<TransferAdvice> {
  const response = await fetch(`${getApiUrl()}/api/ai/transfers`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ squad, activeChip }),
  });
  if (!response.ok) {
    let detail = `Transfer advice failed (${response.status})`;
    try {
      const body = (await response.json()) as { detail?: string };
      if (body.detail) detail = body.detail;
    } catch {
      /* ignore */
    }
    throw new Error(detail);
  }
  return response.json() as Promise<TransferAdvice>;
}

export async function triggerIngest(): Promise<IngestResult> {
  const response = await fetch(`${getApiUrl()}/api/ingest`, { method: "POST" });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(body || `Ingest failed (${response.status})`);
  }
  return response.json() as Promise<IngestResult>;
}

export type ScanChips = {
  playing: string | null;
  status: Record<string, string>;
};

export type ScanApiResult = {
  formation: string | null;
  starters: SquadPlayer[];
  bench: SquadPlayer[];
  unmatched: string[];
  warnings: string[];
  scanMethod: string;
  chips?: ScanChips | null;
};

function mapScanPlayer(raw: Record<string, unknown>): SquadPlayer {
  const position = normalizeRow(String(raw.position || "MID"), "MID");
  const row = normalizeRow(String(raw.row || ""), position);
  return {
    id: String(raw.id),
    fplId: raw.fpl_id as number | undefined,
    name: String(raw.name),
    initials: String(raw.initials),
    club: String(raw.club),
    clubColor: String(raw.clubColor),
    position,
    price: Number(raw.price),
    opponent: String(raw.opponent),
    home: Boolean(raw.home),
    xp: Number(raw.xp),
    form: Number(raw.form),
    ppg: raw.ppg != null ? Number(raw.ppg) : undefined,
    ownership: Number(raw.ownership),
    isCaptain: Boolean(raw.isCaptain),
    isVice: Boolean(raw.isVice),
    row,
    slot: raw.slot as SquadPlayer["slot"],
    confidence: Number(raw.confidence),
    rawName: raw.rawName ? String(raw.rawName) : undefined,
    nextFixtures: (raw.nextFixtures as SquadPlayer["nextFixtures"]) ?? [],
  };
}

function normalizeRow(value: string, fallback: SquadPlayer["position"]): SquadPlayer["position"] {
  const key = value.trim().toUpperCase().replace(/\s+/g, "");
  const aliases: Record<string, SquadPlayer["position"]> = {
    GKP: "GKP",
    GK: "GKP",
    G: "GKP",
    DEF: "DEF",
    D: "DEF",
    MID: "MID",
    M: "MID",
    FWD: "FWD",
    ST: "FWD",
    F: "FWD",
    ATT: "FWD",
    FW: "FWD",
    FORWARD: "FWD",
    STRIKER: "FWD",
    DEFENDER: "DEF",
    MIDFIELDER: "MID",
    GOALKEEPER: "GKP",
  };
  return aliases[key] ?? fallback;
}

export async function scanSquadImage(file: File): Promise<ScanApiResult> {
  const form = new FormData();
  form.append("file", file);
  let response: Response;
  try {
    response = await fetch(`${getApiUrl()}/api/scan`, { method: "POST", body: form });
  } catch {
    throw new Error("Could not reach the API. Check that the backend is deployed and try again.");
  }
  if (!response.ok) {
    let detail = `Scan failed (${response.status})`;
    try {
      const body = (await response.json()) as { detail?: string };
      if (body.detail) detail = body.detail;
    } catch {
      /* ignore */
    }
    throw new Error(detail);
  }
  const data = (await response.json()) as {
    formation: string | null;
    starters: Record<string, unknown>[];
    bench: Record<string, unknown>[];
    unmatched: string[];
    warnings: string[];
    scanMethod: string;
    chips?: ScanChips | null;
  };
  return {
    formation: data.formation,
    starters: data.starters.map(mapScanPlayer),
    bench: data.bench.map(mapScanPlayer),
    unmatched: data.unmatched,
    warnings: data.warnings,
    scanMethod: data.scanMethod,
    chips: data.chips ?? null,
  };
}

export function scanResultToPending(
  result: ScanApiResult,
): SavedSquad & { unmatched: string[]; scanMethod: string; chips?: ScanChips | null } {
  return {
    formation: result.formation,
    starters: result.starters,
    bench: result.bench,
    scannedAt: new Date().toISOString(),
    warnings: result.warnings,
    unmatched: result.unmatched,
    scanMethod: result.scanMethod,
    chips: result.chips ?? null,
  };
}
