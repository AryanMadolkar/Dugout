"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { SavedSquad, SquadPlayer } from "@/lib/dashboard-data";
import {
  clearPendingScan,
  clearSquad,
  loadPendingScan,
  loadSquad,
  savePendingScan,
  saveSquad,
  type PendingScan,
} from "@/lib/squad-storage";

type Modal = "whatIf" | "makeMove" | "fixPlayer" | null;

type DashboardContextValue = {
  squad: SavedSquad | null;
  pendingScan: PendingScan | null;
  hasSquad: boolean;
  starters: SquadPlayer[];
  bench: SquadPlayer[];
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
  clearScannedSquad: () => void;
};

const DashboardContext = createContext<DashboardContextValue | null>(null);

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const [squad, setSquad] = useState<SavedSquad | null>(null);
  const [pendingScan, setPendingScanState] = useState<PendingScan | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeModal, setActiveModal] = useState<Modal>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setSquad(loadSquad());
    setPendingScanState(loadPendingScan());
    setHydrated(true);
  }, []);

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
  }, [pendingScan]);

  const clearScannedSquad = useCallback(() => {
    clearSquad();
    clearPendingScan();
    setSquad(null);
    setPendingScanState(null);
    setSelectedId(null);
  }, []);

  const value = useMemo(
    () => ({
      squad,
      pendingScan,
      hasSquad: starters.length > 0 || bench.length > 0,
      starters,
      bench,
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
      clearScannedSquad,
    }),
    [
      squad,
      pendingScan,
      starters,
      bench,
      selectedId,
      selectedPlayer,
      allPlayers,
      activeModal,
      openModal,
      closeModal,
      setPendingScan,
      updatePendingScan,
      confirmPendingScan,
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
