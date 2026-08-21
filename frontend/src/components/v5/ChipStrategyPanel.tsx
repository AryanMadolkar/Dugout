"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useDashboard } from "@/context/DashboardContext";
import type { ChipAvailability, ChipName } from "@/lib/dashboard-data";
import { CHIP_NAMES } from "@/lib/dashboard-data";
import { recommendChipStrategy } from "@/lib/chip-strategy";
import { PLAYABLE_CHIPS } from "@/lib/projections";
import { SectionHead } from "./ui/SectionHead";

type Props = {
  expanded?: boolean;
};

const STATUS_LABEL: Record<ChipAvailability, string> = {
  available: "Available",
  used: "Used",
  unknown: "Not set",
};

const SHORT: Record<ChipName, string> = {
  Wildcard: "WC",
  "Free Hit": "FH",
  "Bench Boost": "BB",
  "Triple Captain": "TC",
};

export function ChipStrategyPanel({ expanded }: Props) {
  const { chipUsage, setChipAvailability, starters, bench, hasSquad, activeChip, setActiveChip } = useDashboard();

  const recommendation = useMemo(
    () => (hasSquad ? recommendChipStrategy(starters, bench, chipUsage) : null),
    [hasSquad, starters, bench, chipUsage],
  );

  return (
    <section className="panel-elevated overflow-hidden">
      <SectionHead title="Chip strategy" />
      <div className="p-4">
        {recommendation ? (
          <div className="mb-3 rounded-[3px] border border-[var(--border)] bg-[var(--canvas)] px-3 py-3">
            <p className="font-label text-[10px] text-[var(--text-secondary)]">Suggestion</p>
            <p className="mt-1 text-[14px] font-extrabold text-[var(--navy)]">{recommendation.headline}</p>
            <p className="mt-1 text-[12px] leading-relaxed text-[var(--text-secondary)]">{recommendation.reason}</p>
          </div>
        ) : (
          <p className="mb-3 rounded-[3px] bg-[var(--canvas)] px-3 py-2 text-[13px] text-[var(--text-secondary)]">
            Scan your squad to get a chip suggestion. Select exactly one chip for this GW below.
          </p>
        )}

        <p className="mb-2 text-[11px] text-[var(--text-secondary)]">
          This GW chip (one only) — projections update automatically:
        </p>
        <div className="mb-4 flex flex-wrap gap-1">
          <button
            type="button"
            onClick={() => setActiveChip(null)}
            className={`control px-2.5 py-1.5 text-[11px] font-semibold ${
              !activeChip ? "bg-[var(--navy)] text-white" : "border border-[var(--border)]"
            }`}
          >
            None
          </button>
          {PLAYABLE_CHIPS.map((chip) => {
            const spent = chipUsage[chip] === "used";
            const selected = activeChip === chip;
            return (
              <button
                key={chip}
                type="button"
                disabled={spent}
                title={spent ? `${chip} already used this season` : `Play ${chip} this GW`}
                onClick={() => setActiveChip(selected ? null : chip)}
                className={`control px-2.5 py-1.5 text-[11px] font-semibold ${
                  selected
                    ? "bg-[var(--navy)] text-white"
                    : spent
                      ? "cursor-not-allowed border border-[var(--border)] opacity-40"
                      : "border border-[var(--border)] hover:bg-[var(--canvas)]"
                }`}
              >
                {SHORT[chip]}
              </button>
            );
          })}
        </div>

        <p className="mb-2 text-[11px] text-[var(--text-secondary)]">Season status (from scan or manual):</p>
        <div className={`grid gap-2 ${expanded ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-2"}`}>
          {CHIP_NAMES.map((name) => {
            const status = chipUsage[name];
            const playing = activeChip === name;
            return (
              <div key={name} className="rounded-[3px] border border-[var(--border)] p-3 text-left">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[13px] font-bold">
                    {name}
                    {playing ? (
                      <span className="ml-1 text-[9px] font-bold text-[var(--navy)]">THIS GW</span>
                    ) : null}
                  </p>
                  <span
                    className={`font-label shrink-0 text-[10px] font-bold ${
                      status === "used"
                        ? "text-[var(--coral)]"
                        : status === "available"
                          ? "text-[var(--positive)]"
                          : "text-[var(--text-secondary)]"
                    }`}
                  >
                    {STATUS_LABEL[status]}
                  </span>
                </div>
                <div className="mt-2 flex gap-1">
                  {(["available", "used"] as const).map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setChipAvailability(name, option)}
                      className={`control flex-1 px-2 py-1.5 text-[11px] font-semibold transition ${
                        status === option
                          ? option === "used"
                            ? "bg-[var(--coral)] text-white"
                            : "bg-[var(--navy)] text-white"
                          : "border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--canvas)]"
                      }`}
                    >
                      {STATUS_LABEL[option]}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        {expanded ? null : (
          <Link href="/chips" className="mt-3 inline-block text-[12px] font-semibold text-[var(--coral)] hover:underline">
            Full chip calendar →
          </Link>
        )}
      </div>
    </section>
  );
}
