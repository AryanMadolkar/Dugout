"use client";

import { useEffect, useMemo, useState } from "react";
import { useDashboard } from "@/context/DashboardContext";
import { fetchOverview, fetchPlayers } from "@/lib/api";
import { computeTeamRating } from "@/lib/team-rating";
import type { Player } from "@/lib/types";
import { Modal } from "./ui/Modal";
import { SectionHead } from "./ui/SectionHead";

export function TeamRatingPanel() {
  const { starters, bench, hasSquad, activeChip } = useDashboard();
  const [liveById, setLiveById] = useState<Map<number, Player> | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  useEffect(() => {
    if (!hasSquad) return;
    let cancelled = false;
    fetchPlayers({ sort: "ep_next", limit: 500 })
      .then((players) => {
        if (cancelled) return;
        setLiveById(new Map(players.map((p) => [p.id, p])));
      })
      .catch(() => {
        if (!cancelled) setLiveById(null);
      });
    return () => {
      cancelled = true;
    };
  }, [hasSquad, starters, bench]);

  const rating = useMemo(
    () => computeTeamRating(starters, bench, liveById ?? undefined, activeChip),
    [starters, bench, liveById, activeChip],
  );

  if (!hasSquad || !rating) {
    return (
      <section className="panel overflow-hidden">
        <SectionHead title="Dugout score" />
        <p className="p-4 text-[13px] text-[var(--text-secondary)]">Scan your squad for a rating breakdown.</p>
      </section>
    );
  }

  const toneClass =
    rating.verdictTone === "good"
      ? "text-[var(--positive)]"
      : rating.verdictTone === "warn"
        ? "text-[var(--coral)]"
        : "text-[var(--navy)]";

  return (
    <>
      <section className="panel-elevated overflow-hidden">
        <SectionHead title="Dugout score" />
        <button type="button" onClick={() => setDetailOpen(true)} className="w-full p-4 text-left hover:bg-[var(--canvas)]/40">
          <div className="flex items-end gap-3">
            <p className="text-[48px] font-extrabold leading-none text-[var(--navy)]">
              {rating.score}
              <span className="text-[18px] font-bold text-[var(--text-secondary)]"> / 100</span>
            </p>
            <div className="mb-1">
              <p className={`text-[14px] font-bold uppercase ${toneClass}`}>{rating.verdict}</p>
              <p className="text-[11px] text-[var(--text-secondary)]">{rating.projectedGw.toFixed(1)} GW xPts</p>
            </div>
          </div>
          <div className="mt-3 space-y-1.5">
            {rating.bars.slice(0, 4).map((bar) => (
              <Bar key={bar.label} bar={bar} compact />
            ))}
          </div>
          <p className="mt-3 text-[12px] text-[var(--text-secondary)]">{rating.weakness}</p>
          <p className="mt-2 text-[11px] font-semibold text-[var(--coral)]">Tap for full breakdown →</p>
        </button>
      </section>

      <Modal open={detailOpen} onClose={() => setDetailOpen(false)} title="Dugout score breakdown" wide>
        <div className="flex items-end gap-3">
          <p className="text-[56px] font-extrabold leading-none text-[var(--navy)]">{rating.score}</p>
          <p className={`mb-2 text-[16px] font-bold uppercase ${toneClass}`}>{rating.verdict}</p>
        </div>
        <p className="mb-4 text-[13px] text-[var(--text-secondary)]">{rating.weakness}</p>
        <div className="space-y-3">
          {rating.bars.map((bar) => (
            <Bar key={bar.label} bar={bar} />
          ))}
        </div>
      </Modal>
    </>
  );
}

function Bar({ bar, compact }: { bar: { label: string; value: number; hint: string }; compact?: boolean }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-[11px]">
        <span className="font-label text-[var(--text-secondary)]">{bar.label}</span>
        <span className="font-bold">
          {bar.value}
          {!compact ? <span className="ml-1 font-normal text-[var(--text-secondary)]">· {bar.hint}</span> : null}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-[var(--canvas)]">
        <div className="bar-fill h-full rounded-full" style={{ width: `${Math.min(100, bar.value)}%` }} />
      </div>
    </div>
  );
}
