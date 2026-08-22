"use client";

import { useEffect, useMemo, useState } from "react";
import { useDashboard } from "@/context/DashboardContext";
import { fetchPlayers } from "@/lib/api";
import type { SquadPlayer } from "@/lib/dashboard-data";
import { CLUB_COLORS } from "@/lib/dashboard-data";
import { estimatePlayerXp } from "@/lib/projections";
import { SectionHead } from "./ui/SectionHead";

function defaultPair(players: SquadPlayer[]): [SquadPlayer, SquadPlayer] | null {
  if (players.length < 2) return null;
  const sorted = [...players].sort((a, b) => estimatePlayerXp(b) - estimatePlayerXp(a));
  return [sorted[0], sorted[1]];
}

function playerFromApi(p: Awaited<ReturnType<typeof fetchPlayers>>[number]): SquadPlayer {
  return {
    id: String(p.id),
    fplId: p.id,
    name: p.web_name,
    initials: p.web_name.slice(0, 3).toUpperCase(),
    club: p.team_short_name ?? "?",
    clubColor: CLUB_COLORS[p.team_short_name ?? ""] ?? "#888888",
    position: p.position as SquadPlayer["position"],
    price: p.price,
    opponent: "—",
    home: true,
    xp: p.ep_next ?? p.points_per_game ?? 0,
    form: p.form ?? 0,
    ppg: p.points_per_game ?? 0,
    ownership: p.selected_by_percent ?? 0,
    row: p.position as SquadPlayer["row"],
    nextFixtures: [],
  };
}

function buildMetrics(a: SquadPlayer, b: SquadPlayer) {
  return [
    { label: "xP (next GW)", a: estimatePlayerXp(a), b: estimatePlayerXp(b), lowerBetter: false },
    { label: "Form", a: a.form || a.ppg || 0, b: b.form || b.ppg || 0, lowerBetter: false },
    { label: "Ownership", a: a.ownership, b: b.ownership, lowerBetter: false },
    { label: "Price", a: a.price, b: b.price, lowerBetter: false },
    {
      label: "Next FDR",
      a: a.nextFixtures[0]?.fdr ?? 3,
      b: b.nextFixtures[0]?.fdr ?? 3,
      lowerBetter: true,
    },
  ];
}

