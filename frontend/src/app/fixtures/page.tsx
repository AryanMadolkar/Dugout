"use client";

import { AppLayout } from "@/components/v5/AppLayout";
import { FixtureWatchPanel } from "@/components/v5/FixtureWatchPanel";
import { GameweekFixturesList } from "@/components/v5/GameweekFixturesList";
import { TeamHeader } from "@/components/v5/TeamHeader";

export default function FixturesPage() {
  return (
    <AppLayout teamHeader={<TeamHeader />}>
      <div className="grid gap-4 lg:grid-cols-2">
        <GameweekFixturesList />
        <FixtureWatchPanel />
      </div>
    </AppLayout>
  );
}
