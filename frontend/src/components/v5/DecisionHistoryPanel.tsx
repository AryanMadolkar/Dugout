"use client";

import { useEffect, useState } from "react";
import { accuracyStats, loadDecisionHistory, type StoredDecision } from "@/lib/decision-store";
import { SectionHead } from "./ui/SectionHead";

export function DecisionHistoryPanel() {
  const [history, setHistory] = useState<StoredDecision[]>([]);

  useEffect(() => {
    setHistory(loadDecisionHistory());
  }, []);

  const stats = accuracyStats(history);

  return (
    <section className="panel-elevated overflow-hidden">
      <SectionHead title="Decision history" />
      <div className="grid grid-cols-3 gap-px bg-[var(--border)] border-b border-[var(--border)]">
        <Stat label="Transfer accuracy" value={`${stats.transferAccuracy}%`} />
        <Stat label="Captain accuracy" value={`${stats.captainAccuracy}%`} />
        <Stat label="Chip accuracy" value={`${stats.chipAccuracy}%`} />
      </div>
      <div className="divide-y divide-[var(--border)]">
        {history.length === 0 ? (
          <p className="p-4 text-[13px] text-[var(--text-secondary)]">
            Recommendations will be logged here each gameweek.
          </p>
        ) : (
          history.slice(0, 6).map((h) => (
            <div key={h.timestamp} className="grid gap-2 px-4 py-3 sm:grid-cols-3">
              <div>
                <p className="font-label text-[10px] text-[var(--text-secondary)]">GW{h.gameweek} · Dugout</p>
                <p className="text-[13px] font-bold">{h.dugoutRecommendation}</p>
              </div>
              <div>
                <p className="font-label text-[10px] text-[var(--text-secondary)]">You</p>
                <p className="text-[13px]">{h.userAction}</p>
              </div>
              <div>
                <p className="font-label text-[10px] text-[var(--text-secondary)]">Outcome</p>
                <p
                  className={`text-[13px] font-bold ${
                    (h.actualDelta ?? 0) >= 0 ? "text-[var(--positive)]" : "text-[var(--coral)]"
                  }`}
                >
                  {h.actualDelta != null ? `${h.actualDelta >= 0 ? "+" : ""}${h.actualDelta} pts` : "Pending"}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white px-3 py-3 text-center">
      <p className="font-label text-[9px] text-[var(--text-secondary)]">{label}</p>
      <p className="text-[20px] font-extrabold text-[var(--navy)]">{value}</p>
    </div>
  );
}
