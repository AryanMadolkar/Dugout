"use client";

import { useEffect, useState } from "react";
import { useDashboard } from "@/context/DashboardContext";
import { fetchLeagueAnalysis } from "@/lib/api";
import { SectionHead } from "./ui/SectionHead";

export function MiniLeaguePanel() {
  const { hasSquad, fplEntryId, fplLeagueId, fplRank } = useDashboard();
  const [league, setLeague] = useState<Awaited<ReturnType<typeof fetchLeagueAnalysis>> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!hasSquad || fplEntryId == null) {
      setLeague(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchLeagueAnalysis(fplEntryId, fplLeagueId)
      .then((data) => {
        if (!cancelled) setLeague(data);
      })
      .catch((err) => {
        if (!cancelled) {
          setLeague(null);
          setError(err instanceof Error ? err.message : "League data unavailable");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [hasSquad, fplEntryId, fplLeagueId]);

  if (!hasSquad) return null;

  if (fplEntryId == null) {
    return (
      <section className="panel overflow-hidden">
        <SectionHead title="Mini league · rival analysis" />
        <p className="p-4 text-[13px] text-[var(--text-secondary)]">
          Link your FPL entry ID to compare against your mini-league rivals.
        </p>
      </section>
    );
  }

  if (loading) {
    return (
      <section className="panel overflow-hidden">
        <SectionHead title="Mini league · rival analysis" />
        <p className="p-4 text-[13px] text-[var(--text-secondary)]">Loading league from FPL…</p>
      </section>
    );
  }

  if (error || !league) {
    return (
      <section className="panel overflow-hidden">
        <SectionHead title="Mini league · rival analysis" />
        <p className="p-4 text-[13px] text-[var(--text-secondary)]">{error ?? "No league data."}</p>
      </section>
    );
  }

  const yourRank = league.yourRank ?? fplRank;
  const rival = league.rivals.find((r) => r.entry !== fplEntryId);

  return (
    <section className="panel overflow-hidden">
      <SectionHead
        title="Mini league · rival analysis"
        right={
          league.leagueName ? (
            <span className="text-[10px] text-[var(--text-secondary)]">{league.leagueName}</span>
          ) : null
        }
      />
      <div className="grid gap-px bg-[var(--border)] sm:grid-cols-2">
        <div className="bg-white p-4">
          <p className="font-label text-[10px] text-[var(--text-secondary)]">Your overall rank</p>
          <p className="text-[22px] font-extrabold text-[var(--navy)]">
            {yourRank != null ? yourRank.toLocaleString() : "—"}
          </p>
          {league.yourLeagueRank != null ? (
            <p className="mt-1 text-[11px] text-[var(--text-secondary)]">
              League rank #{league.yourLeagueRank}
            </p>
          ) : null}
        </div>
        <div className="bg-white p-4">
          <p className="font-label text-[10px] text-[var(--text-secondary)]">
            {league.rivalName ?? "Top rival"}
          </p>
          <p className="text-[22px] font-extrabold text-[var(--navy)]">
            {league.rivalRank != null ? `#${league.rivalRank}` : "—"}
          </p>
        </div>
      </div>
      <div className="space-y-2 p-4">
        {rival ? (
          <Insight
            label="Nearest rival"
            text={`${rival.name ?? "Rival"} on ${rival.total ?? "—"} pts (league #${rival.rank ?? "—"}).`}
          />
        ) : null}
        <Insight
          label="Rank strategy"
          text={
            yourRank != null && yourRank < 500_000
              ? "Chase differentials — your rank supports upside captains and low-owned moves."
              : "Template safety helps — rank gains come from nailing captain and avoiding hits."
          }
        />
        {league.rivals.length > 0 ? (
          <div className="rounded-[3px] border border-[var(--border)] bg-[var(--canvas)] px-3 py-2">
            <p className="font-label text-[10px] text-[var(--text-secondary)]">League top 5</p>
            <ul className="mt-2 space-y-1">
              {league.rivals.slice(0, 5).map((r) => (
                <li key={r.entry ?? r.name} className="flex justify-between text-[12px]">
                  <span className="font-semibold">{r.name}</span>
                  <span className="text-[var(--text-secondary)]">{r.total} pts</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function Insight({ label, text }: { label: string; text: string }) {
  return (
    <div className="rounded-[3px] border border-[var(--border)] bg-[var(--canvas)] px-3 py-2">
      <p className="font-label text-[10px] text-[var(--text-secondary)]">{label}</p>
      <p className="mt-1 text-[13px] text-[var(--text-body)]">{text}</p>
    </div>
  );
}
