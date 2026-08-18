"use client";

import Link from "next/link";
import { AppLayout } from "@/components/v5/AppLayout";
import { AIVerdictPanel } from "@/components/v5/AIVerdictPanel";
import { ComparisonPanel } from "@/components/v5/ComparisonPanel";
import { TeamHeader } from "@/components/v5/TeamHeader";
import { CaptainPanel } from "@/components/v5/CaptainPanel";
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
      <div className="grid gap-4 lg:grid-cols-2">
        <AIVerdictPanel />
        <div className="space-y-4">
          <CaptainPanel />
          <div className="panel p-4">
            <h2 className="font-label mb-2 text-[12px] font-bold text-[var(--text-secondary)]">Transfer summary</h2>
            <p className="text-[13px] text-[var(--text-secondary)]">
              Connect your FPL team ID to read free transfers and bank balance. Transfer suggestions will appear once
              the optimiser is wired up.
            </p>
          </div>
        </div>
      </div>
      <ComparisonPanel />
    </AppLayout>
  );
}
