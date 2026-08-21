"use client";

import Link from "next/link";
import { AppLayout } from "@/components/v5/AppLayout";
import { BestAvailablePicks } from "@/components/v5/BestAvailablePicks";
import { BenchStrip } from "@/components/v5/BenchStrip";
import { ComparisonPanel } from "@/components/v5/ComparisonPanel";
import { FixtureWatchPanel } from "@/components/v5/FixtureWatchPanel";
import { PitchView } from "@/components/v5/PitchView";
import { PlayerDetailPanel } from "@/components/v5/PlayerDetailPanel";
import { TeamHeader } from "@/components/v5/TeamHeader";
import { AIVerdictPanel } from "@/components/v5/AIVerdictPanel";
import { CaptainPanel } from "@/components/v5/CaptainPanel";
import { ChipStrategyPanel } from "@/components/v5/ChipStrategyPanel";
import { TeamRatingPanel } from "@/components/v5/TeamRatingPanel";
import { useDashboard } from "@/context/DashboardContext";

function EmptySquad() {
  return (
    <div className="panel-elevated flex flex-col items-center justify-center px-8 py-16 text-center">
      <p className="font-label text-[11px] text-[var(--coral)]">No squad loaded</p>
      <h2 className="mt-2 text-[24px] font-extrabold text-[var(--navy)]">Scan your FPL team</h2>
      <p className="mt-2 max-w-md text-[14px] text-[var(--text-secondary)]">
        Upload a screenshot from the FPL app to detect your starting XI and bench. Only players from your scan will
        appear here.
      </p>
      <Link href="/upload" className="control btn-coral mt-6 px-6 py-3 text-[14px] font-bold">
        Scan squad
      </Link>
    </div>
  );
}

export default function MyTeamPage() {
  const { hasSquad, starters, bench } = useDashboard();

  if (!hasSquad) {
    return (
      <AppLayout>
        <EmptySquad />
      </AppLayout>
    );
  }

  return (
    <AppLayout teamHeader={<TeamHeader />}>
      <div className="dashboard-grid grid gap-4" style={{ gridTemplateColumns: "minmax(340px, 1.4fr) minmax(280px, 1fr) minmax(240px, 0.85fr)" }}>
        <div className="space-y-4">
          <PitchView squad={starters} />
          <BenchStrip bench={bench} />
        </div>
        <div className="space-y-4">
          <AIVerdictPanel />
          <CaptainPanel />
          <ChipStrategyPanel />
        </div>
        <div className="dashboard-diagnostics space-y-4">
          <TeamRatingPanel />
          <PlayerDetailPanel />
        </div>
      </div>
      <BestAvailablePicks />
      <ComparisonPanel />
      <FixtureWatchPanel />
    </AppLayout>
  );
}
