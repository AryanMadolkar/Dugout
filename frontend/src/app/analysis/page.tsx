"use client";

import Link from "next/link";
import { AppLayout } from "@/components/v5/AppLayout";
import { ComparisonPanel } from "@/components/v5/ComparisonPanel";
import { PlayerDetailPanel } from "@/components/v5/PlayerDetailPanel";
import { TeamHeader } from "@/components/v5/TeamHeader";
import { TeamRatingPanel } from "@/components/v5/TeamRatingPanel";
import { useDashboard } from "@/context/DashboardContext";
import { projectedPoints } from "@/lib/squad-storage";

export default function AnalysisPage() {
  const { hasSquad, starters } = useDashboard();

  if (!hasSquad) {
    return (
      <AppLayout>
        <div className="panel p-8 text-center">
          <p className="text-[14px] text-[var(--text-secondary)]">Scan your squad to see analysis.</p>
          <Link href="/upload" className="control btn-coral mt-4 inline-block px-6 py-3 text-[14px]">
            Scan squad
          </Link>
        </div>
      </AppLayout>
    );
  }

  const squadXp = starters.reduce((s, p) => s + p.xp, 0);
  const avgForm = starters.reduce((s, p) => s + p.form, 0) / starters.length;

  return (
    <AppLayout teamHeader={<TeamHeader />}>
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Squad xP (XI)" value={squadXp.toFixed(1)} />
        <StatCard label="Avg form" value={avgForm.toFixed(1)} />
        <StatCard label="Projected GW" value={projectedPoints(starters).toFixed(1)} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <TeamRatingPanel />
        <PlayerDetailPanel />
      </div>
      <ComparisonPanel />
    </AppLayout>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="panel p-4 text-center">
      <p className="font-label text-[11px] text-[var(--text-secondary)]">{label}</p>
      <p className="text-[36px] font-extrabold leading-none text-[var(--navy)]">{value}</p>
    </div>
  );
}
