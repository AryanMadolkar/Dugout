"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { TAB_ROUTES, type Tab } from "@/lib/routes";
import { fetchOverview } from "@/lib/api";

type Props = {
  activeTab: Tab;
};

export function HeaderBar({ activeTab }: Props) {
  const [gameweek, setGameweek] = useState<string>("—");

  useEffect(() => {
    fetchOverview()
      .then((o) => setGameweek(o.current_gameweek ? `GW${o.current_gameweek.id}` : "—"))
      .catch(() => setGameweek("—"));
  }, []);

  return (
    <header
      className="text-white"
      style={{
        background: "linear-gradient(180deg, #0a1623 0%, var(--navy) 55%, #0d1a28 100%)",
        boxShadow: "0 4px 20px rgba(16, 30, 46, 0.25)",
      }}
    >
      <div className="mx-auto flex max-w-[1560px] items-center justify-between gap-4 px-6 py-3">
        <Link href="/" className="flex items-center gap-3 hover:opacity-90">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-[3px] text-[13px] font-extrabold"
            style={{
              background: "linear-gradient(135deg, var(--coral) 0%, var(--coral-dark) 100%)",
              boxShadow: "0 2px 8px rgba(232,80,60,0.4)",
            }}
          >
            F
          </div>
          <div>
            <span className="block text-[14px] font-extrabold tracking-tight">FPL Manager</span>
            <span className="font-label text-[10px] text-white/50">Decision layer</span>
          </div>
        </Link>

        <div className="flex items-center gap-4">
          <StatCell label="Gameweek" value={gameweek} className="header-stat stat-pill" />
          <Link href="/upload" className="control btn-coral hidden px-3 py-2 text-[11px] sm:inline-block">
            Scan squad
          </Link>
        </div>
      </div>

      <nav
        className="mx-auto flex max-w-[1560px] gap-0 overflow-x-auto px-6 scrollbar-hide"
        style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
      >
        {(Object.entries(TAB_ROUTES) as [Tab, string][]).map(([tab, href]) => (
          <Link
            key={tab}
            href={href}
            className={`font-label relative shrink-0 px-4 py-3 text-[11px] font-semibold transition ${
              activeTab === tab ? "text-white" : "text-white/45 hover:text-white/75"
            }`}
          >
            {tab}
            {activeTab === tab ? (
              <span
                className="absolute inset-x-2 bottom-0 h-[2px] rounded-full"
                style={{ background: "linear-gradient(90deg, var(--coral), #ff8a75)" }}
              />
            ) : null}
          </Link>
        ))}
      </nav>
    </header>
  );
}

function StatCell({ label, value, className = "" }: { label: string; value: string; className?: string }) {
  return (
    <div className={`flex flex-col items-end ${className}`}>
      <span className="font-label text-[9px] text-white/45">{label}</span>
      <span className="text-[13px] font-bold">{value}</span>
    </div>
  );
}
