"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useDashboard } from "@/context/DashboardContext";
import type { ChipName } from "@/lib/dashboard-data";
import { CHIP_NAMES } from "@/lib/dashboard-data";
import { recommendChipStrategy } from "@/lib/chip-strategy";
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

  const recommendation = useMemo(
    () => (hasSquad ? recommendChipStrategy(starters, bench, chipUsage) : null),
    [hasSquad, starters, bench, chipUsage],
  );

  const chip = normalizeChip(activeChip);

  return (
    <section id="chip-strategy" className="panel-elevated w-full overflow-hidden">
      <SectionHead title="Chip strategy" />
      <div className={`p-4 ${expanded ? "space-y-4" : ""}`}>
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
                <p className="font-label text-[10px] text-[var(--text-secondary)]">Suggestion</p>
                <p className="mt-1 text-[14px] font-extrabold leading-snug text-[var(--navy)]">
                  {recommendation.headline}
                </p>
                <p className="mt-1 text-[12px] leading-relaxed text-[var(--text-secondary)]">
                  {recommendation.reason}
                </p>
              </>
            ) : (
              <p className="text-[13px] text-[var(--text-secondary)]">
                Scan your squad to get a chip suggestion. Hit Play on a chip to apply it this GW.
              </p>
            )}
          </div>

          <div className="flex flex-col justify-center">
            <p className="mb-2 text-[11px] text-[var(--text-secondary)]">This GW chip (one only)</p>
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
                    title={
                      spent && !selected
                        ? `${name} already used this season`
                        : `Play ${name} this GW — updates projected points for BB/TC`
                    }
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
            <p className="mb-2 text-[11px] text-[var(--text-secondary)]">Season chips — Play or mark Used</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {CHIP_NAMES.map((name) => {
                const status = chipUsage[name];
                const playing = chip === name;
                const spent = status === "used";
                const statusText = playing ? "Playing" : spent ? "Used" : "Ready";
                return (
                  <div
                    key={name}
                    className={`rounded-[3px] border p-2.5 text-left transition ${
                      playing
                        ? "border-[var(--navy)] bg-[var(--navy)]/5"
                        : "border-[var(--border)]"
                    }`}
                  >
                    <div className="mb-1.5 flex items-start justify-between gap-1">
                      <p className="text-[12px] font-bold leading-tight">{SHORT[name]}</p>
                      <span
                        className={`font-label shrink-0 text-[9px] font-bold ${
                          playing
                            ? "text-[var(--navy)]"
                            : spent
                              ? "text-[var(--coral)]"
                              : "text-[var(--positive)]"
                        }`}
                      >
                        {statusText}
                      </span>
                    </div>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        disabled={spent && !playing}
                        onClick={() => playChip(name)}
                        className={`control flex-1 px-1 py-1 text-[10px] font-semibold transition ${
                          playing
                            ? "bg-[var(--navy)] text-white"
                            : spent
                              ? "cursor-not-allowed border border-[var(--border)] opacity-40"
                              : "border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--canvas)]"
                        }`}
                      >
                        Play
                      </button>
                      <button
                        type="button"
                        onClick={() => setChipAvailability(name, spent ? "available" : "used")}
                        className={`control flex-1 px-1 py-1 text-[10px] font-semibold transition ${
                          spent
                            ? "bg-[var(--coral)] text-white"
                            : "border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--canvas)]"
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

        {expanded ? null : (
          <div className="mt-3 flex justify-end">
            <Link href="/chips" className="text-[12px] font-semibold text-[var(--coral)] hover:underline">
              Full chip calendar →
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
