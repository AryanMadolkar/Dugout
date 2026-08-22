"use client";

import Link from "next/link";
import { AppLayout } from "@/components/v5/AppLayout";
import { ComparisonPanel } from "@/components/v5/ComparisonPanel";
import { TeamHeader } from "@/components/v5/TeamHeader";
import { TransferAdvicePanel } from "@/components/v5/TransferAdvicePanel";
import { TransferPlannerPanel } from "@/components/v5/TransferPlannerPanel";
import { WhatIfPanel } from "@/components/v5/WhatIfPanel";
import { useDashboard } from "@/context/DashboardContext";

export default function TransfersPage() {
  const { hasSquad } = useDashboard();

  if (!hasSquad) {
    return (
      <AppLayout>
        <div className="panel p-8 text-center">
          <p className="text-[14px] text-[var(--text-secondary)]">Scan your squad to get transfer recommendations.</p>
          <Link href="/upload" className="control btn-coral mt-4 inline-block px-6 py-3 text-[14px]">
            Scan squad
          </Link>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout teamHeader={<TeamHeader />}>
      <TransferPlannerPanel />
      <TransferAdvicePanel />
      <section className="panel-elevated overflow-hidden p-4">
        <h2 className="font-label text-[12px] font-bold text-[var(--text-primary)]">What if?</h2>
        <div className="mt-3">
          <WhatIfPanel />
        </div>
      </section>
      <ComparisonPanel />
    </AppLayout>
  );
}
