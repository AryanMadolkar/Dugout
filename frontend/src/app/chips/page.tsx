"use client";

import Link from "next/link";
import { AppLayout } from "@/components/v5/AppLayout";
import { ChipStrategyPanel } from "@/components/v5/ChipStrategyPanel";
import { TeamHeader } from "@/components/v5/TeamHeader";
import { useDashboard } from "@/context/DashboardContext";
import { CHIP_NAMES } from "@/lib/dashboard-data";
import { PLAYABLE_CHIPS } from "@/lib/projections";

const STATUS_LABEL = {
  available: "Available",
  used: "Used",
  unknown: "Not set",
} as const;

const SHORT = {
  Wildcard: "WC",
  "Free Hit": "FH",
  "Bench Boost": "BB",
  "Triple Captain": "TC",
} as const;

export default function ChipsPage() {
  const { hasSquad, chipUsage, setChipAvailability, activeChip, setActiveChip } = useDashboard();

  return (
    <AppLayout teamHeader={hasSquad ? <TeamHeader /> : undefined}>
      {!hasSquad ? (
        <div className="panel mb-4 p-4 text-[13px] text-[var(--text-secondary)]">
          Scan your squad first.{" "}
          <Link href="/upload" className="font-semibold text-[var(--coral)] hover:underline">
            Upload screenshot →
          </Link>
        </div>
      ) : null}
      <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <ChipStrategyPanel expanded />
        <div className="panel p-4">
          <h2 className="font-label mb-3 text-[12px] font-bold text-[var(--text-secondary)]">This gameweek</h2>
          <p className="mb-3 text-[12px] text-[var(--text-secondary)]">
            Only one chip can be active per GW. Selecting a chip updates projected points and AI verdict immediately.
          </p>
          <div className="mb-6 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setActiveChip(null)}
              className={`control px-3 py-2 text-[12px] font-semibold ${
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
                  onClick={() => setActiveChip(selected ? null : chip)}
                  className={`control px-3 py-2 text-[12px] font-semibold ${
                    selected
                      ? "bg-[var(--navy)] text-white"
                      : spent
                        ? "cursor-not-allowed border border-[var(--border)] opacity-40"
                        : "border border-[var(--border)]"
                  }`}
                >
                  {SHORT[chip]} · {chip}
                </button>
              );
            })}
          </div>

          <h2 className="font-label mb-3 text-[12px] font-bold text-[var(--text-secondary)]">Season status</h2>
          <div className="space-y-3">
            {CHIP_NAMES.map((name) => {
              const status = chipUsage[name];
              return (
                <div key={name} className="rounded-[3px] border border-[var(--border)] p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[14px] font-bold">
                      {name}
                      {activeChip === name ? (
                        <span className="ml-2 text-[10px] font-bold text-[var(--navy)]">THIS GW</span>
                      ) : null}
                    </p>
                    <span
                      className={`font-label text-[10px] font-bold ${
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
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setChipAvailability(name, "available")}
                      className={`control flex-1 py-2 text-[12px] font-semibold ${
                        status === "available"
                          ? "bg-[var(--navy)] text-white"
                          : "border border-[var(--border)] hover:bg-[var(--canvas)]"
                      }`}
                    >
                      Available
                    </button>
                    <button
                      type="button"
                      onClick={() => setChipAvailability(name, "used")}
                      className={`control flex-1 py-2 text-[12px] font-semibold ${
                        status === "used"
                          ? "bg-[var(--coral)] text-white"
                          : "border border-[var(--border)] hover:bg-[var(--canvas)]"
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
    </AppLayout>
  );
}
