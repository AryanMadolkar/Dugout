"use client";

import { useMemo } from "react";
import { useDashboard } from "@/context/DashboardContext";
import { estimatePlayerGwXp, estimatePlayerXp, normalizeChip, resolveCaptainId } from "@/lib/projections";
import { rankCaptainCandidates, STRATEGY_COPY } from "@/lib/strategy-mode";
import { playerGwFdr } from "@/lib/optimise-xi";
import { startProbability, rotationRisk } from "@/lib/player-intelligence";
import { SectionHead } from "./ui/SectionHead";

export function CaptainOptimizerPanel() {
  const { starters, hasSquad, activeChip, strategyMode, setCaptain, setSelectedId } = useDashboard();

  const ranked = useMemo(
    () => (hasSquad ? rankCaptainCandidates(starters, strategyMode) : []),
    [hasSquad, starters, strategyMode],
  );
  const captainId = useMemo(() => resolveCaptainId(starters), [starters]);
  const mult = normalizeChip(activeChip) === "Triple Captain" ? 3 : 2;

  if (!hasSquad) {
    return (
      <section className="panel overflow-hidden">
        <SectionHead title="Captaincy" />
        <p className="p-4 text-[13px] text-[var(--text-secondary)]">Scan your squad for captain picks.</p>
      </section>
    );
  }

  const top = ranked[0];

  return (
    <section className="panel-elevated overflow-hidden">
      <SectionHead
        title="Captaincy"
        right={<span className="font-label text-[10px] text-[var(--text-secondary)]">{STRATEGY_COPY[strategyMode].captainHint}</span>}
      />
      <div className="p-4">
        {top ? (
          <div className="mb-4 rounded-[3px] border border-[var(--coral)]/30 bg-[var(--fdr-easy)]/30 px-3 py-2">
            <p className="font-label text-[10px] text-[var(--text-secondary)]">Why {top.player.name}?</p>
            <p className="text-[13px] text-[var(--text-body)]">
              Highest combination of expected minutes, attacking involvement and fixture quality in{" "}
              {strategyMode.toLowerCase()} mode.
            </p>
          </div>
        ) : null}

        <div className="space-y-2">
          {ranked.slice(0, 5).map((row, i) => {
            const p = row.player;
            const isCap = p.id === captainId;
            const gwXp = estimatePlayerGwXp(p, activeChip, isCap ? p.id : null);
            const sp = startProbability(p);
            const risk = rotationRisk(p);
            const fdr = playerGwFdr(p);
            const ceiling = (p.form || p.ppg || row.xp) * mult;

            return (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  setCaptain(p.id);
                  setSelectedId(p.id);
                }}
                className={`flex w-full flex-wrap items-center justify-between gap-2 rounded-[3px] border px-3 py-2.5 text-left transition hover:bg-[var(--canvas)] ${
                  isCap ? "border-[var(--coral)] bg-[var(--fdr-hard)]/20" : "border-[var(--border)]"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--navy)] text-[12px] font-bold text-white">
                    {i + 1}
                  </span>
                  <div>
                    <p className="text-[14px] font-extrabold text-[var(--navy)]">{p.name}</p>
                    <p className="font-label text-[10px] text-[var(--text-secondary)]">
                      {p.club} · {sp}% mins · FDR {fdr} · {risk} risk · {p.ownership.toFixed(0)}% owned
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[16px] font-extrabold text-[var(--positive)]">{row.xp.toFixed(1)} xPts</p>
                  <p className="text-[10px] text-[var(--text-secondary)]">
                    {row.confidence}% · ceiling {ceiling.toFixed(1)}
                    {isCap ? ` · live ${gwXp.toFixed(1)}` : ""}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
