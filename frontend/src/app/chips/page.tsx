"use client";

import Link from "next/link";
import { AppLayout } from "@/components/v5/AppLayout";
import { ChipStrategyPanel } from "@/components/v5/ChipStrategyPanel";
import { TeamHeader } from "@/components/v5/TeamHeader";
import { DEFAULT_CHIPS } from "@/lib/dashboard-data";
import { useDashboard } from "@/context/DashboardContext";

export default function ChipsPage() {
  const { hasSquad } = useDashboard();

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
          <h2 className="font-label mb-3 text-[12px] font-bold text-[var(--text-secondary)]">Chips</h2>
          <div className="space-y-3">
            {DEFAULT_CHIPS.map((chip) => (
              <div key={chip.name} className="rounded-[3px] border border-[var(--border)] p-3">
                <div className="flex items-center justify-between">
                  <p className="text-[14px] font-bold">{chip.name}</p>
                  <span className="font-label text-[10px] font-bold text-[var(--text-secondary)]">Not linked</span>
                </div>
                <p className="mt-2 text-[12px] text-[var(--text-body)]">
                  Connect your FPL team ID to read chip usage and get timing recommendations.
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
