"use client";

import { useEffect, useState } from "react";
import { useDashboard } from "@/context/DashboardContext";
import { fetchPlayerHistory, fetchPlayers, type PlayerHistory } from "@/lib/api";
import { estimatePlayerGwXp, estimatePlayerXp, resolveCaptainId } from "@/lib/projections";
import {
  goalInvolvementPer90,
  playerDugoutScore,
  playerVerdict,
  priceChangeForecast,
  rotationRisk,
  startProbability,
} from "@/lib/player-intelligence";
import type { Player } from "@/lib/types";
import { SectionHead } from "./ui/SectionHead";

export function PlayerDetailPanel() {
  const { selectedPlayer: player, starters, activeChip } = useDashboard();
  const [history, setHistory] = useState<PlayerHistory | null>(null);
  const [live, setLive] = useState<Player | null>(null);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    if (!player?.fplId) {
      setHistory(null);
      setLive(null);
      setHistoryError(null);
      return;
    }
    let cancelled = false;
    setLoadingHistory(true);
    setHistoryError(null);
    Promise.all([fetchPlayerHistory(player.fplId), fetchPlayers({ q: player.name, limit: 5 })])
      .then(([hist, players]) => {
        if (cancelled) return;
        setHistory(hist);
        setLive(players.find((p) => p.id === player.fplId) ?? null);
      })
      .catch((err) => {
        if (!cancelled) {
          setHistory(null);
          setLive(null);
          setHistoryError(err instanceof Error ? err.message : "Could not load history");
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingHistory(false);
      });
    return () => {
      cancelled = true;
    };
  }, [player?.fplId, player?.name]);

  if (!player) {
    return (
      <section className="panel overflow-hidden">
        <SectionHead title="Player detail" />
        <p className="p-4 text-[13px] text-[var(--text-secondary)]">Click a player on the pitch or bench.</p>
      </section>
    );
  }

  const owned = starters.some((p) => p.id === player.id) || player.slot === "starter" || player.slot === "bench";
  const captainId = resolveCaptainId(starters);
  const isCap = captainId === player.id;
  const baseXp = estimatePlayerXp(player);
  const xp = estimatePlayerGwXp(player, activeChip, captainId);
  const mult = isCap ? (activeChip === "Triple Captain" ? 3 : 2) : 1;
  const formValue = history?.form ?? player.form ?? player.ppg ?? 0;
  const maxPts = Math.max(1, ...(history?.history.map((h) => h.total_points) ?? [1]));
  const score = playerDugoutScore(player, live);
  const sp = startProbability(player, live);
  const risk = rotationRisk(player, live);
  const price = priceChangeForecast(player, live);
  const { verdict, reason } = playerVerdict(player, owned, live);
  const gi = goalInvolvementPer90(player, live);

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
            <p className="text-[20px] font-extrabold">
              {player.name}
              {isCap ? <span className="ml-2 text-[12px] font-bold text-[var(--coral)]">(C) ×{mult}</span> : null}
            </p>
            <p className="font-label text-[11px] text-[var(--text-secondary)]">
              {player.club} · {player.position} · £{player.price.toFixed(1)}m
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <StatBox label="Dugout score" value={String(score)} hero />
          <StatBox label="xP" value={xp.toFixed(1)} hint={isCap ? `${baseXp.toFixed(1)} × ${mult}` : undefined} />
          <StatBox label="Start prob" value={`${sp}%`} />
          <StatBox label="Rotation" value={risk} />
        </div>

        <div className="mt-2 grid grid-cols-2 gap-2">
          <StatBox label="Form" value={formValue.toFixed(1)} />
          <StatBox label="Owned" value={`${player.ownership.toFixed(1)}%`} />
          <StatBox label="Goal involve." value={gi.toFixed(2) + "/90"} />
          <StatBox
            label="Price change"
            value={price.direction === "rise" ? `${price.risePct}% rise` : price.direction === "fall" ? `${price.fallPct}% fall` : "Stable"}
          />
        </div>

        <div className="mt-4 rounded-[3px] border border-[var(--border)] bg-[var(--canvas)] px-3 py-2.5">
          <p className="font-label text-[10px] text-[var(--text-secondary)]">Verdict</p>
          <p
            className={`text-[15px] font-extrabold ${
              verdict === "BUY" ? "text-[var(--positive)]" : verdict === "SELL" ? "text-[var(--coral)]" : "text-[var(--navy)]"
            }`}
          >
            {verdict}
          </p>
          <p className="mt-1 text-[12px] text-[var(--text-body)]">{reason}</p>
          {price.direction === "rise" ? (
            <p className="mt-2 text-[11px] font-semibold text-[var(--coral)]">{price.note}</p>
          ) : null}
        </div>

        <p className="font-label mb-2 mt-4 text-[11px] text-[var(--text-secondary)]">
          Recent form {history ? `· ${history.season_points} season pts` : ""}
        </p>
        {loadingHistory ? (
          <p className="text-[12px] text-[var(--text-secondary)]">Loading GW history…</p>
        ) : historyError ? (
          <p className="text-[12px] text-[var(--text-secondary)]">
            Form from snapshot ({formValue.toFixed(1)}). History unavailable.
          </p>
        ) : history && history.history.length > 0 ? (
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
        ) : (
          <p className="text-[12px] text-[var(--text-secondary)]">No finished GW history yet.</p>
        )}

        <p className="font-label mb-2 mt-4 text-[11px] text-[var(--text-secondary)]">Next fixtures</p>
        <div className="space-y-1.5">
          {(player.nextFixtures.length ? player.nextFixtures : []).slice(0, 5).map((f, i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-[3px] border border-[var(--border)] bg-[var(--canvas)] px-3 py-2"
            >
              <span className="text-[13px] font-bold">
                {f.home ? "H" : "A"} vs {f.opp}
              </span>
              <span className={`rounded px-2 py-0.5 text-[11px] font-bold ${fdrClass(f.fdr)}`}>FDR {f.fdr}</span>
            </div>
          ))}
          {player.nextFixtures.length === 0 ? (
            <p className="text-[12px] text-[var(--text-secondary)]">Fixtures loading…</p>
          ) : null}
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

function StatBox({ label, value, hero, hint }: { label: string; value: string; hero?: boolean; hint?: string }) {
  return (
    <div
      className={`rounded-[3px] px-3 py-2 text-center ${hero ? "bg-[var(--navy)] text-white" : "bg-[var(--canvas)]"}`}
    >
      <p className={`font-label text-[9px] ${hero ? "text-white/60" : "text-[var(--text-secondary)]"}`}>{label}</p>
      <p className={`font-extrabold ${hero ? "text-[22px] leading-tight" : "text-[14px]"}`}>{value}</p>
      {hint ? (
        <p className={`mt-0.5 text-[9px] ${hero ? "text-white/50" : "text-[var(--text-secondary)]"}`}>{hint}</p>
      ) : null}
    </div>
  );
}
