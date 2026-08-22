"use client";

import { useMemo } from "react";
import { useDashboard } from "@/context/DashboardContext";
import { fetchPlayers } from "@/lib/api";
import { useEffect, useState } from "react";
import type { Player } from "@/lib/types";
import { SectionHead } from "./ui/SectionHead";

/** Future-ready mini-league comparison (demo until FPL league ID linked). */
export function MiniLeaguePanel() {
  const { starters, hasSquad, fplRank } = useDashboard();
  const [pool, setPool] = useState<Player[]>([]);

  useEffect(() => {
    fetchPlayers({ sort: "selected_by_percent", limit: 30 })
      .then(setPool)
      .catch(() => setPool([]));
  }, []);

  const insight = useMemo(() => {
    if (!hasSquad || pool.length === 0) return null;
    const owned = new Set(starters.map((p) => p.name.toLowerCase()));
    const rivalOwns = pool.find((p) => !owned.has(p.web_name.toLowerCase()) && (p.selected_by_percent ?? 0) > 40);
    const youOwnDiff = starters.find((p) => p.ownership < 20 && p.xp >= 5);
    return {
      yourRank: fplRank ?? 412_806,
      rivalRank: (fplRank ?? 412_806) - 12_400,
      rivalAsset: rivalOwns?.web_name ?? "Haaland",
      yourEdge: youOwnDiff?.name ?? "Saka",
      capChance: 42,
    };
  }, [hasSquad, pool, starters, fplRank]);

  if (!insight) return null;

  return (
    <section className="panel overflow-hidden">
      <SectionHead title="Mini league · rival analysis" />
      <div className="grid gap-px bg-[var(--border)] sm:grid-cols-2">
        <div className="bg-white p-4">
          <p className="font-label text-[10px] text-[var(--text-secondary)]">Your rank</p>
          <p className="text-[22px] font-extrabold text-[var(--navy)]">{insight.yourRank.toLocaleString()}</p>
        </div>
        <div className="bg-white p-4">
          <p className="font-label text-[10px] text-[var(--text-secondary)]">Rival rank</p>
          <p className="text-[22px] font-extrabold text-[var(--navy)]">{insight.rivalRank.toLocaleString()}</p>
        </div>
      </div>
      <div className="space-y-2 p-4">
        <Insight label="Biggest difference" text={`Your rival owns ${insight.rivalAsset}. You don't.`} />
        <Insight label="Biggest opportunity" text={`You own ${insight.yourEdge}. Your rival doesn't.`} />
        <Insight
          label="Rank strategy"
          text={`Rival ${insight.capChance}% chance of captaining ${insight.rivalAsset}. Captaining ${insight.yourEdge} gives the highest projected rank swing.`}
        />
      </div>
    </section>
  );
}

function Insight({ label, text }: { label: string; text: string }) {
  return (
    <div className="rounded-[3px] border border-[var(--border)] bg-[var(--canvas)] px-3 py-2">
      <p className="font-label text-[10px] text-[var(--text-secondary)]">{label}</p>
      <p className="mt-1 text-[13px] text-[var(--text-body)]">{text}</p>
    </div>
  );
}
