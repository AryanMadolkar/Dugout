"use client";

import Link from "next/link";
import { AppLayout } from "@/components/v5/AppLayout";
import { OwnedPlayersPanel } from "@/components/v5/OwnedPlayersPanel";
import { TeamHeader } from "@/components/v5/TeamHeader";
import { useDashboard } from "@/context/DashboardContext";

export default function PlayersPage() {
  const { hasSquad } = useDashboard();

  return (
    <AppLayout teamHeader={hasSquad ? <TeamHeader /> : undefined}>
      <OwnedPlayersPanel />
      {!hasSquad ? (
        <p className="mt-4 text-center text-[13px] text-[var(--text-secondary)]">
          <Link href="/upload" className="font-semibold text-[var(--coral)] hover:underline">
            Scan your squad
          </Link>{" "}
          to populate owned players.
        </p>
      ) : null}
    </AppLayout>
  );
}
