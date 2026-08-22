"use client";

import { AppLayout } from "@/components/v5/AppLayout";
import { BestPicksPanel, DifferentialsPanel } from "@/components/v5/BestPicksPanel";
import { TeamHeader } from "@/components/v5/TeamHeader";
import { useDashboard } from "@/context/DashboardContext";

export default function PicksPage() {
  const { hasSquad } = useDashboard();

  return (
    <AppLayout teamHeader={hasSquad ? <TeamHeader /> : undefined}>
      <BestPicksPanel />
      <DifferentialsPanel />
    </AppLayout>
  );
}
