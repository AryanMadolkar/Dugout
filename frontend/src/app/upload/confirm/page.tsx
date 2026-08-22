"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { AppLayout } from "@/components/v5/AppLayout";
import { useDashboard } from "@/context/DashboardContext";
import { fetchEntrySummary, fetchPlayers } from "@/lib/api";
import type { SquadPlayer } from "@/lib/dashboard-data";
import { CLUB_COLORS } from "@/lib/dashboard-data";

export default function UploadConfirmPage() {
  const router = useRouter();
  const { hydrated, hasSquad, pendingScan, updatePendingScan, confirmPendingScan } = useDashboard();
  const [fixId, setFixId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<SquadPlayer[]>([]);
  const [syncing, setSyncing] = useState(false);
  const fixSectionRef = useRef<HTMLDivElement>(null);
  const fixInputRef = useRef<HTMLInputElement>(null);

  // After confirm, pendingScan is cleared — send to home, not back to upload.
  useEffect(() => {
    if (!hydrated) return;
    if (pendingScan) return;
    router.replace(hasSquad ? "/" : "/upload");
  }, [hydrated, pendingScan, hasSquad, router]);

  const detected = useMemo(
    () => (pendingScan ? [...pendingScan.starters, ...pendingScan.bench] : []),
    [pendingScan],
  );

  const lowConfidence = detected.filter((p) => (p.confidence ?? 100) < 80);

  useEffect(() => {
    if (!fixId || search.length < 2) {
      setSearchResults([]);
      return;
    }
    let cancelled = false;
    fetchPlayers({ q: search, limit: 8 })
      .then((players) => {
        if (cancelled) return;
        setSearchResults(
          players.map((p) => ({
            id: String(p.id),
            fplId: p.id,
            name: p.web_name,
            initials: p.web_name.slice(0, 3).toUpperCase(),
            club: p.team_short_name ?? "?",
            clubColor: CLUB_COLORS[p.team_short_name ?? ""] ?? "#888888",
            position: p.position as SquadPlayer["position"],
            price: p.price,
            opponent: "—",
            home: true,
            xp: p.ep_next ?? p.points_per_game ?? 0,
            form: p.form ?? 0,
            ppg: p.points_per_game ?? 0,
            ownership: p.selected_by_percent ?? 0,
            row: p.position as SquadPlayer["row"],
            nextFixtures: [],
            confidence: 100,
          })),
        );
      })
      .catch(() => setSearchResults([]));
    return () => {
      cancelled = true;
    };
  }, [fixId, search]);

  // After choosing Fix, bring the replace panel into view (list can be long).
  useEffect(() => {
    if (!fixId) return;
    const frame = requestAnimationFrame(() => {
      fixSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      fixInputRef.current?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [fixId]);

  if (!hydrated || !pendingScan) {
    return (
      <AppLayout>
        <p className="text-[13px] text-[var(--text-secondary)]">
          {hasSquad ? "Opening home…" : "Loading scan…"}
        </p>
      </AppLayout>
    );
  }

  const removePlayer = (id: string) => {
    updatePendingScan((prev) => ({
      ...prev,
      starters: prev.starters.filter((p) => p.id !== id),
      bench: prev.bench.filter((p) => p.id !== id),
    }));
    if (fixId === id) setFixId(null);
  };

  const replacePlayer = (oldId: string, replacement: SquadPlayer) => {
    updatePendingScan((prev) => {
      const mapSlot = (list: SquadPlayer[]) =>
        list.map((p) =>
          p.id === oldId
            ? {
                ...replacement,
                id: String(replacement.fplId ?? replacement.id),
                slot: p.slot,
                row: p.row,
                isCaptain: p.isCaptain,
                isVice: p.isVice,
                confidence: 100,
              }
            : p,
        );
      return {
        ...prev,
        starters: mapSlot(prev.starters),
        bench: mapSlot(prev.bench),
      };
    });
    setFixId(null);
    setSearch("");
  };

  return (
    <AppLayout>
      <div className="mx-auto max-w-2xl">
        <h1 className="text-[22px] font-extrabold">Confirm detected squad</h1>
        <p className="mt-2 text-[13px] text-[var(--text-secondary)]">
          {detected.length} player{detected.length !== 1 ? "s" : ""} detected
          {pendingScan.formation ? ` · ${pendingScan.formation}` : ""}
          {lowConfidence.length > 0
            ? ` · ${lowConfidence.length} need${lowConfidence.length === 1 ? "s" : ""} review`
            : ""}
        </p>

        {pendingScan.warnings && pendingScan.warnings.length > 0 ? (
          <div className="mt-3 space-y-1 rounded-[3px] border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-amber-900">
            {pendingScan.warnings.map((w) => (
              <p key={w}>{w}</p>
            ))}
          </div>
        ) : null}

        {pendingScan.unmatched.length > 0 ? (
          <p className="mt-2 text-[12px] text-[var(--text-secondary)]">
            Could not match: {pendingScan.unmatched.join(", ")}
          </p>
        ) : null}

        <div className="panel mt-4 p-4">
          <p className="font-label text-[11px] text-[var(--text-secondary)]">Manager context</p>
          <p className="mt-1 text-[12px] text-[var(--text-secondary)]">
            Pre-filled from scan when visible. Sync from FPL with your entry ID.
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="block text-[12px]">
              <span className="font-label text-[10px] text-[var(--text-secondary)]">Bank (£m)</span>
              <input
                type="number"
                step="0.1"
                value={pendingScan.bank ?? 0.5}
                onChange={(e) =>
                  updatePendingScan((prev) => ({ ...prev, bank: Number(e.target.value) || 0 }))
                }
                className="control mt-1 w-full border border-[var(--border)] px-2 py-1.5 text-[13px]"
              />
            </label>
            <label className="block text-[12px]">
              <span className="font-label text-[10px] text-[var(--text-secondary)]">Free transfers</span>
              <input
                type="number"
                min={0}
                max={2}
                value={pendingScan.freeTransfers ?? 1}
                onChange={(e) =>
                  updatePendingScan((prev) => ({
                    ...prev,
                    freeTransfers: Math.max(0, Math.min(2, Number(e.target.value) || 0)),
                  }))
                }
                className="control mt-1 w-full border border-[var(--border)] px-2 py-1.5 text-[13px]"
              />
            </label>
            <label className="block text-[12px]">
              <span className="font-label text-[10px] text-[var(--text-secondary)]">FPL entry ID</span>
              <input
                type="number"
                value={pendingScan.entryId ?? ""}
                placeholder="From FPL profile URL"
                onChange={(e) =>
                  updatePendingScan((prev) => ({
                    ...prev,
                    entryId: e.target.value ? Number(e.target.value) : undefined,
                  }))
                }
                className="control mt-1 w-full border border-[var(--border)] px-2 py-1.5 text-[13px]"
              />
            </label>
            <label className="block text-[12px]">
              <span className="font-label text-[10px] text-[var(--text-secondary)]">Mini-league ID (optional)</span>
              <input
                type="number"
                value={pendingScan.leagueId ?? ""}
                placeholder="Defaults to first league"
                onChange={(e) =>
                  updatePendingScan((prev) => ({
                    ...prev,
                    leagueId: e.target.value ? Number(e.target.value) : undefined,
                  }))
                }
                className="control mt-1 w-full border border-[var(--border)] px-2 py-1.5 text-[13px]"
              />
            </label>
          </div>
          {pendingScan.entryId != null ? (
            <button
              type="button"
              disabled={syncing}
              onClick={async () => {
                if (!pendingScan.entryId) return;
                setSyncing(true);
                try {
                  const summary = await fetchEntrySummary(pendingScan.entryId);
                  updatePendingScan((prev) => ({
                    ...prev,
                    bank: summary.bank,
                    freeTransfers: summary.freeTransfers,
                    teamValue: summary.teamValue,
                    entryId: summary.entryId,
                    leagueId: prev.leagueId ?? summary.defaultLeagueId ?? undefined,
                  }));
                } catch {
                  /* keep manual values */
                } finally {
                  setSyncing(false);
                }
              }}
              className="control mt-3 border border-[var(--border)] px-3 py-1.5 text-[12px] font-semibold hover:bg-[var(--canvas)] disabled:opacity-50"
            >
              {syncing ? "Syncing…" : "Sync bank & rank from FPL"}
            </button>
          ) : null}
        </div>

        <div className="panel mt-4 divide-y divide-[var(--border)] overflow-hidden">
          {detected.length === 0 ? (
            <p className="px-4 py-8 text-center text-[13px] text-[var(--text-secondary)]">
              No players detected. Try a clearer screenshot.
            </p>
          ) : (
            detected.map((p) => (
              <div
                key={p.id}
                className={`flex items-center justify-between px-4 py-3 ${(p.confidence ?? 100) < 80 ? "bg-[var(--fdr-hard)]/30" : ""}`}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--fdr-neutral)] text-[10px] font-bold">
                    {p.initials}
                  </div>
                  <div>
                    <p className="text-[13px] font-bold">{p.name}</p>
                    <p className="font-label text-[10px] text-[var(--text-secondary)]">
                      {p.club} · {p.position} · {p.slot === "bench" ? "Bench" : "Starting"}
                      {p.isCaptain ? " · (C)" : p.isVice ? " · (V)" : ""}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[12px] font-bold ${(p.confidence ?? 100) < 80 ? "text-[var(--coral)]" : "text-[var(--positive)]"}`}
                  >
                    {Math.round(p.confidence ?? 100)}%
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setFixId(p.id);
                      setSearch(p.name);
                    }}
                    className="control border border-[var(--border)] px-2 py-1 text-[11px] font-semibold hover:bg-[var(--canvas)]"
                  >
                    Fix
                  </button>
                  <button
                    type="button"
                    onClick={() => removePlayer(p.id)}
                    className="control border border-[var(--coral)] px-2 py-1 text-[11px] font-semibold text-[var(--coral)]"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {fixId ? (
          <div ref={fixSectionRef} id="fix-player" className="panel mt-4 scroll-mt-20 p-4">
            <p className="font-label text-[11px] text-[var(--text-secondary)]">Replace with</p>
            <input
              ref={fixInputRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search FPL players…"
              className="control mt-2 w-full border border-[var(--border)] px-3 py-2 text-[13px]"
            />
            <div className="mt-2 max-h-48 overflow-y-auto">
              {searchResults.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => replacePlayer(fixId, p)}
                  className="flex w-full items-center justify-between border-b border-[var(--border)] px-2 py-2 text-left text-[13px] hover:bg-[var(--canvas)]"
                >
                  <span className="font-bold">{p.name}</span>
                  <span className="text-[11px] text-[var(--text-secondary)]">
                    {p.club} · {p.position} · £{p.price}m
                  </span>
                </button>
              ))}
            </div>
            <button type="button" onClick={() => setFixId(null)} className="mt-2 text-[12px] text-[var(--text-secondary)]">
              Cancel
            </button>
          </div>
        ) : null}

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            disabled={detected.length === 0}
            onClick={() => {
              confirmPendingScan();
              router.replace("/");
            }}
            className={`control flex-1 bg-[var(--navy)] py-3 text-center text-[14px] font-bold text-white hover:opacity-90 ${
              detected.length === 0 ? "pointer-events-none opacity-40" : ""
            }`}
          >
            Confirm & go to home
          </button>
          <Link
            href="/upload"
            className="control flex-1 border border-[var(--border)] py-3 text-center text-[14px] font-bold hover:bg-[var(--canvas)]"
          >
            Re-upload
          </Link>
        </div>
      </div>
    </AppLayout>
  );
}
