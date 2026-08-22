"use client";

import { useMemo, useState } from "react";
import { useDashboard } from "@/context/DashboardContext";
import { fetchPlayers } from "@/lib/api";
import { CLUB_COLORS } from "@/lib/dashboard-data";
import type { SquadPlayer } from "@/lib/dashboard-data";
import { compareScenarios, scenarioDelta, type WhatIfScenario } from "@/lib/what-if";

export function WhatIfPanel() {
  const { squad, starters, bench, activeChip, allPlayers, bank } = useDashboard();
  const [hit, setHit] = useState(false);
  const [loading, setLoading] = useState(false);
  const [scenarios, setScenarios] = useState<WhatIfScenario[]>([]);

  const comparison = useMemo(() => {
    if (!squad) return null;
    return compareScenarios(squad, scenarios, activeChip);
  }, [squad, scenarios, activeChip]);

  const buildFromAdvice = async () => {
    if (!squad) return;
    setLoading(true);
    try {
      const weakest = [...starters]
        .filter((p) => p.position !== "GKP")
        .sort((a, b) => a.xp - b.xp)[0];
      if (!weakest) return;

      const candidates = await fetchPlayers({
        position: weakest.position,
        sort: "ep_next",
        limit: 12,
      });
      const owned = new Set(allPlayers.map((p) => p.fplId).filter(Boolean));
      const targets = candidates.filter((c) => !owned.has(c.id)).slice(0, 3);

      const built: WhatIfScenario[] = targets.map((t, i) => {
        const inPlayer: SquadPlayer = {
          id: String(t.id),
          fplId: t.id,
          name: t.web_name,
          initials: t.web_name.slice(0, 3).toUpperCase(),
          club: t.team_short_name ?? "?",
          clubColor: CLUB_COLORS[t.team_short_name ?? ""] ?? "#888",
          position: t.position as SquadPlayer["position"],
          price: t.price,
          opponent: "—",
          home: true,
          xp: t.ep_next ?? t.points_per_game ?? 0,
          form: t.form ?? 0,
          ppg: t.points_per_game ?? 0,
          ownership: t.selected_by_percent ?? 0,
          row: t.position as SquadPlayer["row"],
          nextFixtures: [],
        };
        return {
          id: `s${i}`,
          label: `${weakest.name} → ${t.web_name}`,
          moves: [{ outId: weakest.id, inPlayer, hit: hit ? 4 : 0 }],
        };
      });

      built.push({
        id: "roll",
        label: "Roll transfer",
        moves: [],
      });

      setScenarios(built);
    } finally {
      setLoading(false);
    }
  };

  if (!squad) {
    return <p className="text-[13px] text-[var(--text-secondary)]">Scan a squad to run scenarios.</p>;
  }

  const baseline = comparison?.baseline;
  const best = comparison?.best;

  return (
    <div className="space-y-4">
      <p className="text-[13px] text-[var(--text-secondary)]">
        Compare transfers, hits and captain changes side-by-side. Bank: £{bank.toFixed(1)}m
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-[12px] font-semibold">
          <input type="checkbox" checked={hit} onChange={(e) => setHit(e.target.checked)} />
          Include -4 hit
        </label>
        <button
          type="button"
          disabled={loading}
          onClick={buildFromAdvice}
          className="control bg-[var(--navy)] px-3 py-1.5 text-[11px] font-bold text-white"
        >
          {loading ? "Building…" : "Generate scenarios"}
        </button>
      </div>

      {baseline ? (
        <div className="grid gap-3 md:grid-cols-2">
          <CompareCard title="Current" result={baseline} />
          {comparison.results.map((r) => {
            const d = scenarioDelta(baseline, r);
            const isBest = best?.scenario.id === r.scenario.id;
            return (
              <CompareCard
                key={r.scenario.id}
                title={r.scenario.label}
                result={r}
                delta={d}
                best={isBest}
              />
            );
          })}
        </div>
      ) : null}

      {best && scenarios.length > 0 ? (
        <div className="rounded-[3px] border border-[var(--positive)]/40 bg-[var(--fdr-easy)]/40 px-3 py-2">
          <p className="font-label text-[10px] text-[var(--positive)]">Best option</p>
          <p className="text-[14px] font-extrabold text-[var(--navy)]">{best.scenario.label}</p>
        </div>
      ) : null}
    </div>
  );
}

function CompareCard({
  title,
  result,
  delta,
  best,
}: {
  title: string;
  result: { rating: number; gwXp: number; next4Xp: number; formation: string };
  delta?: { gwDelta: number; ratingDelta: number; next4Delta: number };
  best?: boolean;
}) {
  return (
    <div
      className={`rounded-[3px] border p-3 ${best ? "border-[var(--coral)] bg-[var(--fdr-hard)]/15" : "border-[var(--border)] bg-[var(--canvas)]"}`}
    >
      <p className="font-label text-[10px] text-[var(--text-secondary)]">{title}</p>
      <div className="mt-2 grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="text-[10px] text-[var(--text-secondary)]">Rating</p>
          <p className="text-[16px] font-extrabold text-[var(--navy)]">
            {result.rating}
            {delta ? (
              <span className={`ml-1 text-[11px] ${delta.ratingDelta >= 0 ? "text-[var(--positive)]" : "text-[var(--coral)]"}`}>
                {delta.ratingDelta >= 0 ? "+" : ""}
                {delta.ratingDelta}
              </span>
            ) : null}
          </p>
        </div>
        <div>
          <p className="text-[10px] text-[var(--text-secondary)]">GW xPts</p>
          <p className="text-[16px] font-extrabold text-[var(--navy)]">
            {result.gwXp.toFixed(1)}
            {delta ? (
              <span className={`ml-1 text-[11px] ${delta.gwDelta >= 0 ? "text-[var(--positive)]" : "text-[var(--coral)]"}`}>
                {delta.gwDelta >= 0 ? "+" : ""}
                {delta.gwDelta.toFixed(1)}
              </span>
            ) : null}
          </p>
        </div>
        <div>
          <p className="text-[10px] text-[var(--text-secondary)]">Next 4</p>
          <p className="text-[16px] font-extrabold text-[var(--navy)]">
            {result.next4Xp.toFixed(0)}
            {delta ? (
              <span className={`ml-1 text-[11px] ${delta.next4Delta >= 0 ? "text-[var(--positive)]" : "text-[var(--coral)]"}`}>
                {delta.next4Delta >= 0 ? "+" : ""}
                {delta.next4Delta.toFixed(0)}
              </span>
            ) : null}
          </p>
        </div>
      </div>
      <p className="mt-2 text-[11px] text-[var(--text-secondary)]">{result.formation} formation</p>
    </div>
  );
}
