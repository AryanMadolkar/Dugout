"use client";

import { useEffect, useState } from "react";
import { useDashboard } from "@/context/DashboardContext";
import { fetchGwReview, fetchOverview } from "@/lib/api";
import { SectionHead } from "./ui/SectionHead";

export function GwReviewPanel() {
  const { hasSquad, fplEntryId } = useDashboard();
  const [currentGw, setCurrentGw] = useState(1);
  const [review, setReview] = useState<Awaited<ReturnType<typeof fetchGwReview>> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchOverview()
      .then((o) => setCurrentGw(o.current_gameweek?.id ?? 1))
      .catch(() => setCurrentGw(1));
  }, []);

  useEffect(() => {
    if (!hasSquad || fplEntryId == null) {
      setReview(null);
      return;
    }
    const reviewGw = Math.max(1, currentGw - 1);
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchGwReview(fplEntryId, reviewGw)
      .then((data) => {
        if (!cancelled) setReview(data);
      })
      .catch((err) => {
        if (!cancelled) {
          setReview(null);
          setError(err instanceof Error ? err.message : "GW review unavailable");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [hasSquad, fplEntryId, currentGw]);

  if (!hasSquad) return null;

  if (fplEntryId == null) {
    return (
      <section className="panel overflow-hidden">
        <SectionHead title="Gameweek review" />
        <p className="p-4 text-[13px] text-[var(--text-secondary)]">
          Add your FPL entry ID on confirm or in rank strategy to load last week&apos;s review from FPL.
        </p>
      </section>
    );
  }

  if (loading) {
    return (
      <section className="panel overflow-hidden">
        <SectionHead title="Gameweek review" />
        <p className="p-4 text-[13px] text-[var(--text-secondary)]">Loading finished GW from FPL…</p>
      </section>
    );
  }

  if (error || !review) {
    return (
      <section className="panel overflow-hidden">
        <SectionHead title="Gameweek review" />
        <p className="p-4 text-[13px] text-[var(--text-secondary)]">
          {error ?? "No finished gameweek data yet."}
        </p>
      </section>
    );
  }

  return (
    <section className="panel overflow-hidden">
      <SectionHead
        title={`Gameweek ${review.gameweek} review`}
        right={
          <span className="text-[10px] text-[var(--text-secondary)]">
            {review.totalPoints} pts · avg {review.averageScore}
          </span>
        }
      />
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
