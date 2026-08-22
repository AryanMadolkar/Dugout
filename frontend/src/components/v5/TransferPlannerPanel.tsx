"use client";

import { useEffect, useState } from "react";
import { useDashboard } from "@/context/DashboardContext";
import { fetchTransferPlan } from "@/lib/api";
import { managerAdviceContext, squadToApiPayload } from "@/lib/advice-context";
import { SectionHead } from "./ui/SectionHead";

export function TransferPlannerPanel() {
  const { hasSquad, allPlayers, activeChip, bank, freeTransfers, fplRank, strategyMode } = useDashboard();
  const [plan, setPlan] = useState<Awaited<ReturnType<typeof fetchTransferPlan>> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!hasSquad) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchTransferPlan(
      squadToApiPayload(allPlayers),
      activeChip,
      managerAdviceContext({ bank, freeTransfers, fplRank, strategyMode }),
    )
      .then((data) => {
        if (!cancelled) setPlan(data);
      })
      .catch((err) => {
        if (!cancelled) {
          setPlan(null);
          setError(err instanceof Error ? err.message : "Transfer plan unavailable");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [hasSquad, allPlayers, activeChip, bank, freeTransfers, fplRank, strategyMode]);

  if (!hasSquad) {
    return (
      <section className="panel overflow-hidden">
        <SectionHead title="Transfer plan" />
        <p className="p-4 text-[13px] text-[var(--text-secondary)]">Scan your squad first.</p>
      </section>
    );
  }

  return (
    <section className="panel-elevated overflow-hidden">
      <SectionHead
        title="Transfer plan"
        right={
          <span className="text-[11px] text-[var(--text-secondary)]">
            £{bank.toFixed(1)}m · {freeTransfers} FT
          </span>
        }
      />
      <div className="p-4">
        {loading ? (
          <p className="text-[13px] text-[var(--text-secondary)]">Building multi-GW plan…</p>
        ) : error ? (
          <p className="text-[13px] text-[var(--coral)]">{error}</p>
        ) : plan ? (
          <>
            <div className="space-y-2">
              {plan.steps.map((step) => (
                <div
                  key={step.gameweek}
                  className="flex flex-wrap items-start justify-between gap-2 rounded-[3px] border border-[var(--border)] bg-[var(--canvas)] px-3 py-2.5"
                >
                  <div>
                    <p className="font-label text-[10px] text-[var(--text-secondary)]">GW{step.gameweek}</p>
                    <p className="text-[14px] font-extrabold text-[var(--navy)]">
                      {step.move?.out && step.move?.in
                        ? `${step.move.out} → ${step.move.in}`
                        : step.action}
                    </p>
                    <p className="mt-1 text-[12px] text-[var(--text-secondary)]">{step.reason}</p>
                  </div>
                  <div className="text-right">
                    {step.projectedGain > 0 ? (
                      <p className="text-[13px] font-bold text-[var(--positive)]">+{step.projectedGain} xP</p>
                    ) : null}
                    <p className="text-[11px] text-[var(--text-secondary)]">Bank £{step.bankAfter.toFixed(1)}m</p>
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-3 text-[12px] font-semibold text-[var(--navy)]">
              4-GW projected impact: +{plan.totalGain4Gw} xP
              {plan.wildcardWindow ? ` · Wildcard window ~GW${plan.wildcardWindow}` : ""}
            </p>
            <p className="mt-1 font-label text-[10px] text-[var(--text-secondary)]">Source: {plan.source}</p>
          </>
        ) : null}
      </div>
    </section>
  );
}
