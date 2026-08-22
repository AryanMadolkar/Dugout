"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useDashboard } from "@/context/DashboardContext";
import { fetchAiVerdict, type AiVerdict } from "@/lib/api";
import { managerAdviceContext, squadToApiPayload } from "@/lib/advice-context";
import { SectionHead } from "./ui/SectionHead";

export function AIVerdictPanel() {
  const { hasSquad, allPlayers, activeChip, squad, bank, freeTransfers, fplRank, strategyMode } = useDashboard();
  const [verdict, setVerdict] = useState<AiVerdict | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const squadKey = useMemo(
    () => `${squad?.scannedAt ?? ""}:${allPlayers.map((p) => p.id).join(",")}:${activeChip ?? ""}`,
    [squad?.scannedAt, allPlayers, activeChip],
  );

  useEffect(() => {
    if (!hasSquad || allPlayers.length === 0) {
      setVerdict(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchAiVerdict(
      squadToApiPayload(allPlayers),
      activeChip,
      managerAdviceContext({ bank, freeTransfers, fplRank, strategyMode }),
    )
      .then((data) => {
        if (!cancelled) setVerdict(data);
      })
      .catch((err) => {
        if (!cancelled) {
          setVerdict(null);
          setError(err instanceof Error ? err.message : "Gemini verdict failed");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- squadKey captures identity
  }, [hasSquad, squadKey]);

  if (!hasSquad) {
    return (
      <section className="panel overflow-hidden">
        <SectionHead title="AI Verdict" />
        <p className="p-4 text-[13px] text-[var(--text-secondary)]">
          Scan your squad to get Gemini transfer recommendations.
        </p>
      </section>
    );
  }

  return (
    <section className="panel-elevated overflow-hidden">
      <SectionHead title="Full analysis" />
      <div className="p-4">
        {loading ? (
          <p className="text-[13px] text-[var(--text-secondary)]">Gemini is analysing your squad…</p>
        ) : error ? (
          <div>
            <p className="text-[14px] font-bold text-[var(--coral)]">Gemini unavailable</p>
            <p className="mt-2 text-[13px] text-[var(--text-secondary)]">{error}</p>
          </div>
        ) : verdict ? (
          <>
            <div className="flex items-start justify-between gap-2">
              <p className="text-[15px] font-extrabold text-[var(--navy)]">{verdict.headline}</p>
              <span className="font-label shrink-0 rounded bg-[var(--navy)] px-2 py-0.5 text-[10px] font-bold text-white">
                {verdict.action}
              </span>
            </div>
            <p className="mt-2 text-[13px] leading-relaxed text-[var(--text-secondary)]">{verdict.summary}</p>
            {verdict.captain ? (
              <p className="mt-3 text-[12px]">
                <span className="font-bold text-[var(--navy)]">Captain:</span> {verdict.captain.name}
                {verdict.captain.reason ? (
                  <span className="text-[var(--text-secondary)]"> — {verdict.captain.reason}</span>
                ) : null}
              </p>
            ) : null}
            {verdict.transfers.length > 0 ? (
              <ul className="mt-3 space-y-1.5">
                {verdict.transfers.map((t, i) => (
                  <li
                    key={i}
                    className="rounded-[3px] border border-[var(--border)] bg-[var(--canvas)] px-3 py-2 text-[12px]"
                  >
                    <span className="font-bold">
                      {(t.out || "—") + " → " + (t.in || "—")}
                    </span>
                    {t.reason ? <span className="text-[var(--text-secondary)]"> · {t.reason}</span> : null}
                  </li>
                ))}
              </ul>
            ) : null}
            {verdict.risks.length > 0 ? (
              <p className="mt-3 text-[11px] text-[var(--text-secondary)]">Risks: {verdict.risks.join(" · ")}</p>
            ) : null}
            <p className="mt-3 font-label text-[10px] text-[var(--text-secondary)]">
              Dugout analysis · confidence {verdict.confidence}%
              {verdict.gameweek ? ` · GW${verdict.gameweek}` : ""}
            </p>
          </>
        ) : (
          <p className="text-[13px] text-[var(--text-secondary)]">No verdict yet.</p>
        )}
        <Link href="/upload" className="mt-4 inline-block text-[12px] font-semibold text-[var(--coral)] hover:underline">
          Re-scan squad →
        </Link>
      </div>
    </section>
  );
}
