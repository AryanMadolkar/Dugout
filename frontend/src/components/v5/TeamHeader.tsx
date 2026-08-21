"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useDashboard } from "@/context/DashboardContext";
import { fetchOverview } from "@/lib/api";
import { PLAYABLE_CHIPS, normalizeChip, projectionChipLabel } from "@/lib/projections";
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
  const chip = normalizeChip(activeChip);

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
            key={`xp-${chip ?? "none"}-${projected}`}
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
            {chipDelta !== 0 ? (
              <span
                className={`ml-1 font-semibold ${chipDelta > 0 ? "text-[var(--positive)]" : "text-[var(--coral)]"}`}
              >
                {chipDelta > 0 ? "+" : ""}
                {chipDelta.toFixed(1)}
              </span>
            ) : null}
          </p>
          <div className="mt-3 flex flex-wrap justify-center gap-1">
            <button
              type="button"
              onClick={() => setActiveChip(null)}
              className={`control px-2 py-1 text-[10px] font-semibold ${
                !chip ? "bg-[var(--navy)] text-white" : "border border-[var(--border)] hover:bg-white"
              }`}
            >
              None
            </button>
            {PLAYABLE_CHIPS.map((name) => {
              const selected = chip === name;
              const seasonUsed = chipUsage[name] === "used";
              return (
                <button
                  key={name}
                  type="button"
                  title={
                    seasonUsed
                      ? `${name} marked used — still applies to this GW projection when selected`
                      : `Play ${name} this GW`
                  }
                  onClick={() => setActiveChip(selected ? null : name)}
                  className={`control px-2 py-1 text-[10px] font-semibold ${
                    selected
                      ? "bg-[var(--navy)] text-white"
                      : "border border-[var(--border)] hover:bg-white"
                  }`}
                >
                  {short[name]}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-1 flex-col justify-center gap-4 p-5">
          <p className="text-[13px] text-[var(--text-secondary)]">
            Pick TC or BB for this GW to recalculate projected points (captain ×3 or +bench). Season Used also
            activates that chip for projections.
          </p>
          <div className="flex gap-2">
            <Link
              href="/upload"
              className="control border border-[var(--border)] bg-white px-3 py-2 text-[12px] font-semibold hover:bg-[var(--canvas)]"
            >
              Re-scan
            </Link>
            <a
              href="#chip-strategy"
              className="control border border-[var(--border)] bg-white px-3 py-2 text-[12px] font-semibold hover:bg-[var(--canvas)]"
            >
              Chip strategy
            </a>
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
