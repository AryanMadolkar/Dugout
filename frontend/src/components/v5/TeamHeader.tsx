"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useDashboard } from "@/context/DashboardContext";
import type { ChipName } from "@/lib/dashboard-data";
import { fetchOverview } from "@/lib/api";
import { PLAYABLE_CHIPS, projectionChipLabel } from "@/lib/projections";
import { formatScanTime, projectedPoints } from "@/lib/squad-storage";

export function TeamHeader() {
  const { squad, starters, bench, activeChip, setActiveChip, chipUsage } = useDashboard();
  const [gameweek, setGameweek] = useState<number | null>(null);
  const [deadline, setDeadline] = useState<string | null>(null);

  useEffect(() => {
    fetchOverview()
      .then((o) => {
        setGameweek(o.current_gameweek?.id ?? null);
        setDeadline(o.current_gameweek?.deadline_time ?? null);
      })
      .catch(() => {
        setGameweek(null);
        setDeadline(null);
      });
  }, []);

  if (!squad) return null;

  const projected = projectedPoints(starters, bench, activeChip);
  const baseProjected = projectedPoints(starters, bench, null);
  const chipDelta = Math.round((projected - baseProjected) * 10) / 10;

  const canPlay = (chip: ChipName) => chipUsage[chip] !== "used";
  const short: Record<string, string> = {
    Wildcard: "WC",
    "Free Hit": "FH",
    "Bench Boost": "BB",
    "Triple Captain": "TC",
  };
  return (
    <div className="panel-elevated overflow-hidden">
      <div className="flex flex-wrap">
        <div className="flex min-w-[200px] flex-1 flex-col justify-center border-b border-[var(--border)] p-5 sm:border-b-0 sm:border-r">
          <div className="font-label mb-1 text-[10px] text-[var(--text-secondary)]">Your squad</div>
          <h1 className="text-[22px] font-extrabold tracking-tight text-[var(--navy)]">
            {squad.formation ? `${squad.formation} formation` : "Scanned squad"}
          </h1>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge label="Starters" value={String(starters.length)} />
            <Badge label="Bench" value={String(squad.bench.length)} />
            <Badge label="Scanned" value={formatScanTime(squad.scannedAt).split(",")[0]} muted />
          </div>
        </div>

        <div
          className="flex min-w-[220px] flex-col items-center justify-center border-b border-[var(--border)] px-6 py-5 sm:border-b-0 sm:border-r"
          style={{
            background: "linear-gradient(160deg, var(--fdr-easy) 0%, #fff 60%)",
          }}
        >
          <p className="font-label text-center text-[11px] text-[var(--positive)]">
            Projected · {gameweek ? `GW${gameweek}` : "this GW"}
            {deadline
              ? ` · deadline ${new Intl.DateTimeFormat("en-GB", {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: false,
                }).format(new Date(deadline))}`
              : ""}
          </p>
          <p
            className="text-[62px] font-extrabold leading-none tracking-tighter"
            style={{
              background: "linear-gradient(135deg, var(--navy) 0%, #2a5070 100%)",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            {projected.toFixed(1)}
          </p>
          <p className="mt-1 text-[12px] text-[var(--text-secondary)]">
            Dugout xP ({projectionChipLabel(activeChip)})
            {chipDelta > 0 ? (
              <span className="ml-1 font-semibold text-[var(--positive)]">+{chipDelta.toFixed(1)}</span>
            ) : null}
          </p>
          <div className="mt-3 flex flex-wrap justify-center gap-1">
            <button
              type="button"
              onClick={() => setActiveChip(null)}
              className={`control px-2 py-1 text-[10px] font-semibold ${
                !activeChip ? "bg-[var(--navy)] text-white" : "border border-[var(--border)] hover:bg-white"
              }`}
            >
              None
            </button>
            {PLAYABLE_CHIPS.map((chip) => {
              const disabled = !canPlay(chip);
              const selected = activeChip === chip;
              return (
                <button
                  key={chip}
                  type="button"
                  disabled={disabled}
                  title={disabled ? `${chip} marked used` : `Play ${chip} this GW only`}
                  onClick={() => setActiveChip(selected ? null : chip)}
                  className={`control px-2 py-1 text-[10px] font-semibold ${
                    selected
                      ? "bg-[var(--navy)] text-white"
                      : disabled
                        ? "cursor-not-allowed border border-[var(--border)] opacity-40"
                        : "border border-[var(--border)] hover:bg-white"
                  }`}
                >
                  {short[chip]}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-1 flex-col justify-center gap-4 p-5">
          <p className="text-[13px] text-[var(--text-secondary)]">
            Pick one chip for this GW (None / WC / FH / BB / TC). Projected points and AI verdict update automatically.
            Chip status can also come from your squad screenshot.
          </p>
          <div className="flex gap-2">
            <Link
              href="/upload"
              className="control border border-[var(--border)] bg-white px-3 py-2 text-[12px] font-semibold hover:bg-[var(--canvas)]"
            >
              Re-scan
            </Link>
            <Link
              href="/chips"
              className="control border border-[var(--border)] bg-white px-3 py-2 text-[12px] font-semibold hover:bg-[var(--canvas)]"
            >
              Chip strategy
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function Badge({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-[3px] px-2 py-1 text-[11px] ${
        muted ? "bg-[var(--canvas)] text-[var(--text-secondary)]" : "bg-[var(--navy)]/5 text-[var(--text-body)]"
      }`}
    >
      <span className="font-label text-[9px] text-[var(--text-secondary)]">{label}</span>
      <strong className={muted ? "" : "text-[var(--navy)]"}>{value}</strong>
    </span>
  );
}
