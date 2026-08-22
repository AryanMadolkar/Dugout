"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useDashboard } from "@/context/DashboardContext";
import type { ChipName } from "@/lib/dashboard-data";
import { CHIP_NAMES } from "@/lib/dashboard-data";
import { recommendChipStrategy } from "@/lib/chip-strategy";
import { buildChipTimeline } from "@/lib/chip-timeline";
import { fetchOverview } from "@/lib/api";
import { PLAYABLE_CHIPS, normalizeChip } from "@/lib/projections";
import { SectionHead } from "./ui/SectionHead";

type Props = {
  expanded?: boolean;
};

const SHORT: Record<ChipName, string> = {
  Wildcard: "WC",
  "Free Hit": "FH",
  "Bench Boost": "BB",
  "Triple Captain": "TC",
};

export function ChipStrategyPanel({ expanded }: Props) {
  const { chipUsage, setChipAvailability, playChip, starters, bench, hasSquad, activeChip, setActiveChip } =
    useDashboard();
  const [gw, setGw] = useState(1);

  useEffect(() => {
    fetchOverview()
      .then((o) => setGw(o.current_gameweek?.id ?? 1))
      .catch(() => setGw(1));
  }, []);

  const recommendation = useMemo(
    () => (hasSquad ? recommendChipStrategy(starters, bench, chipUsage) : null),
    [hasSquad, starters, bench, chipUsage],
  );

  const timeline = useMemo(
    () => (hasSquad ? buildChipTimeline(gw, starters, bench, chipUsage) : null),
    [hasSquad, gw, starters, bench, chipUsage],
  );

  const chip = normalizeChip(activeChip);

  return (
    <section id="chip-strategy" className="panel-elevated w-full overflow-hidden">
      <SectionHead title="Chip strategy" />
      <div className={`p-4 ${expanded ? "space-y-4" : ""}`}>
        {timeline ? (
          <div className="mb-4 rounded-[3px] border border-[var(--border)] bg-[var(--canvas)] px-3 py-3">
            <p className="font-label text-[10px] text-[var(--text-secondary)]">Dugout recommends</p>
            <p className="mt-1 text-[14px] font-extrabold text-[var(--navy)]">{timeline.recommendation}</p>
          </div>
        ) : null}

        <div
          className={
            expanded
              ? "grid gap-4 lg:grid-cols-[minmax(240px,1.1fr)_minmax(200px,0.7fr)_1fr]"
              : "grid gap-4 md:grid-cols-[minmax(220px,1.15fr)_auto_1fr] md:items-stretch"
          }
        >
          <div className="rounded-[3px] border border-[var(--border)] bg-[var(--canvas)] px-3 py-3">
            {recommendation ? (
              <>
                <p className="font-label text-[10px] text-[var(--text-secondary)]">This GW</p>
                <p className="mt-1 text-[14px] font-extrabold leading-snug text-[var(--navy)]">
                  {recommendation.headline}
                </p>
                <p className="mt-1 text-[12px] leading-relaxed text-[var(--text-secondary)]">
                  {recommendation.reason}
                </p>
              </>
            ) : (
              <p className="text-[13px] text-[var(--text-secondary)]">Scan your squad for chip guidance.</p>
            )}
          </div>

          <div className="flex flex-col justify-center">
            <p className="mb-2 text-[11px] text-[var(--text-secondary)]">This GW chip</p>
            <div className="flex flex-wrap gap-1">
              <button
                type="button"
                onClick={() => setActiveChip(null)}
                className={`control px-2.5 py-1.5 text-[11px] font-semibold ${
                  !chip ? "bg-[var(--navy)] text-white" : "border border-[var(--border)]"
                }`}
              >
                None
              </button>
              {PLAYABLE_CHIPS.map((name) => {
                const selected = chip === name;
                const spent = chipUsage[name] === "used";
                return (
                  <button
                    key={name}
                    type="button"
                    disabled={spent && !selected}
                    onClick={() => (selected ? setActiveChip(null) : playChip(name))}
                    className={`control px-2.5 py-1.5 text-[11px] font-semibold ${
                      selected
                        ? "bg-[var(--navy)] text-white"
                        : spent
                          ? "cursor-not-allowed border border-[var(--border)] opacity-40"
                          : "border border-[var(--border)] hover:bg-[var(--canvas)]"
                    }`}
                  >
                    {SHORT[name]}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="mb-2 text-[11px] text-[var(--text-secondary)]">Season chips</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {CHIP_NAMES.map((name) => {
                const status = chipUsage[name];
                const playing = chip === name;
                const spent = status === "used";
                const window = timeline?.windows.find((w) => w.chip === name);
                return (
                  <div
                    key={name}
                    className={`rounded-[3px] border p-2.5 text-left ${
                      playing ? "border-[var(--navy)] bg-[var(--navy)]/5" : "border-[var(--border)]"
                    }`}
                  >
                    <p className="text-[12px] font-bold">{SHORT[name]}</p>
                    {window ? (
                      <p className="mt-1 text-[10px] text-[var(--text-secondary)]">
                        Best {window.label} · +{window.projectedValue}
                      </p>
                    ) : null}
                    <div className="mt-2 flex gap-1">
                      <button
                        type="button"
                        disabled={spent && !playing}
                        onClick={() => playChip(name)}
                        className="control flex-1 border border-[var(--border)] px-1 py-1 text-[10px] font-semibold"
                      >
                        Play
                      </button>
                      <button
                        type="button"
                        onClick={() => setChipAvailability(name, spent ? "available" : "used")}
                        className={`control flex-1 px-1 py-1 text-[10px] font-semibold ${
                          spent ? "bg-[var(--coral)] text-white" : "border border-[var(--border)]"
                        }`}
                      >
                        Used
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {expanded && timeline ? (
          <div>
            <p className="mb-2 font-label text-[11px] text-[var(--text-secondary)]">Chip timeline</p>
            <div className="flex gap-1 overflow-x-auto pb-1">
              {timeline.upcomingGws.map((g) => (
                <div
                  key={g}
                  className="flex shrink-0 flex-col items-center rounded-[3px] border border-[var(--border)] px-2 py-2"
                >
                  <span className="font-label text-[9px] text-[var(--text-secondary)]">GW{g}</span>
                  <div className="mt-1 flex gap-0.5">
                    {timeline.windows
                      .filter((w) => w.available && w.bestGw === g)
                      .map((w) => (
                        <span
                          key={w.chip}
                          className="rounded bg-[var(--navy)] px-1 text-[8px] font-bold text-white"
                        >
                          {SHORT[w.chip]}
                        </span>
                      ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {timeline.windows.map((w) => (
                <div key={w.chip} className="rounded-[3px] border border-[var(--border)] px-3 py-2">
                  <p className="text-[13px] font-bold">
                    {w.chip} · {w.label}
                  </p>
                  <p className="text-[12px] font-semibold text-[var(--positive)]">+{w.projectedValue} projected</p>
                  <p className="text-[11px] text-[var(--text-secondary)]">{w.reason}</p>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {!expanded ? (
          <div className="mt-3 flex justify-end">
            <Link href="/chips" className="text-[12px] font-semibold text-[var(--coral)] hover:underline">
              Full chip optimizer →
            </Link>
          </div>
        ) : null}
      </div>
    </section>
  );
}
