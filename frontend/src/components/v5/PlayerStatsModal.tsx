"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchPlayerHistory, fetchPlayers, fetchTeams, type PlayerHistory } from "@/lib/api";
import type { SquadPlayer } from "@/lib/dashboard-data";
import type { Player } from "@/lib/types";
import { estimatePlayerXp } from "@/lib/projections";
import { Modal } from "./ui/Modal";

type Props = {
  player: SquadPlayer | null;
  open: boolean;
  onClose: () => void;
};

function statusLabel(status: string | undefined, news: string | null | undefined) {
  if (news) return news;
  switch (status) {
    case "a":
      return "Available";
    case "d":
      return "Doubtful";
    case "i":
      return "Injured";
    case "u":
      return "Unavailable";
    case "n":
      return "Not in squad";
    default:
      return null;
  }
}

export function PlayerStatsModal({ player, open, onClose }: Props) {
  const [live, setLive] = useState<Player | null>(null);
  const [history, setHistory] = useState<PlayerHistory | null>(null);
  const [teamNames, setTeamNames] = useState<Map<number, string>>(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !player) {
      setLive(null);
      setHistory(null);
      setError(null);
      return;
    }
    if (!player.fplId) {
      setLive(null);
      setHistory(null);
      setError(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all([
      fetchPlayerHistory(player.fplId),
      fetchPlayers({ q: player.name, limit: 10 }),
      fetchTeams(),
    ])
      .then(([hist, players, teams]) => {
        if (cancelled) return;
        setHistory(hist);
        setLive(players.find((p) => p.id === player.fplId) ?? null);
        setTeamNames(new Map(teams.map((t) => [t.id, t.short_name])));
      })
      .catch((err) => {
        if (!cancelled) {
          setHistory(null);
          setLive(null);
          setError(err instanceof Error ? err.message : "Could not load player stats");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, player?.fplId, player?.name]);

  const xp = player ? estimatePlayerXp(player) : 0;
  const status = statusLabel(live?.status, live?.news);

  const historyRows = useMemo(() => {
    if (!history?.history.length) return [];
    return [...history.history].reverse();
  }, [history]);

  if (!player) return null;

  return (
    <Modal open={open} onClose={onClose} title="Player stats" wide>
      <div
        className="flex items-center gap-3 rounded-[3px] p-3"
        style={{
          background: `linear-gradient(135deg, ${player.clubColor}18 0%, transparent 100%)`,
          borderLeft: `3px solid ${player.clubColor}`,
        }}
      >
        <div
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-[14px] font-extrabold text-[var(--navy)]"
          style={{ boxShadow: `inset 0 0 0 3px ${player.clubColor}` }}
        >
          {player.initials}
        </div>
        <div>
          <p className="text-[20px] font-extrabold text-[var(--navy)]">
            {player.name}
            {player.isCaptain ? (
              <span className="ml-2 text-[12px] font-bold text-[var(--coral)]">(C)</span>
            ) : null}
            {player.isVice ? (
              <span className="ml-1 text-[12px] font-bold text-[var(--navy)]">(V)</span>
            ) : null}
          </p>
          <p className="font-label text-[11px] text-[var(--text-secondary)]">
            {player.club} · {player.position} · £{player.price.toFixed(1)}m
            {player.slot ? ` · ${player.slot === "bench" ? "Bench" : "Starting XI"}` : ""}
          </p>
        </div>
      </div>

      {status ? (
        <p
          className={`mt-3 rounded-[3px] px-3 py-2 text-[12px] font-semibold ${
            live?.status === "a"
              ? "bg-[var(--canvas)] text-[var(--text-body)]"
              : "bg-[var(--fdr-hard)]/40 text-[var(--coral-dark)]"
          }`}
        >
          {status}
          {live?.chance_of_playing_this_round != null && live.status !== "a" ? (
            <span className="ml-1 font-normal">({live.chance_of_playing_this_round}% chance)</span>
          ) : null}
        </p>
      ) : null}

      {loading && player.fplId ? (
        <p className="mt-4 text-[13px] text-[var(--text-secondary)]">Loading FPL stats…</p>
      ) : error ? (
        <p className="mt-4 text-[13px] text-[var(--coral)]">{error}</p>
      ) : (
        <>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Stat label="Total pts" value={String(live?.total_points ?? history?.season_points ?? "—")} hero />
            <Stat label="Form" value={(live?.form ?? history?.form ?? player.form ?? 0).toFixed(1)} />
            <Stat label="PPG" value={(live?.points_per_game ?? player.ppg ?? 0).toFixed(1)} />
            <Stat label="Selected by" value={`${(live?.selected_by_percent ?? player.ownership).toFixed(1)}%`} />
          </div>

          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Stat label="xP (next)" value={xp.toFixed(1)} />
            <Stat label="EP next" value={(live?.ep_next ?? xp).toFixed(1)} />
            <Stat label="EP this" value={(live?.ep_this ?? 0).toFixed(1)} />
            <Stat label="Minutes" value={String(live?.minutes ?? "—")} />
          </div>

          <p className="font-label mb-2 mt-4 text-[10px] text-[var(--text-secondary)]">Season stats</p>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            <Stat label="Goals" value={String(live?.goals_scored ?? 0)} compact />
            <Stat label="Assists" value={String(live?.assists ?? 0)} compact />
            <Stat label="Clean sheets" value={String(live?.clean_sheets ?? 0)} compact />
            <Stat label="xG" value={(live?.expected_goals ?? 0).toFixed(2)} compact />
            <Stat label="xA" value={(live?.expected_assists ?? 0).toFixed(2)} compact />
            <Stat label="Price" value={`£${player.price.toFixed(1)}m`} compact />
          </div>

          {player.nextFixtures.length > 0 ? (
            <>
              <p className="font-label mb-2 mt-4 text-[10px] text-[var(--text-secondary)]">Next fixtures</p>
              <div className="space-y-1">
                {player.nextFixtures.slice(0, 5).map((f, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-[3px] border border-[var(--border)] bg-[var(--canvas)] px-3 py-2 text-[13px]"
                  >
                    <span className="font-bold">
                      {f.home ? "H" : "A"} vs {f.opp}
                    </span>
                    <span
                      className={`rounded px-2 py-0.5 text-[11px] font-bold ${
                        f.fdr <= 2
                          ? "bg-[var(--fdr-easy)] text-[var(--positive)]"
                          : f.fdr >= 4
                            ? "bg-[var(--fdr-hard)] text-[var(--coral-dark)]"
                            : "bg-[var(--fdr-neutral)]"
                      }`}
                    >
                      FDR {f.fdr}
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : null}

          {historyRows.length > 0 ? (
            <>
              <p className="font-label mb-2 mt-4 text-[10px] text-[var(--text-secondary)]">
                Recent gameweeks · {history?.season_points ?? 0} season pts
              </p>
              <div className="overflow-x-auto rounded-[3px] border border-[var(--border)]">
                <table className="w-full min-w-[480px] text-[12px]">
                  <thead>
                    <tr className="bg-[var(--canvas)]">
                      <th className="px-2 py-2 text-left font-label text-[9px] text-[var(--text-secondary)]">GW</th>
                      <th className="px-2 py-2 text-left font-label text-[9px] text-[var(--text-secondary)]">Opponent</th>
                      <th className="px-2 py-2 text-center font-label text-[9px] text-[var(--text-secondary)]">Pts</th>
                      <th className="px-2 py-2 text-center font-label text-[9px] text-[var(--text-secondary)]">Min</th>
                      <th className="px-2 py-2 text-center font-label text-[9px] text-[var(--text-secondary)]">G</th>
                      <th className="px-2 py-2 text-center font-label text-[9px] text-[var(--text-secondary)]">A</th>
                      <th className="px-2 py-2 text-center font-label text-[9px] text-[var(--text-secondary)]">CS</th>
                      <th className="px-2 py-2 text-center font-label text-[9px] text-[var(--text-secondary)]">B</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyRows.map((h) => (
                      <tr key={h.round} className="border-t border-[var(--border)]">
                        <td className="px-2 py-2 font-bold">{h.round}</td>
                        <td className="px-2 py-2">
                          {h.was_home != null ? (h.was_home ? "H" : "A") : ""}{" "}
                          {h.opponent_team != null ? teamNames.get(h.opponent_team) ?? `#${h.opponent_team}` : "—"}
                        </td>
                        <td className="px-2 py-2 text-center font-extrabold text-[var(--navy)]">{h.total_points}</td>
                        <td className="px-2 py-2 text-center">{h.minutes}</td>
                        <td className="px-2 py-2 text-center">{h.goals_scored}</td>
                        <td className="px-2 py-2 text-center">{h.assists}</td>
                        <td className="px-2 py-2 text-center">{h.clean_sheets}</td>
                        <td className="px-2 py-2 text-center">{h.bonus}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <p className="mt-4 text-[12px] text-[var(--text-secondary)]">No recent gameweek history yet.</p>
          )}
        </>
      )}
    </Modal>
  );
}

function Stat({
  label,
  value,
  hero,
  compact,
}: {
  label: string;
  value: string;
  hero?: boolean;
  compact?: boolean;
}) {
  return (
    <div
      className={`rounded-[3px] px-3 text-center ${compact ? "py-2" : "py-2.5"} ${
        hero ? "bg-[var(--navy)] text-white" : "bg-[var(--canvas)]"
      }`}
    >
      <p className={`font-label text-[9px] ${hero ? "text-white/60" : "text-[var(--text-secondary)]"}`}>{label}</p>
      <p className={`font-extrabold ${hero ? "text-[20px]" : compact ? "text-[13px]" : "text-[15px]"}`}>{value}</p>
    </div>
  );
}
