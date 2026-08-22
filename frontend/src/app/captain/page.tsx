"use client";

import Link from "next/link";
import { AppLayout } from "@/components/v5/AppLayout";
import { CaptainOptimizerPanel } from "@/components/v5/CaptainOptimizerPanel";
import { StrategyModeBar } from "@/components/v5/StrategyModeBar";
import { TeamHeader } from "@/components/v5/TeamHeader";
import { useDashboard } from "@/context/DashboardContext";

export default function CaptainPage() {
  const { hasSquad } = useDashboard();

  if (!hasSquad) {
    return (
      <AppLayout>
        <div className="panel p-8 text-center">
          <p className="text-[14px] text-[var(--text-secondary)]">Scan your squad for captain picks.</p>
          <Link href="/upload" className="control btn-coral mt-4 inline-block px-6 py-3 text-[14px]">
            Scan squad
          </Link>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout teamHeader={<TeamHeader />}>
      <StrategyModeBar compact />
      <CaptainOptimizerPanel />
    </AppLayout>
  );
}
