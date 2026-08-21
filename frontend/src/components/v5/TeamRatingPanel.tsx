"use client";

import { useEffect, useMemo, useState } from "react";
import { useDashboard } from "@/context/DashboardContext";
import { fetchPlayers } from "@/lib/api";
import { computeTeamRating } from "@/lib/team-rating";
import type { Player } from "@/lib/types";
import { SectionHead } from "./ui/SectionHead";

export function TeamRatingPanel() {
  const { starters, bench, hasSquad } = useDashboard();
  const [liveById, setLiveById] = useState<Map<number, Player> | null>(null);

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
    () => computeTeamRating(starters, bench, liveById ?? undefined),
    [starters, bench, liveById],
  );

  if (!hasSquad || !rating) {
    return (
      <section className="panel overflow-hidden">
        <SectionHead title="Team rating" />
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
    <section className="panel-elevated overflow-hidden">
      <SectionHead title="Team rating" />
      <div className="p-4">
        <div className="flex items-end gap-3">
          <p className="text-[48px] font-extrabold leading-none text-[var(--navy)]">{rating.score}</p>
          <div className="mb-1">
            <p className={`text-[14px] font-bold ${toneClass}`}>{rating.verdict}</p>
            <p className="text-[11px] text-[var(--text-secondary)]">{rating.projectedGw} GW xPts</p>
          </div>
        </div>
        <div className="mt-4 space-y-2">
          {rating.bars.map((bar) => (
            <div key={bar.label}>
              <div className="mb-1 flex justify-between text-[11px]">
                <span className="font-label text-[var(--text-secondary)]">{bar.label}</span>
                <span className="font-bold">
                  {bar.value}
                  <span className="ml-1 font-normal text-[var(--text-secondary)]">· {bar.hint}</span>
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-[var(--canvas)]">
                <div className="bar-fill h-full rounded-full" style={{ width: `${Math.min(100, bar.value)}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
