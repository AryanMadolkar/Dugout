"use client";

import Link from "next/link";
import { AppLayout } from "@/components/v5/AppLayout";
import { ChipStrategyPanel } from "@/components/v5/ChipStrategyPanel";
import { TeamHeader } from "@/components/v5/TeamHeader";
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
      <ChipStrategyPanel expanded />
    </AppLayout>
  );
}