function PlayerPicker({
  label,
  player,
  squadOptions,
  onSelect,
}: {
  label: string;
  player: SquadPlayer;
  squadOptions: SquadPlayer[];
  onSelect: (player: SquadPlayer) => void;
}) {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<SquadPlayer[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (search.length < 2) {
      setResults([]);
      return;
    }
    let cancelled = false;
    fetchPlayers({ q: search, limit: 6 })
      .then((players) => {
        if (cancelled) return;
        setResults(players.map(playerFromApi));
      })
      .catch(() => {
        if (!cancelled) setResults([]);
      });
    return () => {
      cancelled = true;
    };
  }, [search]);

  return (
    <div className="flex-1">
      <p className="font-label text-[9px] text-[var(--text-secondary)]">{label}</p>
      <select
        value={squadOptions.some((p) => p.id === player.id) ? player.id : ""}
        onChange={(e) => {
          const picked = squadOptions.find((p) => p.id === e.target.value);
          if (picked) onSelect(picked);
        }}
        className="control mt-1 w-full border border-[var(--border)] bg-white px-2 py-2 text-[13px] font-bold text-[var(--navy)]"
      >
        {!squadOptions.some((p) => p.id === player.id) ? (
          <option value="">{player.name} (outside squad)</option>
        ) : null}
        {squadOptions.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name} · {p.position} · £{p.price}m
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="mt-1 text-[11px] font-semibold text-[var(--coral)] hover:underline"
      >
        {open ? "Hide search" : "Search any player"}
      </button>
      {open ? (
        <div className="mt-1">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search FPL pool…"
            className="control w-full border border-[var(--border)] px-2 py-1.5 text-[12px]"
          />
          {results.length > 0 ? (
            <ul className="mt-1 max-h-32 overflow-y-auto rounded-[3px] border border-[var(--border)] bg-white">
              {results.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onSelect(p);
                      setSearch("");
                      setResults([]);
                      setOpen(false);
                    }}
                    className="flex w-full items-center justify-between px-2 py-1.5 text-left text-[12px] hover:bg-[var(--canvas)]"
                  >
                    <span className="font-semibold">{p.name}</span>
                    <span className="text-[var(--text-secondary)]">
                      {p.club} · {p.position} · £{p.price}m
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function ComparisonPanel() {
  const { allPlayers, hasSquad } = useDashboard();
  const [playerA, setPlayerA] = useState<SquadPlayer | null>(null);
  const [playerB, setPlayerB] = useState<SquadPlayer | null>(null);

  useEffect(() => {
    const pair = defaultPair(allPlayers);
    if (!pair) {
      setPlayerA(null);
      setPlayerB(null);
      return;
    }
    setPlayerA((prev) => {
      if (prev && allPlayers.some((p) => p.id === prev.id)) return prev;
      return pair[0];
    });
    setPlayerB((prev) => {
      if (prev && allPlayers.some((p) => p.id === prev.id)) return prev;
      return pair[1];
    });
  }, [allPlayers]);

  const metrics = useMemo(() => {
    if (!playerA || !playerB) return null;
    return buildMetrics(playerA, playerB);
  }, [playerA, playerB]);

  if (!hasSquad) {
    return (
      <section className="panel overflow-hidden">
        <SectionHead title="Comparison" />
        <p className="p-4 text-[13px] text-[var(--text-secondary)]">Scan your squad to compare players.</p>
      </section>
    );
  }

  if (!playerA || !playerB || !metrics) {
    return (
      <section className="panel overflow-hidden">
        <SectionHead title="Comparison" />
        <p className="p-4 text-[13px] text-[var(--text-secondary)]">Need at least two players to compare.</p>
      </section>
    );
  }

  return (
    <section className="panel-elevated overflow-hidden">
      <SectionHead title="Comparison" />
      <div className="p-4">
        <div className="mb-4 flex flex-col items-stretch gap-3 rounded-[3px] bg-[var(--canvas)] p-4 sm:flex-row sm:items-start">
          <PlayerPicker
            label="Player A"
            player={playerA}
            squadOptions={allPlayers}
            onSelect={setPlayerA}
          />
          <span
            className="mx-auto flex h-8 w-8 shrink-0 items-center justify-center self-center rounded-full text-[11px] font-bold text-white sm:mt-6"
            style={{ background: "var(--navy)" }}
          >
            vs
          </span>
          <PlayerPicker
            label="Player B"
            player={playerB}
            squadOptions={allPlayers}
            onSelect={setPlayerB}
          />
        </div>

        <div className="mb-3 flex justify-center">
          <button
            type="button"
            onClick={() => {
              setPlayerA(playerB);
              setPlayerB(playerA);
            }}
            className="control border border-[var(--border)] px-3 py-1 text-[11px] font-semibold hover:bg-[var(--canvas)]"
          >
            Swap players
          </button>
        </div>

        <div className="overflow-x-auto rounded-[3px] border border-[var(--border)]">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="bg-[var(--canvas)]">
                <th className="py-2 pl-3 text-left font-label text-[10px] text-[var(--text-secondary)]">Metric</th>
                <th className="py-2 text-center font-bold">{playerA.name}</th>
                <th className="py-2 pr-3 text-center font-bold">{playerB.name}</th>
              </tr>
            </thead>
            <tbody>
              {metrics.map((m) => {
                const aWins = m.lowerBetter ? m.a < m.b : m.a > m.b;
                const bWins = m.lowerBetter ? m.b < m.a : m.b > m.a;
                return (
                  <tr key={m.label} className="border-t border-[var(--border)]">
                    <td className="py-2 pl-3 text-[var(--text-body)]">{m.label}</td>
                    <td
                      className={`py-2 text-center font-bold ${aWins ? "bg-[var(--fdr-easy)] text-[var(--positive)]" : ""}`}
                    >
                      {typeof m.a === "number" && m.a % 1 !== 0 ? m.a.toFixed(1) : m.a}
                    </td>
                    <td
                      className={`py-2 pr-3 text-center font-bold ${bWins ? "bg-[var(--fdr-easy)] text-[var(--positive)]" : ""}`}
                    >
                      {typeof m.b === "number" && m.b % 1 !== 0 ? m.b.toFixed(1) : m.b}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
