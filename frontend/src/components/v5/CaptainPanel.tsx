"use client";

import { useMemo } from "react";
import { useDashboard } from "@/context/DashboardContext";
import { estimatePlayerXp } from "@/lib/projections";
import { SectionHead } from "./ui/SectionHead";

export function CaptainPanel() {
  const { starters, hasSquad } = useDashboard();

  const ranked = useMemo(
    () =>
      [...starters]
        .map((p) => ({ player: p, xp: estimatePlayerXp(p) }))
        .sort((a, b) => b.xp - a.xp),
    [starters],
  );
  const captain = useMemo(() => starters.find((p) => p.isCaptain) ?? null, [starters]);
  const alternatives = useMemo(() => ranked.filter((r) => !r.player.isCaptain).slice(0, 3), [ranked]);

  if (!hasSquad) {
    return (
      <section className="panel overflow-hidden">
        <SectionHead title="Captain" />
        <p className="p-4 text-[13px] text-[var(--text-secondary)]">Scan your squad to see captain picks.</p>
      </section>
    );
  }

  const pick = captain ?? alternatives[0]?.player ?? null;
  const pickXp = pick ? estimatePlayerXp(pick) : 0;

  if (!pick) {
    return (
      <section className="panel overflow-hidden">
        <SectionHead title="Captain" />
        <p className="p-4 text-[13px] text-[var(--text-secondary)]">No starters detected.</p>
      </section>
    );
  }

  return (
    <section className="panel-elevated overflow-hidden">
      <SectionHead title="Captain" />
      <div className="p-4">
        <div
          className="rounded-[3px] p-4"
          style={{
            background: "linear-gradient(135deg, #fff8f0 0%, #fff 50%, var(--fdr-easy) 100%)",
            border: "2px solid var(--coral)",
            boxShadow: "0 4px 16px rgba(232,80,60,0.12)",
          }}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[20px] font-extrabold text-[var(--navy)]">{pick.name}</p>
              <p className="font-label mt-0.5 text-[11px] text-[var(--text-secondary)]">
                {pick.club}
                {captain ? " · detected from scan" : " · highest xP in XI"}
              </p>
            </div>
            <span
              className="flex h-8 w-8 items-center justify-center rounded-full text-[13px] font-extrabold text-white"
              style={{ background: "linear-gradient(135deg, var(--coral), var(--gold))" }}
            >
              C
            </span>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-[3px] bg-white/80 px-2 py-1.5 text-center">
              <p className="font-label text-[9px] text-[var(--text-secondary)]">Form</p>
              <p className="text-[13px] font-extrabold">{(pick.form || pick.ppg || 0).toFixed(1)}</p>
            </div>
            <div className="rounded-[3px] bg-white/80 px-2 py-1.5 text-center">
              <p className="font-label text-[9px] text-[var(--text-secondary)]">Owned</p>
              <p className="text-[13px] font-extrabold">{pick.ownership.toFixed(1)}%</p>
            </div>
          </div>
          <p className="mt-3 text-right text-[24px] font-extrabold text-[var(--positive)]">{pickXp.toFixed(1)} xP</p>
        </div>

        {alternatives.filter((a) => a.player.id !== pick.id).length > 0 ? (
          <>
            <p className="font-label mb-2 mt-4 text-[11px] text-[var(--text-secondary)]">Alternatives</p>
            <div className="space-y-2">
              {alternatives
                .filter((a) => a.player.id !== pick.id)
                .map((alt, i) => (
                  <div
                    key={alt.player.id}
                    className="flex items-center justify-between rounded-[3px] border border-[var(--border)] bg-[var(--canvas)] px-3 py-2.5"
                  >
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--navy)]/10 text-[11px] font-bold text-[var(--navy)]">
                        {i + 2}
                      </span>
                      <div>
                        <p className="text-[13px] font-bold">{alt.player.name}</p>
                        <p className="font-label text-[10px] text-[var(--text-secondary)]">{alt.player.club}</p>
                      </div>
                    </div>
                    <span className="text-[15px] font-extrabold text-[var(--navy)]">{alt.xp.toFixed(1)}</span>
                  </div>
                ))}
            </div>
          </>
        ) : null}
      </div>
    </section>
  );
}
