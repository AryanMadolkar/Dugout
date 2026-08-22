"use client";

import { useMemo } from "react";
import { useDashboard } from "@/context/DashboardContext";
import { fetchOverview } from "@/lib/api";
import { useEffect, useState } from "react";
import { buildGwReview } from "@/lib/decision-store";
import { resolveCaptainId } from "@/lib/projections";
import { SectionHead } from "./ui/SectionHead";

export function GwReviewPanel() {
  const { starters, hasSquad } = useDashboard();
  const [gw, setGw] = useState(1);

  useEffect(() => {
    fetchOverview()
      .then((o) => setGw(o.current_gameweek?.id ?? 1))
      .catch(() => setGw(1));
  }, []);

  const review = useMemo(() => {
    if (!hasSquad) return null;
    const captainId = resolveCaptainId(starters);
    const captain = starters.find((p) => p.id === captainId)?.name ?? "Captain";
    const weakest = [...starters]
      .filter((p) => p.position !== "GKP")
      .sort((a, b) => a.xp - b.xp)[0]?.name ?? "—";
    return buildGwReview(gw, captain, weakest);
  }, [hasSquad, starters, gw]);

  if (!review) return null;

  return (
    <section className="panel overflow-hidden">
      <SectionHead title={`Gameweek ${review.gameweek} review`} />
      <div className="p-4">
        <div className="flex items-end gap-3">
          <p className="text-[42px] font-extrabold leading-none text-[var(--navy)]">{review.grade}</p>
          <div className="mb-1">
            <p className="font-label text-[10px] text-[var(--text-secondary)]">Dugout grade</p>
            <p className="text-[13px] font-bold">Decision quality {review.decisionQuality}%</p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2">
          <Delta label="Captain" value={review.captainDelta} />
          <Delta label="Transfer" value={review.transferDelta} />
          <Delta label="Bench" value={review.benchDelta} />
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <div className="rounded-[3px] bg-[var(--fdr-easy)]/50 px-3 py-2">
            <p className="font-label text-[10px] text-[var(--positive)]">Best decision</p>
            <p className="text-[13px] font-bold">{review.bestDecision}</p>
          </div>
          <div className="rounded-[3px] bg-[var(--fdr-hard)]/30 px-3 py-2">
            <p className="font-label text-[10px] text-[var(--coral)]">Worst decision</p>
            <p className="text-[13px] font-bold">{review.worstDecision}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function Delta({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[3px] bg-[var(--canvas)] px-2 py-2 text-center">
      <p className="font-label text-[9px] text-[var(--text-secondary)]">{label}</p>
      <p className={`text-[14px] font-extrabold ${value >= 0 ? "text-[var(--positive)]" : "text-[var(--coral)]"}`}>
        {value >= 0 ? "+" : ""}
        {value.toFixed(1)} pts
      </p>
    </div>
  );
}
