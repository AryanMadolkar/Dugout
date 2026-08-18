"use client";

import { useMemo } from "react";
import { useDashboard } from "@/context/DashboardContext";
import { SectionHead } from "./ui/SectionHead";

export function ComparisonPanel() {
  const { starters, hasSquad } = useDashboard();

  const comparison = useMemo(() => {
    if (starters.length < 2) return null;
    const sorted = [...starters].sort((a, b) => b.xp - a.xp);
    const a = sorted[0];
    const b = sorted[1];
    return {
      playerA: a.name,
      playerB: b.name,
      metrics: [
        { label: "xP (next GW)", a: a.xp, b: b.xp },
        { label: "Form", a: a.form, b: b.form },
        { label: "Ownership", a: a.ownership, b: b.ownership },
        { label: "Price", a: a.price, b: b.price },
        {
          label: "Next FDR",
          a: a.nextFixtures[0]?.fdr ?? 3,
          b: b.nextFixtures[0]?.fdr ?? 3,
        },
      ],
    };
  }, [starters]);

  if (!hasSquad) {
    return (
      <section className="panel overflow-hidden">
        <SectionHead title="Comparison" />
        <p className="p-4 text-[13px] text-[var(--text-secondary)]">Scan your squad to compare players.</p>
      </section>
    );
  }

  if (!comparison) {
    return (
      <section className="panel overflow-hidden">
        <SectionHead title="Comparison" />
        <p className="p-4 text-[13px] text-[var(--text-secondary)]">Need at least two starters to compare.</p>
      </section>
    );
  }

  return (
    <section className="panel-elevated overflow-hidden">
      <SectionHead title="Comparison · top xP in XI" />
      <div className="p-4">
        <div className="mb-4 flex items-center justify-center gap-6 rounded-[3px] bg-[var(--canvas)] py-4">
          <span className="text-[18px] font-extrabold text-[var(--navy)]">{comparison.playerA}</span>
          <span
            className="flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-bold text-white"
            style={{ background: "var(--navy)" }}
          >
            vs
          </span>
          <span className="text-[18px] font-extrabold text-[var(--coral-dark)]">{comparison.playerB}</span>
        </div>

        <div className="overflow-x-auto rounded-[3px] border border-[var(--border)]">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="bg-[var(--canvas)]">
                <th className="py-2 pl-3 text-left font-label text-[10px] text-[var(--text-secondary)]">Metric</th>
                <th className="py-2 text-center font-bold">{comparison.playerA}</th>
                <th className="py-2 pr-3 text-center font-bold">{comparison.playerB}</th>
              </tr>
            </thead>
            <tbody>
              {comparison.metrics.map((m) => {
                const aWins = m.a > m.b;
                const bWins = m.b > m.a;
                return (
                  <tr key={m.label} className="border-t border-[var(--border)]">
                    <td className="py-2 pl-3 text-[var(--text-body)]">{m.label}</td>
                    <td className={`py-2 text-center font-bold ${aWins ? "bg-[var(--fdr-easy)] text-[var(--positive)]" : ""}`}>
                      {typeof m.a === "number" && m.a % 1 !== 0 ? m.a.toFixed(1) : m.a}
                    </td>
                    <td className={`py-2 pr-3 text-center font-bold ${bWins ? "bg-[var(--fdr-easy)] text-[var(--positive)]" : ""}`}>
                      {typeof m.b === "number" && m.b % 1 !== 0 ? m.b.toFixed(1) : m.b}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
