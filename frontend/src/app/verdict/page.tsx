"use client";

import Link from "next/link";
import { AppLayout } from "@/components/v5/AppLayout";
import { AskDugoutPanel } from "@/components/v5/AskDugoutPanel";
import { GameweekReadyPanel } from "@/components/v5/GameweekReadyPanel";
import { StrategyModeBar } from "@/components/v5/StrategyModeBar";
import { TeamHeader } from "@/components/v5/TeamHeader";
import { WeeklyVerdictPanel } from "@/components/v5/WeeklyVerdictPanel";
import { AIVerdictPanel } from "@/components/v5/AIVerdictPanel";
import { useDashboard } from "@/context/DashboardContext";

export default function VerdictPage() {
  const { hasSquad } = useDashboard();

  if (!hasSquad) {
    return (
      <AppLayout>
        <div className="panel p-8 text-center">
          <p className="text-[14px] text-[var(--text-secondary)]">Scan your squad for your weekly verdict.</p>
          <Link href="/upload" className="control btn-coral mt-4 inline-block px-6 py-3 text-[14px]">
            Scan squad
          </Link>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout teamHeader={<TeamHeader />}>
      <StrategyModeBar />
      <WeeklyVerdictPanel />
      <GameweekReadyPanel />
      <AIVerdictPanel />
      <AskDugoutPanel />
    </AppLayout>
  );
}
