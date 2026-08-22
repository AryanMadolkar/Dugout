"use client";

import { useDashboard } from "@/context/DashboardContext";
import { avgSquadOwnership, rankStrategy } from "@/lib/rank-strategy";
import { SectionHead } from "./ui/SectionHead";

export function RankStrategyPanel() {
  const {
    starters,
    hasSquad,
    strategyMode,
    fplRank,
    fplEntryId,
    setFplEntryId,
    syncFromFpl,
  } = useDashboard();

  if (!hasSquad) return null;

  const avgOwn = avgSquadOwnership(starters);
  const strategy = rankStrategy(fplRank, avgOwn, strategyMode);

  return (
    <section className="panel overflow-hidden">
      <SectionHead title="Rank strategy" />
      <div className="p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <p className="font-label text-[10px] text-[var(--text-secondary)]">FPL entry ID</p>
            <input
              type="number"
              value={fplEntryId ?? ""}
              placeholder="1234567"
              onChange={(e) => setFplEntryId(e.target.value ? Number(e.target.value) : null)}
              className="control mt-1 w-36 border border-[var(--border)] px-2 py-1 text-[14px] font-bold"
            />
          </div>
          <div>
            <p className="font-label text-[10px] text-[var(--text-secondary)]">Current rank</p>
            <p className="text-[14px] font-bold">
              {fplRank != null ? fplRank.toLocaleString() : "Link entry ID"}
            </p>
          </div>
          <div>
            <p className="font-label text-[10px] text-[var(--text-secondary)]">Template load</p>
            <p className="text-[14px] font-bold">{avgOwn.toFixed(0)}% avg owned</p>
          </div>
          {fplEntryId != null ? (
            <button
              type="button"
              onClick={() => void syncFromFpl()}
              className="control border border-[var(--border)] px-2 py-1 text-[11px] font-semibold hover:bg-[var(--canvas)]"
            >
              Sync from FPL
            </button>
          ) : null}
        </div>
        <p className="mt-3 text-[15px] font-extrabold text-[var(--navy)]">{strategy.headline}</p>
        <ul className="mt-2 space-y-1.5">
          {strategy.bullets.map((b) => (
            <li key={b} className="text-[13px] text-[var(--text-body)]">
              · {b}
            </li>
          ))}
        </ul>
        <p className="mt-3 text-[12px] text-[var(--text-secondary)]">
          Captain: {strategy.captainStyle} · Transfers: {strategy.transferStyle}
        </p>
      </div>
    </section>
  );
}
