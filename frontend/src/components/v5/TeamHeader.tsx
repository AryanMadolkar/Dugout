"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useDashboard } from "@/context/DashboardContext";
import { fetchOverview } from "@/lib/api";
import { formatScanTime, projectedPoints } from "@/lib/squad-storage";

export function TeamHeader() {
  const { squad, starters } = useDashboard();
  const [gameweek, setGameweek] = useState<number | null>(null);

  useEffect(() => {
    fetchOverview()
      .then((o) => setGameweek(o.current_gameweek?.id ?? null))
      .catch(() => setGameweek(null));
  }, []);

  if (!squad) return null;

  const projected = projectedPoints(starters);

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
          className="flex flex-col items-center justify-center border-b border-[var(--border)] px-8 py-5 sm:border-b-0 sm:border-r"
          style={{
            background: "linear-gradient(160deg, var(--fdr-easy) 0%, #fff 60%)",
          }}
        >
          <p className="font-label text-[11px] text-[var(--positive)]">
            Projected · {gameweek ? `GW${gameweek}` : "this GW"}
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
          <p className="mt-1 text-[12px] text-[var(--text-secondary)]">expected points (XI + captain)</p>
        </div>

        <div className="flex flex-1 flex-col justify-center gap-4 p-5">
          <p className="text-[13px] text-[var(--text-secondary)]">
            Squad loaded from your screenshot. Transfer and chip recommendations will use this squad once the optimiser
            is connected.
          </p>
          <div className="flex gap-2">
            <Link
              href="/upload"
              className="control border border-[var(--border)] bg-white px-3 py-2 text-[12px] font-semibold hover:bg-[var(--canvas)]"
            >
              Re-scan
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
