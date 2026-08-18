"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/v5/AppLayout";
import { useDashboard } from "@/context/DashboardContext";
import { fetchPlayers } from "@/lib/api";
import type { SquadPlayer } from "@/lib/dashboard-data";
import { CLUB_COLORS } from "@/lib/dashboard-data";

export default function UploadConfirmPage() {
  const router = useRouter();
  const { pendingScan, updatePendingScan, confirmPendingScan } = useDashboard();
  const [fixId, setFixId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<SquadPlayer[]>([]);

  useEffect(() => {
    if (!pendingScan) {
      router.replace("/upload");
    }
  }, [pendingScan, router]);

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

  if (!pendingScan) {
    return (
      <AppLayout>
        <p className="text-[13px] text-[var(--text-secondary)]">Loading scan…</p>
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
          <div className="panel mt-4 p-4">
            <p className="font-label text-[11px] text-[var(--text-secondary)]">Replace with</p>
            <input
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
              router.push("/");
            }}
            className={`control flex-1 bg-[var(--navy)] py-3 text-center text-[14px] font-bold text-white hover:opacity-90 ${
              detected.length === 0 ? "pointer-events-none opacity-40" : ""
            }`}
          >
            Confirm & view squad
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
