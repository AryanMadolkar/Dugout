import type { ChipName, ChipUsageMap, SavedSquad, SquadPlayer } from "./dashboard-data";
import { CHIP_NAMES, DEFAULT_CHIP_USAGE } from "./dashboard-data";
import { estimateSquadXp } from "./projections";

const SQUAD_KEY = "fpl-scanned-squad";
const PENDING_KEY = "fpl-pending-scan";
const CHIPS_KEY = "fpl-chip-usage";
const ACTIVE_CHIP_KEY = "fpl-active-chip";
const STRATEGY_KEY = "dugout-strategy";
const BANK_KEY = "dugout-bank";
const FT_KEY = "dugout-free-transfers";
const RANK_KEY = "dugout-rank";
const ENTRY_ID_KEY = "dugout-fpl-entry-id";
const LEAGUE_ID_KEY = "dugout-fpl-league-id";

export type PendingScan = SavedSquad & {
  unmatched: string[];
  scanMethod?: string;
  chips?: {
    playing: string | null;
    status: Record<string, string>;
  } | null;
  bank?: number;
  freeTransfers?: number;
  teamValue?: number;
  entryId?: number;
  leagueId?: number;
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

export function loadActiveChip(): ChipName | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(ACTIVE_CHIP_KEY);
    if (!raw) return null;
    if ((CHIP_NAMES as readonly string[]).includes(raw)) return raw as ChipName;
    const lower = raw.toLowerCase();
    if (lower === "tc" || lower === "triple captain") return "Triple Captain";
    if (lower === "bb" || lower === "bench boost") return "Bench Boost";
    if (lower === "fh" || lower === "free hit") return "Free Hit";
    if (lower === "wc" || lower === "wildcard") return "Wildcard";
    return null;
  } catch {
    return null;
  }
}

export function saveActiveChip(chip: ChipName | null) {
  if (!chip) {
    sessionStorage.removeItem(ACTIVE_CHIP_KEY);
    return;
  }
  sessionStorage.setItem(ACTIVE_CHIP_KEY, chip);
}

export function clearActiveChip() {
  sessionStorage.removeItem(ACTIVE_CHIP_KEY);
}

export function projectedPoints(
  starters: SquadPlayer[],
  bench: SquadPlayer[] = [],
  activeChip: ChipName | null = null,
): number {
  return estimateSquadXp(starters, bench, activeChip);
}

import type { StrategyMode } from "./strategy-mode";

export function loadStrategyMode(): StrategyMode {
  if (typeof window === "undefined") return "BALANCED";
  try {
    const raw = sessionStorage.getItem(STRATEGY_KEY);
    if (raw === "SAFE" || raw === "AGGRESSIVE" || raw === "BALANCED") return raw;
    return "BALANCED";
  } catch {
    return "BALANCED";
  }
}

export function saveStrategyMode(mode: StrategyMode) {
  sessionStorage.setItem(STRATEGY_KEY, mode);
}

export function loadBank(): number {
  if (typeof window === "undefined") return 0.5;
  try {
    const raw = sessionStorage.getItem(BANK_KEY);
    return raw ? Number(raw) : 0.5;
  } catch {
    return 0.5;
  }
}

export function saveBank(bank: number) {
  sessionStorage.setItem(BANK_KEY, String(bank));
}

export function loadFreeTransfers(): number {
  if (typeof window === "undefined") return 1;
  try {
    const raw = sessionStorage.getItem(FT_KEY);
    return raw ? Number(raw) : 1;
  } catch {
    return 1;
  }
}

export function saveFreeTransfers(ft: number) {
  sessionStorage.setItem(FT_KEY, String(ft));
}

export function loadFplRank(): number | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(RANK_KEY);
    if (!raw) return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

export function saveFplRank(rank: number | null) {
  if (rank == null) {
    sessionStorage.removeItem(RANK_KEY);
    return;
  }
  sessionStorage.setItem(RANK_KEY, String(rank));
}

export function loadFplEntryId(): number | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(ENTRY_ID_KEY);
    if (!raw) return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

export function saveFplEntryId(id: number | null) {
  if (id == null) {
    sessionStorage.removeItem(ENTRY_ID_KEY);
    return;
  }
  sessionStorage.setItem(ENTRY_ID_KEY, String(id));
}

export function loadFplLeagueId(): number | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(LEAGUE_ID_KEY);
    if (!raw) return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

export function saveFplLeagueId(id: number | null) {
  if (id == null) {
    sessionStorage.removeItem(LEAGUE_ID_KEY);
    return;
  }
  sessionStorage.setItem(LEAGUE_ID_KEY, String(id));
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
