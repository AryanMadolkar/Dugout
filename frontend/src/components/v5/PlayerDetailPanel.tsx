"use client";

import { useDashboard } from "@/context/DashboardContext";
import { SectionHead } from "./ui/SectionHead";

export function PlayerDetailPanel() {
  const { selectedPlayer: player } = useDashboard();

  if (!player) {
    return (
      <section className="panel overflow-hidden">
        <SectionHead title="Player detail" />
        <p className="p-4 text-[13px] text-[var(--text-secondary)]">Click a player on the pitch or bench.</p>
      </section>
    );
  }

  return (
    <section className="panel-elevated overflow-hidden">
      <SectionHead title="Player detail" />
      <div className="p-4">
        <div
          className="flex items-center gap-3 rounded-[3px] p-3"
          style={{
            background: `linear-gradient(135deg, ${player.clubColor}18 0%, transparent 100%)`,
            borderLeft: `3px solid ${player.clubColor}`,
          }}
        >
          <div
            className="flex h-14 w-14 items-center justify-center rounded-full text-[14px] font-extrabold text-[var(--navy)]"
            style={{ boxShadow: `inset 0 0 0 3px ${player.clubColor}` }}
          >
            {player.initials}
          </div>
          <div>
            <p className="text-[20px] font-extrabold">{player.name}</p>
            <p className="font-label text-[11px] text-[var(--text-secondary)]">
              {player.club} · {player.position} · £{player.price}m
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <StatBox label="xP" value={player.xp.toFixed(1)} hero />
          <StatBox label="Form" value={player.form.toFixed(1)} />
          <StatBox label="Owned" value={`${player.ownership}%`} />
        </div>

        <p className="font-label mb-2 mt-4 text-[11px] text-[var(--text-secondary)]">Next 3 fixtures</p>
        <div className="space-y-1.5">
          {player.nextFixtures.map((f, i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-[3px] border border-[var(--border)] bg-[var(--canvas)] px-3 py-2"
            >
              <span className="text-[13px] font-bold">{f.home ? "H" : "A"} vs {f.opp}</span>
              <span className={`rounded px-2 py-0.5 text-[11px] font-bold ${fdrClass(f.fdr)}`}>FDR {f.fdr}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function fdrClass(fdr: number) {
  if (fdr <= 2) return "bg-[var(--fdr-easy)] text-[var(--positive)]";
  if (fdr === 3) return "bg-[var(--fdr-neutral)] text-[var(--text-body)]";
  return "bg-[var(--fdr-hard)] text-[var(--coral-dark)]";
}

function StatBox({ label, value, hero }: { label: string; value: string; hero?: boolean }) {
  return (
    <div
      className={`rounded-[3px] px-3 py-2 text-center ${hero ? "bg-[var(--navy)] text-white" : "bg-[var(--canvas)]"}`}
    >
      <p className={`font-label text-[9px] ${hero ? "text-white/60" : "text-[var(--text-secondary)]"}`}>{label}</p>
      <p className={`font-extrabold ${hero ? "text-[26px] leading-tight" : "text-[14px]"}`}>{value}</p>
    </div>
  );
}
