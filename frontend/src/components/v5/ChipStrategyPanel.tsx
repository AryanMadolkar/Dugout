"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useDashboard } from "@/context/DashboardContext";
import type { ChipAvailability } from "@/lib/dashboard-data";
import { CHIP_NAMES } from "@/lib/dashboard-data";
import { recommendChipStrategy } from "@/lib/chip-strategy";
import { SectionHead } from "./ui/SectionHead";

type Props = {
  expanded?: boolean;
};

const STATUS_LABEL: Record<ChipAvailability, string> = {
  available: "Available",
  used: "Used",
  unknown: "Not set",
};

const OPTIONS: ChipAvailability[] = ["available", "used"];

export function ChipStrategyPanel({ expanded }: Props) {
  const { chipUsage, setChipAvailability, starters, bench, hasSquad } = useDashboard();

  const recommendation = useMemo(
    () => (hasSquad ? recommendChipStrategy(starters, bench, chipUsage) : null),
    [hasSquad, starters, bench, chipUsage],
  );

  return (
    <section className="panel-elevated overflow-hidden">
      <SectionHead title="Chip strategy" />
      <div className="p-4">
        {recommendation ? (
          <div
            className="mb-3 rounded-[3px] border px-3 py-3"
            style={{
              borderColor: recommendation.chip === "Hold" ? "var(--border)" : "var(--coral)",
              background:
                recommendation.chip === "Hold"
                  ? "var(--canvas)"
                  : "linear-gradient(135deg, #fff8f0 0%, #fff 70%)",
            }}
          >
            <p className="font-label text-[10px] text-[var(--coral)]">Best for your squad</p>
            <p className="mt-1 text-[15px] font-extrabold text-[var(--navy)]">{recommendation.headline}</p>
            <p className="mt-1 text-[12px] leading-relaxed text-[var(--text-secondary)]">{recommendation.reason}</p>
            {recommendation.alternatives.length > 0 ? (
              <ul className="mt-2 space-y-1">
                {recommendation.alternatives.map((alt) => (
                  <li key={alt.chip} className="text-[11px] text-[var(--text-secondary)]">
                    <span className="font-semibold text-[var(--navy)]">{alt.chip}</span> · {alt.note}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : (
          <p className="mb-3 rounded-[3px] bg-[var(--canvas)] px-3 py-2 text-[13px] text-[var(--text-secondary)]">
            Scan your squad to get a chip recommendation based on fixtures and projected points.
          </p>
        )}

        <p className="mb-2 text-[11px] text-[var(--text-secondary)]">Mark chips you have already used:</p>
        <div className={`grid gap-2 ${expanded ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-2"}`}>
          {CHIP_NAMES.map((name) => {
            const status = chipUsage[name];
            const isRecommended = recommendation?.chip === name;
            return (
              <div
                key={name}
                className={`rounded-[3px] border p-3 text-left ${
                  isRecommended ? "border-[var(--coral)] bg-[var(--fdr-hard)]/20" : "border-[var(--border)]"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[13px] font-bold">
                    {name}
                    {isRecommended ? (
                      <span className="ml-1 text-[9px] font-extrabold text-[var(--coral)]">BEST</span>
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
                  {OPTIONS.map((option) => (
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
