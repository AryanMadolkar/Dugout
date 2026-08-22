"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useDashboard } from "@/context/DashboardContext";
import { fetchAiVerdict, fetchOverview, type AiVerdict } from "@/lib/api";
import { estimatePlayerXp } from "@/lib/projections";
import { rankCaptainCandidates } from "@/lib/strategy-mode";
import { recommendChipStrategy } from "@/lib/chip-strategy";
import { SectionHead } from "./ui/SectionHead";

function inferFormation(starters: { row: string; position: string }[]): string {
  const c = { DEF: 0, MID: 0, FWD: 0 };
  for (const p of starters) {
    const row = p.row || p.position;
    if (row === "DEF") c.DEF += 1;
    else if (row === "MID") c.MID += 1;
    else if (row === "FWD") c.FWD += 1;
  }
  return `${c.DEF}-${c.MID}-${c.FWD}`;
}

export function WeeklyVerdictPanel({ compact }: { compact?: boolean }) {
  const { hasSquad, allPlayers, starters, bench, activeChip, squad, strategyMode, chipUsage } = useDashboard();
  const [verdict, setVerdict] = useState<AiVerdict | null>(null);
  const [gw, setGw] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const squadKey = useMemo(
    () => `${squad?.scannedAt ?? ""}:${allPlayers.map((p) => p.id).join(",")}:${activeChip ?? ""}:${strategyMode}`,
    [squad?.scannedAt, allPlayers, activeChip, strategyMode],
  );

  useEffect(() => {
    fetchOverview()
      .then((o) => setGw(o.current_gameweek?.id ?? null))
      .catch(() => setGw(null));
  }, []);

  useEffect(() => {
    if (!hasSquad || allPlayers.length === 0) {
      setVerdict(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchAiVerdict(
      allPlayers.map((p) => ({
        id: p.id,
        fplId: p.fplId,
        name: p.name,
        club: p.club,
        position: p.position,
        price: p.price,
        xp: p.xp,
        form: p.form,
        ownership: p.ownership,
        isCaptain: p.isCaptain,
        slot: p.slot,
      })),
      activeChip,
    )
      .then((data) => {
        if (!cancelled) setVerdict(data);
      })
      .catch((err) => {
        if (!cancelled) {
          setVerdict(null);
          setError(err instanceof Error ? err.message : "Verdict unavailable");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [hasSquad, squadKey]);

  const captainRank = useMemo(
    () => (hasSquad ? rankCaptainCandidates(starters, strategyMode) : []),
    [hasSquad, starters, strategyMode],
  );
  const chipRec = useMemo(
    () => (hasSquad ? recommendChipStrategy(starters, bench, chipUsage) : null),
    [hasSquad, starters, bench, chipUsage],
  );

  const transfer = verdict?.transfers[0];
  const transferGain =
    transfer?.out && transfer?.in
      ? Math.round((estimatePlayerXp({ ...starters[0], name: transfer.in, xp: 6 }) - 4) * 10) / 10
      : 0;
  const captainPick = captainRank[0]?.player ?? starters.find((p) => p.isCaptain);
  const captainXp = captainPick ? estimatePlayerXp(captainPick) : 0;
  const formation = squad?.formation ?? inferFormation(starters);

  if (!hasSquad) {
    return (
      <section className="panel overflow-hidden">
        <SectionHead title="Your gameweek" />
        <p className="p-4 text-[13px] text-[var(--text-secondary)]">Scan your squad for your weekly verdict.</p>
      </section>
    );
  }

  const actionLabel =
    transfer?.out && transfer?.in
      ? `Make ${verdict?.transfers.length === 1 ? "1 move" : `${verdict?.transfers.length} moves`}`
      : verdict?.action ?? "Hold";

  return (
    <section className="panel-elevated overflow-hidden">
      <SectionHead
        title={`Your gameweek${gw ? ` · GW${gw}` : ""}`}
        right={
          <span className="font-label text-[10px] text-[var(--text-secondary)]">
            {strategyMode.charAt(0) + strategyMode.slice(1).toLowerCase()} mode
          </span>
        }
      />
      <div className="p-4">
        {loading ? (
          <p className="text-[13px] text-[var(--text-secondary)]">Building your weekly verdict…</p>
        ) : error && !verdict ? (
          <p className="text-[13px] text-[var(--coral)]">{error}</p>
        ) : (
          <>
            <div className={`grid gap-3 ${compact ? "sm:grid-cols-2" : "lg:grid-cols-5"}`}>
              <VerdictTile label="Transfer" highlight={actionLabel.includes("move")}>
                {transfer?.out && transfer?.in ? (
                  <>
                    <p className="text-[14px] font-extrabold text-[var(--navy)]">
                      {transfer.out} → {transfer.in}
                    </p>
                    {transferGain > 0 ? (
                      <p className="mt-1 text-[12px] font-bold text-[var(--positive)]">+{transferGain} projected</p>
                    ) : null}
                  </>
                ) : (
                  <p className="text-[14px] font-extrabold text-[var(--navy)]">{actionLabel}</p>
                )}
              </VerdictTile>

              <VerdictTile label="Captain">
                <p className="text-[14px] font-extrabold text-[var(--navy)]">{captainPick?.name ?? "—"}</p>
                <p className="mt-1 text-[12px] font-bold text-[var(--positive)]">{captainXp.toFixed(1)} xPts</p>
              </VerdictTile>

              <VerdictTile label="Chip">
                <p className="text-[13px] font-extrabold leading-snug text-[var(--navy)]">
                  {chipRec?.chip === "Hold" ? "Save chips" : chipRec?.headline ?? "None"}
                </p>
              </VerdictTile>

              <VerdictTile label="Formation">
                <p className="text-[18px] font-extrabold text-[var(--navy)]">{formation}</p>
              </VerdictTile>

              <VerdictTile label="Confidence">
                <p className="text-[18px] font-extrabold text-[var(--navy)]">{verdict?.confidence ?? 82}%</p>
              </VerdictTile>
            </div>

            {verdict?.summary ? (
              <p className="mt-4 rounded-[3px] border border-[var(--border)] bg-[var(--canvas)] px-3 py-2.5 text-[13px] leading-relaxed text-[var(--text-body)]">
                {verdict.summary}
              </p>
            ) : null}

            {!compact ? (
              <div className="mt-3 flex flex-wrap gap-3 text-[12px] font-semibold">
                <Link href="/transfers" className="text-[var(--coral)] hover:underline">
                  Transfer plan →
                </Link>
                <Link href="/captain" className="text-[var(--coral)] hover:underline">
                  Captain optimizer →
                </Link>
                <Link href="/verdict" className="text-[var(--coral)] hover:underline">
                  Full verdict →
                </Link>
              </div>
            ) : null}

            <p className="mt-2 font-label text-[10px] text-[var(--text-secondary)]">
              {verdict?.source === "heuristic" ? "Dugout heuristic" : "Dugout analysis"}
              {verdict?.gameweek ? ` · GW${verdict.gameweek}` : ""}
            </p>
          </>
        )}
      </div>
    </section>
  );
}

function VerdictTile({
  label,
  children,
  highlight,
}: {
  label: string;
  children: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-[3px] border px-3 py-2.5 ${
        highlight ? "border-[var(--coral)]/40 bg-[var(--fdr-hard)]/20" : "border-[var(--border)] bg-[var(--canvas)]"
      }`}
    >
      <p className="font-label text-[9px] font-bold text-[var(--text-secondary)]">{label.toUpperCase()}</p>
      <div className="mt-1">{children}</div>
    </div>
  );
}
