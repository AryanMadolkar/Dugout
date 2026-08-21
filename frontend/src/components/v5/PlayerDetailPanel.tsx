"use client";

import { useEffect, useState } from "react";
import { useDashboard } from "@/context/DashboardContext";
import { fetchPlayerHistory, type PlayerHistory } from "@/lib/api";
import { estimatePlayerXp } from "@/lib/projections";
import { SectionHead } from "./ui/SectionHead";

export function PlayerDetailPanel() {
  const { selectedPlayer: player } = useDashboard();
  const [history, setHistory] = useState<PlayerHistory | null>(null);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    if (!player?.fplId) {
      setHistory(null);
      setHistoryError(null);
      return;
    }
    let cancelled = false;
    setLoadingHistory(true);
    setHistoryError(null);
    fetchPlayerHistory(player.fplId)
      .then((data) => {
        if (!cancelled) setHistory(data);
      })
      .catch((err) => {
        if (!cancelled) {
          setHistory(null);
          setHistoryError(err instanceof Error ? err.message : "Could not load history");
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingHistory(false);
      });
    return () => {
      cancelled = true;
    };
  }, [player?.fplId]);

  if (!player) {
    return (
      <section className="panel overflow-hidden">
        <SectionHead title="Player detail" />
        <p className="p-4 text-[13px] text-[var(--text-secondary)]">Click a player on the pitch or bench.</p>
      </section>
    );
  }

  const xp = estimatePlayerXp(player);
  const formValue = history?.form ?? player.form ?? player.ppg ?? 0;
  const maxPts = Math.max(1, ...(history?.history.map((h) => h.total_points) ?? [1]));

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
              {player.club} · {player.position}
              {player.isCaptain ? " · Captain" : player.isVice ? " · Vice" : ""}
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <StatBox label="xP" value={xp.toFixed(1)} hero />
          <StatBox label="Price" value={`£${player.price.toFixed(1)}m`} />
          <StatBox
            label="Form"
            value={formValue.toFixed(1)}
            hint={history ? `last ${history.games_used || "—"} GWs` : undefined}
          />
          <StatBox label="Owned" value={`${player.ownership.toFixed(1)}%`} />
        </div>

        <p className="font-label mb-2 mt-4 text-[11px] text-[var(--text-secondary)]">
          Recent form {history ? `· ${history.season_points} season pts` : ""}
        </p>
        {loadingHistory ? (
          <p className="text-[12px] text-[var(--text-secondary)]">Loading GW history…</p>
        ) : historyError ? (
          <p className="text-[12px] text-[var(--text-secondary)]">
            Form shown from FPL snapshot ({(player.form || player.ppg || 0).toFixed(1)}). History unavailable.
          </p>
        ) : history && history.history.length > 0 ? (
          <div className="space-y-2">
            <div className="flex h-16 items-end gap-1 rounded-[3px] bg-[var(--canvas)] px-2 py-2">
              {history.history.map((h) => (
                <div key={h.round} className="flex flex-1 flex-col items-center justify-end gap-1">
                  <span className="text-[9px] font-bold text-[var(--navy)]">{h.total_points}</span>
                  <div
                    className="w-full max-w-[18px] rounded-sm bg-[var(--navy)]"
                    style={{
                      height: `${Math.max(8, (h.total_points / maxPts) * 100)}%`,
                      opacity: h.minutes > 0 ? 1 : 0.35,
                    }}
                    title={`GW${h.round}: ${h.total_points} pts · ${h.minutes}'`}
                  />
                  <span className="font-label text-[8px] text-[var(--text-secondary)]">{h.round}</span>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-[var(--text-secondary)]">
              Historical form {formValue.toFixed(1)} = avg points over last {history.games_used} appearance
              {history.games_used === 1 ? "" : "s"}.
            </p>
          </div>
        ) : (
          <p className="text-[12px] text-[var(--text-secondary)]">No finished GW history yet this season.</p>
        )}

        <p className="font-label mb-2 mt-4 text-[11px] text-[var(--text-secondary)]">Next 3 fixtures</p>
        <div className="space-y-1.5">
          {player.nextFixtures.length === 0 ? (
            <p className="text-[12px] text-[var(--text-secondary)]">No upcoming fixtures loaded.</p>
          ) : (
            player.nextFixtures.map((f, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-[3px] border border-[var(--border)] bg-[var(--canvas)] px-3 py-2"
              >
                <span className="text-[13px] font-bold">
                  {f.home ? "H" : "A"} vs {f.opp}
                </span>
                <span className={`rounded px-2 py-0.5 text-[11px] font-bold ${fdrClass(f.fdr)}`}>FDR {f.fdr}</span>
              </div>
            ))
          )}
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

function StatBox({
  label,
  value,
  hero,
  hint,
}: {
  label: string;
  value: string;
  hero?: boolean;
  hint?: string;
}) {
  return (
    <div
      className={`rounded-[3px] px-3 py-2 text-center ${hero ? "bg-[var(--navy)] text-white" : "bg-[var(--canvas)]"}`}
    >
      <p className={`font-label text-[9px] ${hero ? "text-white/60" : "text-[var(--text-secondary)]"}`}>{label}</p>
      <p className={`font-extrabold ${hero ? "text-[26px] leading-tight" : "text-[14px]"}`}>{value}</p>
      {hint ? (
        <p className={`mt-0.5 text-[9px] ${hero ? "text-white/50" : "text-[var(--text-secondary)]"}`}>{hint}</p>
      ) : null}
    </div>
  );
}
