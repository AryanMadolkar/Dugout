"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useDashboard } from "@/context/DashboardContext";
import type { SquadPlayer } from "@/lib/dashboard-data";
import { estimatePlayerXp } from "@/lib/projections";

const POSITIONS = ["All", "GK", "Def", "Mid", "Fwd"] as const;
const SORTS = ["xPts", "Form", "Price", "Ownership"] as const;

const POSITION_MAP: Record<(typeof POSITIONS)[number], SquadPlayer["position"] | null> = {
  All: null,
  GK: "GKP",
  Def: "DEF",
  Mid: "MID",
  Fwd: "FWD",
};

function playerRating(p: SquadPlayer) {
  const xp = estimatePlayerXp(p);
  const form = p.form || p.ppg || 0;
  return Math.round(Math.min(99, xp * 8 + form * 4 + Math.max(0, 4 - (p.nextFixtures[0]?.fdr ?? 3)) * 3));
}

export function OwnedPlayersPanel() {
  const router = useRouter();
  const { allPlayers, hasSquad, setSelectedId } = useDashboard();
  const [position, setPosition] = useState<(typeof POSITIONS)[number]>("All");
  const [sort, setSort] = useState<(typeof SORTS)[number]>("xPts");

  const rows = useMemo(() => {
    const pos = POSITION_MAP[position];
    let list = pos ? allPlayers.filter((p) => p.position === pos) : [...allPlayers];
    list = [...list].sort((a, b) => {
      switch (sort) {
        case "Form":
          return (b.form || b.ppg || 0) - (a.form || a.ppg || 0);
        case "Price":
          return b.price - a.price;
        case "Ownership":
          return b.ownership - a.ownership;
        case "xPts":
        default:
          return estimatePlayerXp(b) - estimatePlayerXp(a);
      }
    });
    return list;
  }, [allPlayers, position, sort]);

  if (!hasSquad) {
    return (
      <section className="panel-elevated overflow-hidden">
        <div className="border-b border-[var(--border)] bg-[var(--navy)] px-4 py-3">
          <h2 className="font-label text-[12px] font-bold text-white">Your owned players</h2>
        </div>
        <div className="px-4 py-10 text-center">
          <p className="text-[14px] text-[var(--text-secondary)]">Scan your squad to see owned players here.</p>
          <Link href="/upload" className="control btn-coral mt-4 inline-block px-5 py-2.5 text-[13px]">
            Scan squad
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="panel-elevated overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] bg-[var(--navy)] px-4 py-3">
        <h2 className="font-label text-[12px] font-bold text-white">Your owned players</h2>
        <div className="flex flex-wrap gap-1">
          {POSITIONS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPosition(p)}
              className={`control px-2.5 py-1 text-[11px] font-semibold ${
                position === p ? "bg-[var(--coral)] text-white" : "bg-white/15 text-white/80 hover:bg-white/25"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-3 border-b border-[var(--border)] px-4 py-2">
        {SORTS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setSort(s)}
            className={`font-label text-[10px] font-semibold ${
              sort === s ? "text-[var(--coral)]" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            {s}
          </button>
        ))}
        <span className="ml-auto text-[11px] text-[var(--text-secondary)]">
          {rows.length} of {allPlayers.length} owned
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-[13px]">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--canvas)]">
              <th className="font-label px-4 py-2 text-[10px] font-semibold text-[var(--text-secondary)]">Player</th>
              <th className="font-label hide-sm px-3 py-2 text-[10px] font-semibold text-[var(--text-secondary)]">Status</th>
              <th className="font-label hide-sm px-3 py-2 text-[10px] font-semibold text-[var(--text-secondary)]">Price</th>
              <th className="font-label hide-sm px-3 py-2 text-[10px] font-semibold text-[var(--text-secondary)]">Form</th>
              <th className="font-label hide-sm px-3 py-2 text-[10px] font-semibold text-[var(--text-secondary)]">Owned %</th>
              <th className="font-label px-3 py-2 text-[10px] font-semibold text-[var(--text-secondary)]">Fixture</th>
              <th className="font-label px-3 py-2 text-[10px] font-semibold text-[var(--text-secondary)]">xP</th>
              <th className="font-label px-3 py-2 text-[10px] font-semibold text-[var(--text-secondary)]">Rating</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {rows.map((player) => {
              const xp = estimatePlayerXp(player);
              const rating = playerRating(player);
              const fixture = player.nextFixtures[0];
              return (
                <tr
                  key={player.id}
                  className="cursor-pointer border-b border-[var(--border)] transition hover:bg-[var(--canvas)]"
                  onClick={() => {
                    setSelectedId(player.id);
                    router.push("/");
                  }}
                >
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ background: player.clubColor }}
                      />
                      <div>
                        <p className="font-bold">
                          {player.name}
                          {player.isCaptain ? (
                            <span className="ml-1 text-[10px] font-extrabold text-[var(--coral)]">C</span>
                          ) : null}
                          {player.isVice ? (
                            <span className="ml-1 text-[10px] font-extrabold text-[var(--navy)]">V</span>
                          ) : null}
                        </p>
                        <p className="font-label text-[10px] text-[var(--text-secondary)]">
                          {player.club} · {player.position}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="hide-sm px-3 py-2.5">
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                        player.slot === "bench"
                          ? "bg-[var(--canvas)] text-[var(--text-secondary)]"
                          : "bg-[var(--navy)]/10 text-[var(--navy)]"
                      }`}
                    >
                      {player.slot === "bench" ? "Bench" : "XI"}
                    </span>
                  </td>
                  <td className="hide-sm px-3 py-2.5">£{player.price.toFixed(1)}m</td>
                  <td className="hide-sm px-3 py-2.5">{(player.form || player.ppg || 0).toFixed(1)}</td>
                  <td className="hide-sm px-3 py-2.5">{player.ownership.toFixed(1)}%</td>
                  <td className="px-3 py-2.5 text-[12px]">
                    {fixture
                      ? `${fixture.home ? "H" : "A"} ${fixture.opp}`
                      : `${player.home ? "H" : "A"} ${player.opponent}`}
                  </td>
                  <td className="px-3 py-2.5 font-extrabold text-[var(--navy)]">{xp.toFixed(1)}</td>
                  <td className="px-3 py-2.5">
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[var(--navy)] text-[11px] font-bold text-white">
                      {rating}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedId(player.id);
                        router.push("/");
                      }}
                      className="control border border-[var(--border)] px-2 py-1 text-[11px] font-semibold hover:bg-[var(--canvas)]"
                    >
                      View
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
