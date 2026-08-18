"use client";

import { useMemo } from "react";
import { useDashboard } from "@/context/DashboardContext";
import { SectionHead } from "./ui/SectionHead";

export function TeamRatingPanel() {
  const { starters, bench, hasSquad } = useDashboard();

  const rating = useMemo(() => {
    if (starters.length === 0) return null;
    const avgXp = starters.reduce((s, p) => s + p.xp, 0) / starters.length;
    const avgForm = starters.reduce((s, p) => s + p.form, 0) / starters.length;
    const avgFdr =
      starters.reduce((s, p) => {
        const f = p.nextFixtures[0]?.fdr ?? 3;
        return s + f;
      }, 0) / starters.length;
    const benchXp = bench.reduce((s, p) => s + p.xp, 0) / Math.max(bench.length, 1);
    const score = Math.round(Math.min(99, avgXp * 6 + avgForm * 3 + (4 - avgFdr) * 5 + benchXp));
    return {
      score,
      verdict: score >= 80 ? "Strong" : score >= 65 ? "Solid" : "Needs work",
      bars: [
        { label: "Starting XI", value: Math.round(avgXp * 10) },
        { label: "Fixtures", value: Math.round((4 - avgFdr) * 25) },
        { label: "Form", value: Math.round(avgForm * 12) },
        { label: "Depth", value: Math.round(benchXp * 8) },
      ],
    };
  }, [starters, bench]);

  if (!hasSquad || !rating) {
    return (
      <section className="panel overflow-hidden">
        <SectionHead title="Team rating" />
        <p className="p-4 text-[13px] text-[var(--text-secondary)]">Scan your squad for a rating breakdown.</p>
      </section>
    );
  }

  return (
    <section className="panel-elevated overflow-hidden">
      <SectionHead title="Team rating" />
      <div className="p-4">
        <div className="flex items-end gap-3">
          <p className="text-[48px] font-extrabold leading-none text-[var(--navy)]">{rating.score}</p>
          <p className="mb-1 text-[14px] font-bold text-[var(--positive)]">{rating.verdict}</p>
        </div>
        <div className="mt-4 space-y-2">
          {rating.bars.map((bar) => (
            <div key={bar.label}>
              <div className="mb-1 flex justify-between text-[11px]">
                <span className="font-label text-[var(--text-secondary)]">{bar.label}</span>
                <span className="font-bold">{bar.value}</span>
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
