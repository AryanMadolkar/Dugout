"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { fetchPlayers } from "@/lib/api";
import { CLUB_COLORS, type AvailablePick, type PickTag } from "@/lib/dashboard-data";
import { useDashboard } from "@/context/DashboardContext";

const POSITIONS = ["All", "GK", "Def", "Mid", "Fwd"] as const;
const SORTS = ["xPts", "Form", "Value", "Ownership"] as const;

const POSITION_MAP: Record<string, AvailablePick["position"] | null> = {
  All: null,
  GK: "GKP",
  Def: "DEF",
  Mid: "MID",
  Fwd: "FWD",
};

const TAG_STYLES: Record<PickTag, string> = {
  RECOMMENDED: "bg-[var(--navy)] text-white",
  DIFFERENTIAL: "bg-violet-100 text-violet-800",
  VALUE: "bg-[var(--fdr-easy)] text-[var(--positive)]",
  "MUST HAVE": "bg-[var(--coral)] text-white",
  "FIXTURE SWING": "bg-amber-100 text-amber-800",
};

function fdrBg(fdr: number) {
  if (fdr <= 2) return "bg-[var(--fdr-easy)]";
  if (fdr === 3) return "bg-[var(--fdr-neutral)]";
  return "bg-[var(--fdr-hard)]";
}

function pickTag(ownership: number, form: number): PickTag {
  if (ownership > 40 && form > 6) return "MUST HAVE";
  if (ownership < 10) return "DIFFERENTIAL";
  if (form > 5.5) return "RECOMMENDED";
  return "VALUE";
}

function sortPicks(picks: AvailablePick[], sort: (typeof SORTS)[number]) {
  const copy = [...picks];
  switch (sort) {
    case "xPts":
      return copy.sort((a, b) => b.next4Xp - a.next4Xp);
    case "Form":
      return copy.sort((a, b) => b.form - a.form);
    case "Value":
      return copy.sort((a, b) => b.next4Xp / b.price - a.next4Xp / a.price);
    case "Ownership":
      return copy.sort((a, b) => a.ownership - b.ownership);
    default:
      return copy;
  }
}

type Props = {
  fullPage?: boolean;
};

export function BestAvailablePicks({ fullPage }: Props) {
  const { openModal } = useDashboard();
  const [position, setPosition] = useState<(typeof POSITIONS)[number]>("All");
  const [sort, setSort] = useState<(typeof SORTS)[number]>("xPts");
  const [picks, setPicks] = useState<AvailablePick[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetchPlayers({ sort: sort === "Form" ? "form" : sort === "Ownership" ? "selected" : "ep_next", limit: 50 })
      .then((players) => {
        setPicks(
          players.map((p) => {
            const ep = p.ep_next ?? p.points_per_game ?? 0;
            const form = p.form ?? 0;
            const ownership = p.selected_by_percent ?? 0;
            return {
              id: String(p.id),
              name: p.web_name,
              club: p.team_short_name ?? "?",
              clubColor: CLUB_COLORS[p.team_short_name ?? ""] ?? "#888888",
              position: p.position as AvailablePick["position"],
              price: p.price,
              form,
              ownership,
              nextFixtures: [],
              next4Xp: ep * 4,
              rating: Math.round(Math.min(99, ep * 8 + form * 5)),
              tag: pickTag(ownership, form),
            };
          }),
        );
        setError(null);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load players"))
      .finally(() => setLoading(false));
  }, [sort]);

  const filtered = useMemo(() => {
    const pos = POSITION_MAP[position];
    const byPos = pos ? picks.filter((p) => p.position === pos) : picks;
    return sortPicks(byPos, sort);
  }, [position, sort, picks]);

  return (
    <section className="panel-elevated overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] bg-[var(--navy)] px-4 py-3">
        <h2 className="font-label text-[12px] font-bold text-white">Best available picks</h2>
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
        <span className="ml-auto text-[11px] text-[var(--text-secondary)]">{filtered.length} players</span>
      </div>

      {error ? (
        <p className="px-4 py-6 text-[13px] text-[var(--coral)]">{error}</p>
      ) : loading ? (
        <p className="px-4 py-6 text-[13px] text-[var(--text-secondary)]">Loading players from FPL data…</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-[13px]">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--canvas)]">
                <th className="font-label px-4 py-2 text-[10px] font-semibold text-[var(--text-secondary)]">Player</th>
                <th className="font-label hide-sm px-3 py-2 text-[10px] font-semibold text-[var(--text-secondary)]">Price</th>
                <th className="font-label hide-sm px-3 py-2 text-[10px] font-semibold text-[var(--text-secondary)]">Form</th>
                <th className="font-label hide-sm px-3 py-2 text-[10px] font-semibold text-[var(--text-secondary)]">Owned</th>
                <th className="font-label px-3 py-2 text-[10px] font-semibold text-[var(--text-secondary)]">Est. 4 GW xPts</th>
                <th className="font-label px-3 py-2 text-[10px] font-semibold text-[var(--text-secondary)]">Rating</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-[var(--text-secondary)]">
                    No players match this filter.
                  </td>
                </tr>
              ) : (
                filtered.map((pick) => (
                  <PickRow key={pick.id} pick={pick} onWhatIf={() => openModal("whatIf")} />
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
      {!fullPage ? (
        <div className="border-t border-[var(--border)] px-4 py-2 text-right">
          <Link href="/players" className="text-[12px] font-semibold text-[var(--coral)] hover:underline">
            View all picks →
          </Link>
        </div>
      ) : null}
    </section>
  );
}

function PickRow({ pick, onWhatIf }: { pick: AvailablePick; onWhatIf: () => void }) {
  return (
    <tr className="border-b border-[var(--border)] transition hover:bg-[var(--canvas)]">
      <td className="px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: pick.clubColor }} />
          <div>
            <p className="font-bold">{pick.name}</p>
            <p className="font-label text-[10px] text-[var(--text-secondary)]">
              {pick.club} · {pick.position}
            </p>
          </div>
          <span className={`ml-1 shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold ${TAG_STYLES[pick.tag]}`}>
            {pick.tag}
          </span>
        </div>
      </td>
      <td className="hide-sm px-3 py-2.5">£{pick.price}m</td>
      <td className="hide-sm px-3 py-2.5">{pick.form.toFixed(1)}</td>
      <td className="hide-sm px-3 py-2.5">{pick.ownership.toFixed(1)}%</td>
      <td className="px-3 py-2.5 font-extrabold text-[var(--navy)]">{pick.next4Xp.toFixed(1)}</td>
      <td className="px-3 py-2.5">
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[var(--navy)] text-[11px] font-bold text-white">
          {pick.rating}
        </span>
      </td>
      <td className="px-4 py-2.5">
        <button
          type="button"
          onClick={onWhatIf}
          className="control border border-[var(--border)] px-2 py-1 text-[11px] font-semibold hover:bg-[var(--canvas)]"
        >
          Compare
        </button>
      </td>
    </tr>
  );
}
