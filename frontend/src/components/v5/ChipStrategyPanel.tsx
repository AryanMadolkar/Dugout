"use client";

import Link from "next/link";
import { DEFAULT_CHIPS } from "@/lib/dashboard-data";
import { SectionHead } from "./ui/SectionHead";

type Props = {
  expanded?: boolean;
};

export function ChipStrategyPanel({ expanded }: Props) {
  return (
    <section className="panel-elevated overflow-hidden">
      <SectionHead title="Chip strategy" />
      <div className="p-4">
        <p className="mb-3 rounded-[3px] bg-[var(--canvas)] px-3 py-2 text-[13px] text-[var(--text-secondary)]">
          Chip timing recommendations will appear once the optimiser is connected. Chip availability is not read from
          your FPL account yet.
        </p>

        <div className={`grid gap-2 ${expanded ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-2"}`}>
          {DEFAULT_CHIPS.map((chip) => (
            <div
              key={chip.name}
              className="rounded-[3px] border border-[var(--border)] p-3 text-left"
            >
              <p className="text-[13px] font-bold">{chip.name}</p>
              <p className="font-label mt-1 text-[10px] text-[var(--text-secondary)]">Status unknown</p>
            </div>
          ))}
        </div>
        {expanded ? null : (
          <Link href="/chips" className="mt-3 inline-block text-[12px] font-semibold text-[var(--coral)] hover:underline">
            Full chip calendar →
          </Link>
        )}
      </div>
    </section>
  );
}
