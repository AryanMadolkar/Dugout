export type PlayerState = "normal" | "flagged" | "incoming";

export type SquadPlayer = {
  id: string;
  name: string;
  initials: string;
  club: string;
  clubColor: string;
  position: "GKP" | "DEF" | "MID" | "FWD";
  price: number;
  opponent: string;
  home: boolean;
  xp: number;
  form: number;
  ownership: number;
  /** FPL points_per_game — used when form is empty */
  ppg?: number;
  isCaptain?: boolean;
  isVice?: boolean;
  state?: PlayerState;
  row: "GKP" | "DEF" | "MID" | "FWD";
  nextFixtures: { opp: string; home: boolean; fdr: number }[];
  confidence?: number;
  slot?: "starter" | "bench";
  rawName?: string;
  fplId?: number;
};

export type ChipName = "Wildcard" | "Free Hit" | "Bench Boost" | "Triple Captain";

export type ChipAvailability = "available" | "used" | "unknown";

export type ChipUsageMap = Record<ChipName, ChipAvailability>;

export type ChipState = {
  name: ChipName;
  available: boolean;
  recommended: boolean;
  valueNow: number;
  valueOptimal: number;
  optimalWindow: string;
};

export const CHIP_NAMES: ChipName[] = ["Wildcard", "Free Hit", "Bench Boost", "Triple Captain"];

export const DEFAULT_CHIP_USAGE: ChipUsageMap = {
  Wildcard: "unknown",
  "Free Hit": "unknown",
  "Bench Boost": "unknown",
  "Triple Captain": "unknown",
};

export type PickTag = "RECOMMENDED" | "DIFFERENTIAL" | "VALUE" | "MUST HAVE" | "FIXTURE SWING";

export type AvailablePick = {
  id: string;
  name: string;
  club: string;
  clubColor: string;
  position: "GKP" | "DEF" | "MID" | "FWD";
  price: number;
  form: number;
  ownership: number;
  nextFixtures: { opp: string; fdr: number }[];
  next4Xp: number;
  rating: number;
  tag: PickTag;
  reason?: string;
};

export type GwFixture = {
  id: number;
  home: string;
  away: string;
  homeFdr: number;
  awayFdr: number;
  kickoff: string;
};

export type SavedSquad = {
  formation: string | null;
  starters: SquadPlayer[];
  bench: SquadPlayer[];
  scannedAt: string;
  warnings?: string[];
};

export const CLUB_COLORS: Record<string, string> = {
  ARS: "#EF0107",
  AVL: "#670E36",
  BOU: "#DA291C",
  BRE: "#E30613",
  BHA: "#0057B8",
  CHE: "#034694",
  CRY: "#1B458F",
  EVE: "#003399",
  FUL: "#000000",
  IPS: "#0033A0",
  LEI: "#003090",
  LIV: "#C8102E",
  MCI: "#6CABDD",
  MUN: "#DA291C",
  NEW: "#241F20",
  NFO: "#DD0000",
  SOU: "#D71920",
  TOT: "#132257",
  WHU: "#7A263A",
  WOL: "#FDB913",
  BUR: "#6C1D45",
};

export const DEFAULT_CHIPS: ChipState[] = [
  { name: "Wildcard", available: true, recommended: false, valueNow: 0, valueOptimal: 0, optimalWindow: "—" },
  { name: "Free Hit", available: true, recommended: false, valueNow: 0, valueOptimal: 0, optimalWindow: "—" },
  { name: "Bench Boost", available: true, recommended: false, valueNow: 0, valueOptimal: 0, optimalWindow: "—" },
  { name: "Triple Captain", available: true, recommended: false, valueNow: 0, valueOptimal: 0, optimalWindow: "—" },
];
