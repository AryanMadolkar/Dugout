/** Kit colours for FPL-style shirt rendering */
export const KIT_COLORS: Record<string, { primary: string; secondary: string; trim: string }> = {
  ARS: { primary: "#EF0107", secondary: "#FFFFFF", trim: "#FFFFFF" },
  AVL: { primary: "#670E36", secondary: "#95BFE5", trim: "#95BFE5" },
  BOU: { primary: "#DA291C", secondary: "#000000", trim: "#FFFFFF" },
  BRE: { primary: "#E30613", secondary: "#FFFFFF", trim: "#FFFFFF" },
  BHA: { primary: "#0057B8", secondary: "#FFFFFF", trim: "#FFFFFF" },
  CHE: { primary: "#034694", secondary: "#FFFFFF", trim: "#FFFFFF" },
  CRY: { primary: "#1B458F", secondary: "#C4122E", trim: "#FFFFFF" },
  EVE: { primary: "#003399", secondary: "#FFFFFF", trim: "#FFFFFF" },
  FUL: { primary: "#FFFFFF", secondary: "#000000", trim: "#000000" },
  IPS: { primary: "#0033A0", secondary: "#FFFFFF", trim: "#FFFFFF" },
  LEI: { primary: "#003090", secondary: "#FFFFFF", trim: "#FFFFFF" },
  LIV: { primary: "#C8102E", secondary: "#FFFFFF", trim: "#FFFFFF" },
  MCI: { primary: "#6CABDD", secondary: "#FFFFFF", trim: "#1C2C5B" },
  MUN: { primary: "#DA291C", secondary: "#FFFFFF", trim: "#FFFFFF" },
  NEW: { primary: "#241F20", secondary: "#FFFFFF", trim: "#FFFFFF" },
  NFO: { primary: "#DD0000", secondary: "#FFFFFF", trim: "#FFFFFF" },
  SOU: { primary: "#D71920", secondary: "#FFFFFF", trim: "#FFFFFF" },
  TOT: { primary: "#132257", secondary: "#FFFFFF", trim: "#FFFFFF" },
  WHU: { primary: "#7A263A", secondary: "#1BB1E7", trim: "#FFFFFF" },
  WOL: { primary: "#FDB913", secondary: "#231F20", trim: "#231F20" },
  BUR: { primary: "#6C1D45", secondary: "#99D6EA", trim: "#FFFFFF" },
};

export function getKit(club: string, fallback = "#888888") {
  return KIT_COLORS[club] ?? { primary: fallback, secondary: "#FFFFFF", trim: "#FFFFFF" };
}

export function kitTextColor(primary: string): string {
  const hex = primary.replace("#", "");
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.62 ? "#1a1a1a" : "#FFFFFF";
}
