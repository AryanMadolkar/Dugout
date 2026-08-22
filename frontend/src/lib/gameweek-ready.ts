import type { ChipName, SavedSquad, SquadPlayer } from "./dashboard-data";
import { computeTeamRating } from "./team-rating";
import { estimateSquadXp, resolveCaptainId } from "./projections";
import type { AiVerdict, TransferAdviceMove } from "./api";

export type GameweekReadySummary = {
  transfer: { label: string; detail: string; gain: number } | null;
  captain: { name: string; xp: number };
  vice: { name: string } | null;
  formation: string;
  benchOrder: string[];
  chip: ChipName | null;
  projectedScore: number;
  teamRating: number;
  ratingAfter: number;
  confidence: number;
};

function inferFormation(starters: SquadPlayer[]): string {
  const c = { DEF: 0, MID: 0, FWD: 0 };
  for (const p of starters) {
    if (p.position === "DEF") c.DEF += 1;
    else if (p.position === "MID") c.MID += 1;
    else if (p.position === "FWD") c.FWD += 1;
  }
  return `${c.DEF}-${c.MID}-${c.FWD}`;
}

function transferGain(primary: TransferAdviceMove | AiVerdict["transfers"][number] | undefined): number {
  if (!primary || !("inXp" in primary)) return 0;
  const move = primary as TransferAdviceMove;
  return Math.round(((move.inXp ?? 0) - (move.outXp ?? 0)) * 10) / 10;
}

export function buildGameweekReady(
  squad: SavedSquad,
  starters: SquadPlayer[],
  bench: SquadPlayer[],
  activeChip: ChipName | null,
  verdict: AiVerdict | null,
  transfer: TransferAdviceMove | null,
): GameweekReadySummary {
  const rating = computeTeamRating(starters, bench, undefined, activeChip);
  const captainId = resolveCaptainId(starters);
  const captain = starters.find((p) => p.id === captainId) ?? starters[0];
  const vice = starters.find((p) => p.isVice && p.id !== captainId) ?? starters[1];

  const primary = transfer ?? verdict?.transfers[0];
  const moveGain = transferGain(primary);
  const transferBlock =
    primary?.out && primary?.in
      ? {
          label: `${primary.out} → ${primary.in}`,
          detail: primary.reason ?? verdict?.summary ?? "",
          gain: moveGain,
        }
      : verdict?.action === "Hold" || verdict?.action === "ROLL"
        ? { label: "Roll transfer", detail: verdict.summary, gain: 0 }
        : null;

  return {
    transfer: transferBlock,
    captain: { name: captain?.name ?? "—", xp: captain?.xp ?? 0 },
    vice: vice ? { name: vice.name } : null,
    formation: squad.formation ?? inferFormation(starters),
    benchOrder: bench.map((p) => p.name),
    chip: activeChip,
    projectedScore: estimateSquadXp(starters, bench, activeChip),
    teamRating: rating?.score ?? 0,
    ratingAfter: Math.min(99, (rating?.score ?? 0) + (transferBlock?.gain ?? 0) * 0.4),
    confidence: verdict?.confidence ?? 82,
  };
}
