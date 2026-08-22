"use client";

import { useEffect, useMemo, useState } from "react";
import { useDashboard } from "@/context/DashboardContext";
import { fetchOverview, fetchTransferAdvice } from "@/lib/api";
import { buildTransferPlan } from "@/lib/transfer-plan";
import { SectionHead } from "./ui/SectionHead";

export function TransferPlannerPanel() {
  const { hasSquad, allPlayers, starters, bench, activeChip, bank, freeTransfers } = useDashboard();
  const [gw, setGw] = useState(1);
  const [advice, setAdvice] = useState<Awaited<ReturnType<typeof fetchTransferAdvice>> | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchOverview()
      .then((o) => setGw(o.current_gameweek?.id ?? 1))
      .catch(() => setGw(1));
  }, []);

  useEffect(() => {
    if (!hasSquad) return;
    setLoading(true);
    fetchTransferAdvice(
      allPlayers.map((p) => ({
        id: p.id,
        name: p.name,
        club: p.club,
        position: p.position,
        price: p.price,
        xp: p.xp,
        form: p.form,
        ownership: p.ownership,
        slot: p.slot,
      })),
      activeChip,
    )
      .then(setAdvice)
      .catch(() => setAdvice(null))
      .finally(() => setLoading(false));
  }, [hasSquad, allPlayers, activeChip]);

  const plan = useMemo(
    () => buildTransferPlan(gw, advice?.transfers ?? [], bank, freeTransfers),
    [gw, advice, bank, freeTransfers],
  );

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
        ) : (
          <>
            {advice?.summary ? (
              <p className="mb-4 text-[13px] leading-relaxed text-[var(--text-body)]">{advice.summary}</p>
            ) : null}
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
          </>
        )}
      </div>
    </section>
  );
}
