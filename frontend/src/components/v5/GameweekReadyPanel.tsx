"use client";

import { useEffect, useMemo, useState } from "react";
import { useDashboard } from "@/context/DashboardContext";
import { fetchAiVerdict, fetchOverview, fetchTransferAdvice } from "@/lib/api";
import { managerAdviceContext, squadToApiPayload } from "@/lib/advice-context";
import { buildGameweekReady } from "@/lib/gameweek-ready";
import { SectionHead } from "./ui/SectionHead";

export function GameweekReadyPanel() {
  const { hasSquad, squad, starters, bench, activeChip, openModal, bank, freeTransfers, fplRank, strategyMode } =
    useDashboard();
  const [gw, setGw] = useState<number | null>(null);
  const [verdict, setVerdict] = useState<Awaited<ReturnType<typeof fetchAiVerdict>> | null>(null);
  const [transfer, setTransfer] = useState<Awaited<ReturnType<typeof fetchTransferAdvice>> | null>(null);

  useEffect(() => {
    fetchOverview()
      .then((o) => setGw(o.current_gameweek?.id ?? null))
      .catch(() => setGw(null));
  }, []);

  useEffect(() => {
    if (!hasSquad) return;
    const payload = squadToApiPayload([...starters, ...bench]);
    const ctx = managerAdviceContext({ bank, freeTransfers, fplRank, strategyMode });
    Promise.all([fetchAiVerdict(payload, activeChip, ctx), fetchTransferAdvice(payload, activeChip, ctx)])
      .then(([v, t]) => {
        setVerdict(v);
        setTransfer(t);
      })
      .catch(() => {
        setVerdict(null);
        setTransfer(null);
      });
  }, [hasSquad, starters, bench, activeChip, bank, freeTransfers, fplRank, strategyMode]);

  const ready = useMemo(() => {
    if (!squad) return null;
    return buildGameweekReady(
      squad,
      starters,
      bench,
      activeChip,
      verdict,
      transfer?.transfers[0] ?? null,
    );
  }, [squad, starters, bench, activeChip, verdict, transfer]);

  if (!hasSquad || !ready) return null;

  return (
    <section className="panel-elevated overflow-hidden">
      <SectionHead
        title={`Gameweek ready${gw ? ` · GW${gw}` : ""}`}
        right={
          <span className="rounded-[3px] bg-[var(--navy)] px-2 py-0.5 text-[10px] font-bold text-white">
            {ready.confidence}% confidence
          </span>
        }
      />
      <div className="grid gap-px bg-[var(--border)] md:grid-cols-2 lg:grid-cols-4">
        <ReadyCell label="Transfer" value={ready.transfer?.label ?? "Roll"} sub={ready.transfer?.detail} />
        <ReadyCell label="Captain" value={ready.captain.name} sub={`${ready.captain.xp.toFixed(1)} xPts`} />
        <ReadyCell label="Formation" value={ready.formation} sub={ready.chip ?? "No chip"} />
        <ReadyCell
          label="Projected"
          value={ready.projectedScore.toFixed(1)}
          sub={`Rating ${ready.teamRating} → ${Math.round(ready.ratingAfter)}`}
          hero
        />
      </div>
      <div className="border-t border-[var(--border)] px-4 py-3">
        <p className="font-label text-[10px] text-[var(--text-secondary)]">Bench order</p>
        <p className="mt-1 text-[12px] text-[var(--text-body)]">{ready.benchOrder.join(" · ") || "—"}</p>
        <button
          type="button"
          onClick={() => openModal("whatIf")}
          className="control btn-coral mt-3 w-full py-2.5 text-[13px] font-bold sm:w-auto sm:px-6"
        >
          Review gameweek
        </button>
      </div>
    </section>
  );
}

function ReadyCell({
  label,
  value,
  sub,
  hero,
}: {
  label: string;
  value: string;
  sub?: string;
  hero?: boolean;
}) {
  return (
    <div className={`bg-white p-4 ${hero ? "md:col-span-2 lg:col-span-1" : ""}`}>
      <p className="font-label text-[10px] text-[var(--text-secondary)]">{label}</p>
      <p className={`mt-1 font-extrabold text-[var(--navy)] ${hero ? "text-[32px] leading-none" : "text-[15px]"}`}>
        {value}
      </p>
      {sub ? <p className="mt-1 text-[11px] text-[var(--text-secondary)]">{sub}</p> : null}
    </div>
  );
}
