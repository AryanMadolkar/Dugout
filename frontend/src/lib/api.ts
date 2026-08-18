import type { Fixture, IngestResult, Overview, Player } from "./types";
import type { SavedSquad, SquadPlayer } from "./dashboard-data";

function apiBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, "");
  }
  if (process.env.VERCEL) {
    return "/api/backend";
  }
  return "http://localhost:8000";
}

const API_URL = apiBaseUrl();

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, { cache: "no-store" });
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

export async function triggerIngest(): Promise<IngestResult> {
  const response = await fetch(`${API_URL}/api/ingest`, { method: "POST" });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(body || `Ingest failed (${response.status})`);
  }
  return response.json() as Promise<IngestResult>;
}

export type ScanApiResult = {
  formation: string | null;
  starters: SquadPlayer[];
  bench: SquadPlayer[];
  unmatched: string[];
  warnings: string[];
  scanMethod: string;
};

function mapScanPlayer(raw: Record<string, unknown>): SquadPlayer {
  return {
    id: String(raw.id),
    fplId: raw.fpl_id as number | undefined,
    name: String(raw.name),
    initials: String(raw.initials),
    club: String(raw.club),
    clubColor: String(raw.clubColor),
    position: raw.position as SquadPlayer["position"],
    price: Number(raw.price),
    opponent: String(raw.opponent),
    home: Boolean(raw.home),
    xp: Number(raw.xp),
    form: Number(raw.form),
    ownership: Number(raw.ownership),
    isCaptain: Boolean(raw.isCaptain),
    isVice: Boolean(raw.isVice),
    row: raw.row as SquadPlayer["row"],
    slot: raw.slot as SquadPlayer["slot"],
    confidence: Number(raw.confidence),
    rawName: raw.rawName ? String(raw.rawName) : undefined,
    nextFixtures: (raw.nextFixtures as SquadPlayer["nextFixtures"]) ?? [],
  };
}

export async function scanSquadImage(file: File): Promise<ScanApiResult> {
  const form = new FormData();
  form.append("file", file);
  const response = await fetch(`${API_URL}/api/scan`, { method: "POST", body: form });
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
  };
  return {
    formation: data.formation,
    starters: data.starters.map(mapScanPlayer),
    bench: data.bench.map(mapScanPlayer),
    unmatched: data.unmatched,
    warnings: data.warnings,
    scanMethod: data.scanMethod,
  };
}

export function scanResultToPending(result: ScanApiResult): SavedSquad & { unmatched: string[]; scanMethod: string } {
  return {
    formation: result.formation,
    starters: result.starters,
    bench: result.bench,
    scannedAt: new Date().toISOString(),
    warnings: result.warnings,
    unmatched: result.unmatched,
    scanMethod: result.scanMethod,
  };
}
