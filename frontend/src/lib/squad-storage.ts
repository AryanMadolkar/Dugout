import type { SavedSquad, SquadPlayer } from "./dashboard-data";

const SQUAD_KEY = "fpl-scanned-squad";
const PENDING_KEY = "fpl-pending-scan";

export type PendingScan = SavedSquad & {
  unmatched: string[];
  scanMethod?: string;
};

export function loadSquad(): SavedSquad | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(SQUAD_KEY);
    return raw ? (JSON.parse(raw) as SavedSquad) : null;
  } catch {
    return null;
  }
}

export function saveSquad(squad: SavedSquad) {
  sessionStorage.setItem(SQUAD_KEY, JSON.stringify(squad));
}

export function clearSquad() {
  sessionStorage.removeItem(SQUAD_KEY);
}

export function loadPendingScan(): PendingScan | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(PENDING_KEY);
    return raw ? (JSON.parse(raw) as PendingScan) : null;
  } catch {
    return null;
  }
}

export function savePendingScan(scan: PendingScan) {
  sessionStorage.setItem(PENDING_KEY, JSON.stringify(scan));
}

export function clearPendingScan() {
  sessionStorage.removeItem(PENDING_KEY);
}

export function projectedPoints(starters: SquadPlayer[]): number {
  return starters.reduce((sum, p) => {
    const mult = p.isCaptain ? 2 : 1;
    return sum + p.xp * mult;
  }, 0);
}

export function formatScanTime(iso: string): string {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}
