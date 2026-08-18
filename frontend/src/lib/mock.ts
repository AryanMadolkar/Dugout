import type { Player } from "./types";

export type SquadSlot = {
  id: number;
  name: string;
  team: string;
  position: "GKP" | "DEF" | "MID" | "FWD";
  price: number;
  projected: number;
  isCaptain?: boolean;
  isVice?: boolean;
  x: number;
  y: number;
};

export type PickCategory = "Must Have" | "Strong Pick" | "Differential" | "Budget Pick";

export type PotentialPick = {
  id: number;
  name: string;
  team: string;
  position: string;
  price: number;
  projected: number;
  ownership: number;
  category: PickCategory;
  reason: string;
  rating: number;
};

export const MOCK_SQUAD: Omit<SquadSlot, "id">[] = [
  { name: "Raya", team: "ARS", position: "GKP", price: 5.5, projected: 4.2, x: 50, y: 88 },
  { name: "Gabriel", team: "ARS", position: "DEF", price: 6.0, projected: 5.8, x: 20, y: 68 },
  { name: "Saliba", team: "ARS", position: "DEF", price: 6.0, projected: 5.4, x: 40, y: 68 },
  { name: "Virgil", team: "LIV", position: "DEF", price: 6.0, projected: 5.1, x: 60, y: 68 },
  { name: "Muñoz", team: "CRY", position: "DEF", price: 5.5, projected: 4.9, x: 80, y: 68 },
  { name: "Saka", team: "ARS", position: "MID", price: 10.0, projected: 6.2, isCaptain: true, x: 18, y: 44 },
  { name: "Palmer", team: "CHE", position: "MID", price: 10.5, projected: 7.1, x: 40, y: 44 },
  { name: "M.Salah", team: "LIV", position: "MID", price: 14.5, projected: 6.8, x: 60, y: 44 },
  { name: "Rogers", team: "AVL", position: "MID", price: 7.0, projected: 5.3, x: 82, y: 44 },
  { name: "Haaland", team: "MCI", position: "FWD", price: 15.0, projected: 8.4, isVice: true, x: 35, y: 18 },
  { name: "Watkins", team: "AVL", position: "FWD", price: 9.0, projected: 5.6, x: 65, y: 18 },
  { name: "Dúbravka", team: "BUR", position: "GKP", price: 4.0, projected: 2.1, x: 50, y: 96 },
  { name: "Murillo", team: "NFO", position: "DEF", price: 5.5, projected: 3.8, x: 30, y: 96 },
  { name: "Semenyo", team: "BOU", position: "MID", price: 7.0, projected: 4.5, x: 50, y: 96 },
  { name: "Welbeck", team: "BHA", position: "FWD", price: 6.5, projected: 3.2, x: 70, y: 96 },
];

export const MOCK_RECOMMENDATION = {
  transferOut: "Saka",
  transferIn: "Palmer",
  captain: "Haaland",
  viceCaptain: "Palmer",
  formation: "3-4-3",
  expectedGain: 6.4,
  reasoning:
    "Palmer offers a stronger fixture run with higher projected minutes and attacking involvement over the next three gameweeks.",
  risk: "Medium" as const,
  riskDetail: "Rotation uncertainty around Palmer's minutes in midweek fixtures.",
  chip: "Save Wildcard",
  weakness: "Midfield",
  aiVerdict:
    "Your squad is strong overall, but midfield is the main lever. Palmer in over Saka adds +6.4 projected points this week.",
};

export const MOCK_PICKS: PotentialPick[] = [
  {
    id: 1,
    name: "Palmer",
    team: "CHE",
    position: "MID",
    price: 10.5,
    projected: 7.1,
    ownership: 42.3,
    category: "Must Have",
    reason: "Penalties, set pieces, and a soft fixture run.",
    rating: 94,
  },
  {
    id: 2,
    name: "Isak",
    team: "NEW",
    position: "FWD",
    price: 10.5,
    projected: 6.8,
    ownership: 28.1,
    category: "Strong Pick",
    reason: "Elite xG per 90 with favourable home fixtures.",
    rating: 89,
  },
  {
    id: 3,
    name: "Gabriel",
    team: "ARS",
    position: "DEF",
    price: 6.0,
    projected: 5.8,
    ownership: 28.2,
    category: "Strong Pick",
    reason: "Set-piece threat plus clean sheet upside.",
    rating: 87,
  },
  {
    id: 4,
    name: "Rogers",
    team: "AVL",
    position: "MID",
    price: 7.0,
    projected: 5.3,
    ownership: 8.4,
    category: "Differential",
    reason: "Low ownership with strong underlying stats.",
    rating: 82,
  },
  {
    id: 5,
    name: "Dúbravka",
    team: "BUR",
    position: "GKP",
    price: 4.0,
    projected: 4.1,
    ownership: 12.6,
    category: "Budget Pick",
    reason: "Save funds for premium attackers.",
    rating: 76,
  },
];

export function playersToPicks(players: Player[]): PotentialPick[] {
  const categories: PickCategory[] = ["Must Have", "Strong Pick", "Strong Pick", "Differential", "Budget Pick"];
  return players.slice(0, 5).map((p, i) => ({
    id: p.id,
    name: p.web_name,
    team: p.team_short_name ?? "—",
    position: p.position,
    price: p.price,
    projected: p.ep_next ?? p.points_per_game ?? 0,
    ownership: p.selected_by_percent ?? 0,
    category: categories[i] ?? "Strong Pick",
    reason: p.form && p.form > 5 ? "In-form with strong underlying stats." : "Solid fixture run and minutes security.",
    rating: Math.min(99, 70 + Math.round((p.total_points / 250) * 25)),
  }));
}

export function squadFromPlayers(players: Player[]): SquadSlot[] {
  const starters = players.slice(0, 11);
  const positions = ["GKP", "DEF", "DEF", "DEF", "MID", "MID", "MID", "MID", "FWD", "FWD", "FWD"] as const;
  const coords = [
    { x: 50, y: 88 },
    { x: 20, y: 68 },
    { x: 40, y: 68 },
    { x: 60, y: 68 },
    { x: 80, y: 68 },
    { x: 18, y: 44 },
    { x: 40, y: 44 },
    { x: 60, y: 44 },
    { x: 82, y: 44 },
    { x: 35, y: 18 },
    { x: 65, y: 18 },
  ];
  return starters.map((p, i) => ({
    id: p.id,
    name: p.web_name,
    team: p.team_short_name ?? "—",
    position: positions[i] ?? p.position,
    price: p.price,
    projected: p.ep_next ?? p.points_per_game ?? 0,
    isCaptain: i === 9,
    isVice: i === 6,
    ...coords[i],
  }));
}
