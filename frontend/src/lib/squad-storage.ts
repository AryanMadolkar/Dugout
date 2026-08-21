import type { ChipUsageMap, SavedSquad, SquadPlayer } from "./dashboard-data";
import { DEFAULT_CHIP_USAGE } from "./dashboard-data";
import { estimateSquadXp } from "./projections";

const SQUAD_KEY = "fpl-scanned-squad";
const PENDING_KEY = "fpl-pending-scan";
const CHIPS_KEY = "fpl-chip-usage";

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

export function loadChipUsage(): ChipUsageMap {
  if (typeof window === "undefined") return { ...DEFAULT_CHIP_USAGE };
  try {
    const raw = sessionStorage.getItem(CHIPS_KEY);
    if (!raw) return { ...DEFAULT_CHIP_USAGE };
    return { ...DEFAULT_CHIP_USAGE, ...(JSON.parse(raw) as Partial<ChipUsageMap>) };
  } catch {
    return { ...DEFAULT_CHIP_USAGE };
  }
}

export function saveChipUsage(usage: ChipUsageMap) {
  sessionStorage.setItem(CHIPS_KEY, JSON.stringify(usage));
}

export function clearChipUsage() {
  sessionStorage.removeItem(CHIPS_KEY);
}

export function projectedPoints(starters: SquadPlayer[]): number {
  return estimateSquadXp(starters);
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
