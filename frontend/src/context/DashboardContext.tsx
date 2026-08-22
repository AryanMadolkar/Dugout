"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ChipAvailability, ChipName, ChipUsageMap, SavedSquad, SquadPlayer } from "@/lib/dashboard-data";
import { DEFAULT_CHIP_USAGE } from "@/lib/dashboard-data";
import { fetchEntrySummary, fetchPlayers } from "@/lib/api";
import type { Player } from "@/lib/types";
import {
  clearActiveChip,
  clearChipUsage,
  clearPendingScan,
  clearSquad,
  loadActiveChip,
  loadBank,
  loadChipUsage,
  loadFplEntryId,
  loadFplLeagueId,
  loadFplRank,
  loadFreeTransfers,
  loadPendingScan,
  loadSquad,
  loadStrategyMode,
  saveActiveChip,
  saveBank,
  saveChipUsage,
  saveFplEntryId,
  saveFplLeagueId,
  saveFplRank,
  saveFreeTransfers,
  savePendingScan,
  saveSquad,
  saveStrategyMode,
  type PendingScan,
} from "@/lib/squad-storage";
import { normalizeChip } from "@/lib/projections";
import { optimiseStartingXi, type OptimiseXiResult } from "@/lib/optimise-xi";
import type { StrategyMode } from "@/lib/strategy-mode";

type Modal = "whatIf" | "makeMove" | "fixPlayer" | null;

function enrichPlayer(player: SquadPlayer, live: Player | undefined): SquadPlayer {
  if (!live) return player;
  return {
    ...player,
    xp: live.ep_next ?? live.ep_this ?? live.points_per_game ?? player.xp,
    form: live.form ?? player.form,
    ppg: live.points_per_game ?? player.ppg,
    ownership: live.selected_by_percent ?? player.ownership,
    price: live.price ?? player.price,
  };
}

function enrichSquad(squad: SavedSquad, liveById: Map<number, Player>): SavedSquad {
  const mapList = (list: SquadPlayer[]) =>
    list.map((p) => enrichPlayer(p, p.fplId != null ? liveById.get(p.fplId) : undefined));
  return {
    ...squad,
    starters: mapList(squad.starters),
    bench: mapList(squad.bench),
  };
}

type DashboardContextValue = {
  hydrated: boolean;
  squad: SavedSquad | null;
  pendingScan: PendingScan | null;
  hasSquad: boolean;
  starters: SquadPlayer[];
  bench: SquadPlayer[];
  chipUsage: ChipUsageMap;
  setChipAvailability: (name: ChipName, status: ChipAvailability) => void;
  playChip: (name: ChipName) => void;
  activeChip: ChipName | null;
  setActiveChip: (chip: ChipName | null) => void;
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  selectedPlayer: SquadPlayer | null;
  allPlayers: SquadPlayer[];
  activeModal: Modal;
  openModal: (modal: Exclude<Modal, null>) => void;
  closeModal: () => void;
  setPendingScan: (scan: PendingScan) => void;
  updatePendingScan: (updater: (prev: PendingScan) => PendingScan) => void;
  confirmPendingScan: () => void;
  /** Re-pick best valid XI from the 15 by Dugout xP. */
  optimiseXi: () => OptimiseXiResult | null;
  strategyMode: StrategyMode;
  setStrategyMode: (mode: StrategyMode) => void;
  bank: number;
  setBank: (bank: number) => void;
  freeTransfers: number;
  setFreeTransfers: (ft: number) => void;
  fplRank: number | null;
  setFplRank: (rank: number | null) => void;
  fplEntryId: number | null;
  setFplEntryId: (id: number | null) => void;
  fplLeagueId: number | null;
  setFplLeagueId: (id: number | null) => void;
  syncFromFpl: () => Promise<void>;
  setCaptain: (playerId: string) => void;
  clearScannedSquad: () => void;
};

