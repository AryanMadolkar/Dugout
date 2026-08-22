"use client";

import { useEffect, useMemo, useState } from "react";
import { useDashboard } from "@/context/DashboardContext";
import { fetchPlayers } from "@/lib/api";
import type { AvailablePick } from "@/lib/dashboard-data";
import {
  buildPicksFromPool,
  filterPickSection,
  pickXp,
  sortPicks,
  type PickSection,
  type PickSort,
} from "@/lib/picks-engine";
import { SectionHead } from "./ui/SectionHead";

const POSITIONS = ["ALL", "GKP", "DEF", "MID", "FWD"] as const;
const SORTS: PickSort[] = ["DUGOUT SCORE", "EXPECTED POINTS", "VALUE", "FIXTURES", "FORM", "DIFFERENTIAL"];
const SECTIONS: PickSection[] = [
  "ALL",
  "BEST VALUE",
  "BEST DIFFERENTIALS",
  "BEST FIXTURES",
  "FORM PICKS",
  "UNDERVALUED",
];

export function BestPicksPanel() {
  const { hasSquad, allPlayers } = useDashboard();
  const [position, setPosition] = useState<(typeof POSITIONS)[number]>("ALL");
  const [sort, setSort] = useState<PickSort>("DUGOUT SCORE");
  const [section, setSection] = useState<PickSection>("ALL");
  const [picks, setPicks] = useState<AvailablePick[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchPlayers({ sort: "ep_next", limit: 200, position: position === "ALL" ? undefined : position })
      .then((players) => {
        const owned = new Set(allPlayers.map((p) => p.fplId).filter(Boolean) as number[]);
        setPicks(buildPicksFromPool(players, owned));
      })
      .catch(() => setPicks([]))
      .finally(() => setLoading(false));
  }, [position, allPlayers]);

  const shown = useMemo(() => {
    let list = filterPickSection(picks, section);
    list = sortPicks(list, sort);
    return list.slice(0, 20);
  }, [picks, section, sort]);

  return (
    <section className="panel-elevated overflow-hidden">
      <SectionHead title="Best picks" />
      <div className="border-b border-[var(--border)] px-4 py-2">
        <div className="flex flex-wrap gap-1">
          {POSITIONS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPosition(p)}
              className={`control px-2 py-1 text-[10px] font-bold ${
                position === p ? "bg-[var(--navy)] text-white" : "border border-[var(--border)]"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
        <div className="mt-2 flex flex-wrap gap-1">
          {SECTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSection(s)}
              className={`control px-2 py-1 text-[9px] font-semibold ${
                section === s ? "bg-[var(--coral)] text-white" : "border border-[var(--border)]"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as PickSort)}
          className="control mt-2 border border-[var(--border)] px-2 py-1 text-[11px]"
        >
          {SORTS.map((s) => (
            <option key={s} value={s}>
              Sort: {s}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className="p-4 text-[13px] text-[var(--text-secondary)]">Loading picks…</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-[12px]">
            <thead className="bg-[var(--canvas)] font-label text-[10px] text-[var(--text-secondary)]">
              <tr>
                <th className="px-3 py-2">Player</th>
                <th className="px-2 py-2">Pos</th>
                <th className="px-2 py-2">Price</th>
                <th className="px-2 py-2">xPts</th>
                <th className="px-2 py-2">Own</th>
                <th className="px-2 py-2">Form</th>
                <th className="px-2 py-2">Score</th>
                <th className="px-3 py-2">Tag</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((p) => (
                <tr key={p.id} className="border-t border-[var(--border)] hover:bg-[var(--canvas)]/60">
                  <td className="px-3 py-2.5">
                    <p className="font-extrabold text-[var(--navy)]">{p.name}</p>
                    <p className="text-[10px] text-[var(--text-secondary)]">{p.club}</p>
                  </td>
                  <td className="px-2 py-2.5 font-bold">{p.position}</td>
                  <td className="px-2 py-2.5">£{p.price.toFixed(1)}m</td>
                  <td className="px-2 py-2.5 font-bold text-[var(--positive)]">{pickXp(p).toFixed(1)}</td>
                  <td className="px-2 py-2.5">{p.ownership.toFixed(0)}%</td>
                  <td className="px-2 py-2.5">{p.form.toFixed(1)}</td>
                  <td className="px-2 py-2.5 font-extrabold">{p.rating}</td>
                  <td className="px-3 py-2.5">
                    <span className="rounded bg-[var(--navy)]/10 px-1.5 py-0.5 text-[9px] font-bold text-[var(--navy)]">
                      {p.tag}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {!hasSquad ? (
        <p className="border-t border-[var(--border)] p-3 text-[11px] text-[var(--text-secondary)]">
          Scan your squad to exclude owned players from recommendations.
        </p>
      ) : null}
    </section>
  );
}

export function DifferentialsPanel() {
  const { allPlayers } = useDashboard();
  const [picks, setPicks] = useState<AvailablePick[]>([]);

  useEffect(() => {
    fetchPlayers({ sort: "selected_by_percent", limit: 150 })
      .then((players) => {
        const owned = new Set(allPlayers.map((p) => p.fplId).filter(Boolean) as number[]);
        const all = buildPicksFromPool(players, owned);
        setPicks(filterPickSection(all, "BEST DIFFERENTIALS").slice(0, 8));
      })
      .catch(() => setPicks([]));
  }, [allPlayers]);

  return (
    <section className="panel overflow-hidden">
      <SectionHead title="Differentials" />
      <div className="divide-y divide-[var(--border)]">
        {picks.map((p) => (
          <div key={p.id} className="flex items-center justify-between px-4 py-3">
            <div>
              <p className="text-[14px] font-extrabold text-[var(--navy)]">{p.name}</p>
              <p className="text-[11px] text-[var(--text-secondary)]">
                {p.ownership.toFixed(1)}% owned · {p.rating} rating · {pickXp(p).toFixed(1)} xPts
              </p>
              {p.reason ? <p className="mt-1 text-[11px] text-[var(--text-body)]">{p.reason}</p> : null}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
