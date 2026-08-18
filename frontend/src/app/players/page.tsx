"use client";

import { AppLayout } from "@/components/v5/AppLayout";
import { BestAvailablePicks } from "@/components/v5/BestAvailablePicks";
import { TeamHeader } from "@/components/v5/TeamHeader";

export default function PlayersPage() {
  return (
    <AppLayout teamHeader={<TeamHeader />}>
      <BestAvailablePicks fullPage />
    </AppLayout>
  );
}
