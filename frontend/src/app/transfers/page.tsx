"use client";

import Link from "next/link";
import { AppLayout } from "@/components/v5/AppLayout";
import { ComparisonPanel } from "@/components/v5/ComparisonPanel";
import { TeamHeader } from "@/components/v5/TeamHeader";
import { TransferAdvicePanel } from "@/components/v5/TransferAdvicePanel";
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
      <TransferAdvicePanel />
      <ComparisonPanel />
    </AppLayout>
  );
}
