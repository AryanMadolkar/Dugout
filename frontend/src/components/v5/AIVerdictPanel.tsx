"use client";

import Link from "next/link";
import { useDashboard } from "@/context/DashboardContext";
import { SectionHead } from "./ui/SectionHead";

export function AIVerdictPanel() {
  const { hasSquad } = useDashboard();

  if (!hasSquad) {
    return (
      <section className="panel overflow-hidden">
        <SectionHead title="AI Verdict" />
        <p className="p-4 text-[13px] text-[var(--text-secondary)]">
          Scan your squad to get transfer recommendations.
        </p>
      </section>
    );
  }

  return (
    <section className="panel overflow-hidden">
      <SectionHead title="AI Verdict" />
      <div className="p-4">
        <p className="text-[14px] font-bold text-[var(--navy)]">Optimiser not connected yet</p>
        <p className="mt-2 text-[13px] leading-relaxed text-[var(--text-secondary)]">
          Your scanned squad is loaded. Transfer suggestions will appear here once the ML optimiser is wired up — no
          placeholder recommendations are shown.
        </p>
        <Link href="/upload" className="mt-4 inline-block text-[12px] font-semibold text-[var(--coral)] hover:underline">
          Re-scan squad →
        </Link>
      </div>
    </section>
  );
}