const DashboardContext = createContext<DashboardContextValue | null>(null);

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const [squad, setSquad] = useState<SavedSquad | null>(null);
  const [pendingScan, setPendingScanState] = useState<PendingScan | null>(null);
  const [chipUsage, setChipUsage] = useState<ChipUsageMap>(DEFAULT_CHIP_USAGE);
  const [activeChip, setActiveChipState] = useState<ChipName | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeModal, setActiveModal] = useState<Modal>(null);
  const [hydrated, setHydrated] = useState(false);
  const [strategyMode, setStrategyModeState] = useState<StrategyMode>("BALANCED");
  const [bank, setBankState] = useState(0.5);
  const [freeTransfers, setFreeTransfersState] = useState(1);
  const [fplRank, setFplRankState] = useState<number | null>(null);
  const [fplEntryId, setFplEntryIdState] = useState<number | null>(null);
  const [fplLeagueId, setFplLeagueIdState] = useState<number | null>(null);

  useEffect(() => {
    setSquad(loadSquad());
    setPendingScanState(loadPendingScan());
    setChipUsage(loadChipUsage());
    setActiveChipState(loadActiveChip());
    setStrategyModeState(loadStrategyMode());
    setBankState(loadBank());
    setFreeTransfersState(loadFreeTransfers());
    setFplRankState(loadFplRank());
    setFplEntryIdState(loadFplEntryId());
    setFplLeagueIdState(loadFplLeagueId());
    setHydrated(true);
  }, []);

  // Refresh FPL metrics (ep_next, form, ppg) so projections stay current after scan.
  useEffect(() => {
    if (!hydrated || !squad) return;
    let cancelled = false;
    fetchPlayers({ sort: "ep_next", limit: 500 })
      .then((players) => {
        if (cancelled) return;
        const liveById = new Map(players.map((p) => [p.id, p]));
        const next = enrichSquad(squad, liveById);
        setSquad(next);
        saveSquad(next);
      })
      .catch(() => {
        /* keep scanned stats */
      });
    return () => {
      cancelled = true;
    };
    // Only re-run when squad identity changes (scan confirm), not on every enrich.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, squad?.scannedAt]);

  const starters = squad?.starters ?? [];
  const bench = squad?.bench ?? [];
  const allPlayers = useMemo(() => [...starters, ...bench], [starters, bench]);

  useEffect(() => {
    if (!hydrated) return;
    if (selectedId && allPlayers.some((p) => p.id === selectedId)) return;
    setSelectedId(starters[0]?.id ?? null);
  }, [hydrated, allPlayers, starters, selectedId]);

  const selectedPlayer = useMemo(
    () => allPlayers.find((p) => p.id === selectedId) ?? null,
    [allPlayers, selectedId],
  );

  const openModal = useCallback((modal: Exclude<Modal, null>) => setActiveModal(modal), []);
  const closeModal = useCallback(() => setActiveModal(null), []);

  const setPendingScan = useCallback((scan: PendingScan) => {
    savePendingScan(scan);
    setPendingScanState(scan);
  }, []);

  const updatePendingScan = useCallback((updater: (prev: PendingScan) => PendingScan) => {
    setPendingScanState((prev) => {
      if (!prev) return prev;
      const next = updater(prev);
      savePendingScan(next);
      return next;
    });
  }, []);

  const confirmPendingScan = useCallback(() => {
    if (!pendingScan) return;
    const confirmed: SavedSquad = {
      formation: pendingScan.formation,
      starters: pendingScan.starters,
      bench: pendingScan.bench,
      scannedAt: pendingScan.scannedAt,
      warnings: pendingScan.warnings,
    };
    saveSquad(confirmed);
    clearPendingScan();
    setSquad(confirmed);
    setPendingScanState(null);
    setSelectedId(confirmed.starters[0]?.id ?? null);

    // Apply chip info detected from the screenshot (one active chip per GW).
    // Do not treat scan "unavailable" as used — backend maps that to unknown; only apply used/available.
    const detected = pendingScan.chips;
    if (detected?.status) {
      setChipUsage((prev) => {
        const next = { ...prev };
        for (const name of Object.keys(DEFAULT_CHIP_USAGE) as ChipName[]) {
          const val = String(detected.status[name] || "").toLowerCase();
          if (val === "used" || val === "spent" || val === "played") next[name] = "used";
          else if (val === "available" || val === "unused" || val === "ready") next[name] = "available";
          // unavailable / unknown / anything else → leave previous or unknown (do not mark used)
        }
        saveChipUsage(next);
        return next;
      });
    }
    const playing = normalizeChip(detected?.playing);
    if (playing) {
      saveActiveChip(playing);
      setActiveChipState(playing);
    }

    if (pendingScan.bank != null) {
      saveBank(pendingScan.bank);
      setBankState(pendingScan.bank);
    }
    if (pendingScan.freeTransfers != null) {
      saveFreeTransfers(pendingScan.freeTransfers);
      setFreeTransfersState(pendingScan.freeTransfers);
    }
    if (pendingScan.entryId != null) {
      saveFplEntryId(pendingScan.entryId);
      setFplEntryIdState(pendingScan.entryId);
    }
    if (pendingScan.leagueId != null) {
      saveFplLeagueId(pendingScan.leagueId);
      setFplLeagueIdState(pendingScan.leagueId);
    }
  }, [pendingScan]);

  const setChipAvailability = useCallback((name: ChipName, status: ChipAvailability) => {
    setChipUsage((prev) => {
      const next = { ...prev, [name]: status };
      saveChipUsage(next);
      return next;
    });
    if (status === "used") {
      // Already spent this season — clear from this GW so projections drop BB/TC.
      setActiveChipState((current) => {
        if (current !== name) return current;
        saveActiveChip(null);
        return null;
      });
      return;
    }
  }, []);

  const playChip = useCallback((name: ChipName) => {
    setChipUsage((prev) => {
      const next = { ...prev, [name]: "available" as ChipAvailability };
      saveChipUsage(next);
      return next;
    });
    saveActiveChip(name);
    setActiveChipState(name);
  }, []);

  const setActiveChip = useCallback((chip: ChipName | null) => {
    const next = normalizeChip(chip);
    saveActiveChip(next);
    setActiveChipState(next);
  }, []);

  const setStrategyMode = useCallback((mode: StrategyMode) => {
    saveStrategyMode(mode);
    setStrategyModeState(mode);
  }, []);

  const setBank = useCallback((next: number) => {
    saveBank(next);
    setBankState(next);
  }, []);

  const setFreeTransfers = useCallback((ft: number) => {
    saveFreeTransfers(ft);
    setFreeTransfersState(ft);
  }, []);

  const setFplRank = useCallback((rank: number | null) => {
    saveFplRank(rank);
    setFplRankState(rank);
  }, []);

  const setFplEntryId = useCallback((id: number | null) => {
    saveFplEntryId(id);
    setFplEntryIdState(id);
  }, []);

  const setFplLeagueId = useCallback((id: number | null) => {
    saveFplLeagueId(id);
    setFplLeagueIdState(id);
  }, []);

  const syncFromFpl = useCallback(async () => {
    if (fplEntryId == null) return;
    const summary = await fetchEntrySummary(fplEntryId);
    saveBank(summary.bank);
    setBankState(summary.bank);
    saveFreeTransfers(summary.freeTransfers);
    setFreeTransfersState(summary.freeTransfers);
    if (summary.rank != null) {
      saveFplRank(summary.rank);
      setFplRankState(summary.rank);
    }
    if (summary.defaultLeagueId != null && fplLeagueId == null) {
      saveFplLeagueId(summary.defaultLeagueId);
      setFplLeagueIdState(summary.defaultLeagueId);
    }
  }, [fplEntryId, fplLeagueId]);

  useEffect(() => {
    if (!hydrated || fplEntryId == null) return;
    syncFromFpl().catch(() => {
      /* keep stored values */
    });
  }, [hydrated, fplEntryId]); // eslint-disable-line react-hooks/exhaustive-deps

  const setCaptain = useCallback(
    (playerId: string) => {
      if (!squad) return;
      const next: SavedSquad = {
        ...squad,
        starters: squad.starters.map((p) => ({
          ...p,
          isCaptain: p.id === playerId,
          isVice: false,
        })),
      };
      const vice = [...next.starters].sort((a, b) => b.xp - a.xp).find((p) => p.id !== playerId);
      if (vice) {
        next.starters = next.starters.map((p) => ({
          ...p,
          isVice: p.id === vice.id,
        }));
      }
      saveSquad(next);
      setSquad(next);
    },
    [squad],
  );

  const optimiseXi = useCallback((): OptimiseXiResult | null => {
    if (!squad) return null;
    const result = optimiseStartingXi(squad, activeChip);
    if (!result.changed) return result;
    saveSquad(result.squad);
    setSquad(result.squad);
    const stillSelected =
      selectedId &&
      [...result.squad.starters, ...result.squad.bench].some((p) => p.id === selectedId);
    if (!stillSelected) {
      setSelectedId(result.squad.starters[0]?.id ?? null);
    }
    return result;
  }, [squad, activeChip, selectedId]);

  const clearScannedSquad = useCallback(() => {
    clearSquad();
    clearPendingScan();
    clearChipUsage();
    clearActiveChip();
    setSquad(null);
    setPendingScanState(null);
    setChipUsage({ ...DEFAULT_CHIP_USAGE });
    setActiveChipState(null);
    setSelectedId(null);
  }, []);

  const value = useMemo(
    () => ({
      hydrated,
      squad,
      pendingScan,
      hasSquad: starters.length > 0 || bench.length > 0,
      starters,
      bench,
      chipUsage,
      setChipAvailability,
      playChip,
      activeChip,
      setActiveChip,
      selectedId,
      setSelectedId,
      selectedPlayer,
      allPlayers,
      activeModal,
      openModal,
      closeModal,
      setPendingScan,
      updatePendingScan,
      confirmPendingScan,
      optimiseXi,
      strategyMode,
      setStrategyMode,
      bank,
      setBank,
      freeTransfers,
      setFreeTransfers,
      fplRank,
      setFplRank,
      fplEntryId,
      setFplEntryId,
      fplLeagueId,
      setFplLeagueId,
      syncFromFpl,
      setCaptain,
      clearScannedSquad,
    }),
    [
      hydrated,
      squad,
      pendingScan,
      starters,
      bench,
      chipUsage,
      setChipAvailability,
      playChip,
      activeChip,
      setActiveChip,
      selectedId,
      selectedPlayer,
      allPlayers,
      activeModal,
      openModal,
      closeModal,
      setPendingScan,
      updatePendingScan,
      confirmPendingScan,
      optimiseXi,
      strategyMode,
      setStrategyMode,
      bank,
      freeTransfers,
      fplRank,
      setBank,
      setFreeTransfers,
      setFplRank,
      fplEntryId,
      fplLeagueId,
      syncFromFpl,
      setFplEntryId,
      setFplLeagueId,
      setCaptain,
      clearScannedSquad,
    ],
  );

  return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>;
}

export function useDashboard() {
  const ctx = useContext(DashboardContext);
  if (!ctx) throw new Error("useDashboard must be used within DashboardProvider");
  return ctx;
}
