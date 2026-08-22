import type { AvailablePick, PickTag, SquadPlayer } from "./dashboard-data";
import { CLUB_COLORS } from "./dashboard-data";
import type { Player } from "./types";
import { estimatePlayerXp } from "./projections";
import { differentialEdge, playerDugoutScore } from "./player-intelligence";

export type PickSort = "DUGOUT SCORE" | "EXPECTED POINTS" | "VALUE" | "FIXTURES" | "FORM" | "DIFFERENTIAL";

export type PickSection = "ALL" | "BEST VALUE" | "BEST DIFFERENTIALS" | "BEST FIXTURES" | "FORM PICKS" | "UNDERVALUED";

function toPick(p: Player, tag: PickTag, reason: string): AvailablePick {
  const squadLike: SquadPlayer = {
    id: String(p.id),
    name: p.web_name,
    initials: p.web_name.slice(0, 3).toUpperCase(),
    club: p.team_short_name ?? "?",
    clubColor: CLUB_COLORS[p.team_short_name ?? ""] ?? "#888",
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
  const rating = playerDugoutScore(squadLike, p);
  const next4Xp = Math.round(estimatePlayerXp(squadLike) * 4 * 10) / 10;
  return {
    id: String(p.id),
    name: p.web_name,
    club: p.team_short_name ?? "?",
    clubColor: CLUB_COLORS[p.team_short_name ?? ""] ?? "#888",
    position: p.position as AvailablePick["position"],
    price: p.price,
    form: p.form ?? 0,
    ownership: p.selected_by_percent ?? 0,
    nextFixtures: [],
    next4Xp,
    rating,
    tag,
    reason,
  };
}

function tagFor(p: Player, rating: number): PickTag {
  const own = p.selected_by_percent ?? 0;
  if (own <= 8 && rating >= 75) return "DIFFERENTIAL";
  if (rating >= 82) return "MUST HAVE";
  if ((p.ep_next ?? 0) / Math.max(p.price, 4) >= 1.2) return "VALUE";
  if ((p.form ?? 0) >= 5) return "RECOMMENDED";
  return "FIXTURE SWING";
}

/** Client-side picks engine from FPL player pool (no Gemini required). */
export function buildPicksFromPool(players: Player[], ownedIds: Set<number>): AvailablePick[] {
  return players
    .filter((p) => !ownedIds.has(p.id))
    .map((p) => {
      const squadLike: SquadPlayer = {
        id: String(p.id),
        name: p.web_name,
        initials: p.web_name.slice(0, 3).toUpperCase(),
        club: p.team_short_name ?? "?",
        clubColor: CLUB_COLORS[p.team_short_name ?? ""] ?? "#888",
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
      const rating = playerDugoutScore(squadLike, p);
      const tag = tagFor(p, rating);
      const reason =
        tag === "DIFFERENTIAL"
          ? `${Math.round(differentialEdge(squadLike, p))}% edge vs ownership.`
          : tag === "VALUE"
            ? `Strong xP per £${p.price.toFixed(1)}m.`
            : `Form ${(p.form ?? 0).toFixed(1)} · ${rating} Dugout score.`;
      return toPick(p, tag, reason);
    })
    .sort((a, b) => b.rating - a.rating);
}

export function sortPicks(picks: AvailablePick[], sort: PickSort): AvailablePick[] {
  const copy = [...picks];
  switch (sort) {
    case "EXPECTED POINTS":
      return copy.sort((a, b) => b.next4Xp - a.next4Xp);
    case "VALUE":
      return copy.sort((a, b) => b.next4Xp / b.price - a.next4Xp / a.price);
    case "FORM":
      return copy.sort((a, b) => b.form - a.form);
    case "DIFFERENTIAL":
      return copy.sort((a, b) => a.ownership - b.ownership || b.rating - a.rating);
    case "FIXTURES":
      return copy.sort((a, b) => b.rating - a.rating);
    default:
      return copy.sort((a, b) => b.rating - a.rating);
  }
}

export function filterPickSection(picks: AvailablePick[], section: PickSection): AvailablePick[] {
  switch (section) {
    case "BEST VALUE":
      return picks.filter((p) => p.tag === "VALUE" || p.next4Xp / p.price >= 1.1);
    case "BEST DIFFERENTIALS":
      return picks.filter((p) => p.ownership <= 15);
    case "BEST FIXTURES":
      return picks.filter((p) => p.tag === "FIXTURE SWING" || p.rating >= 70);
    case "FORM PICKS":
      return picks.filter((p) => p.form >= 4);
    case "UNDERVALUED":
      return picks.filter((p) => p.ownership <= 12 && p.rating >= 72);
    default:
      return picks;
  }
}

export function pickXp(p: AvailablePick): number {
  return Math.round((p.next4Xp / 4) * 10) / 10;
}
