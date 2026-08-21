"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useDashboard } from "@/context/DashboardContext";
import { fetchTransferAdvice, type TransferAdvice } from "@/lib/api";
import { SectionHead } from "./ui/SectionHead";

function squadPayload(allPlayers: ReturnType<typeof useDashboard>["allPlayers"]) {
  return allPlayers.map((p) => ({
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
    isVice: p.isVice,
    slot: p.slot,
  }));
}

export function TransferAdvicePanel() {
  const { hasSquad, allPlayers, activeChip, squad } = useDashboard();
  const [advice, setAdvice] = useState<TransferAdvice | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const squadKey = useMemo(
    () => `${squad?.scannedAt ?? ""}:${allPlayers.map((p) => p.id).join(",")}:${activeChip ?? ""}`,
    [squad?.scannedAt, allPlayers, activeChip],
  );

  useEffect(() => {
    if (!hasSquad || allPlayers.length === 0) {
      setAdvice(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchTransferAdvice(squadPayload(allPlayers), activeChip)
      .then((data) => {
        if (!cancelled) setAdvice(data);
      })
      .catch((err) => {
        if (!cancelled) {
          setAdvice(null);
          setError(err instanceof Error ? err.message : "Transfer advice failed");
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
        <SectionHead title="Transfer advice" />
        <p className="p-4 text-[13px] text-[var(--text-secondary)]">
          Scan your squad to get transfer recommendations.
        </p>
      </section>
    );
  }

  return (
    <section className="panel-elevated overflow-hidden">
      <SectionHead title="Transfer advice · AI" />
      <div className="p-4">
        {loading ? (
          <p className="text-[13px] text-[var(--text-secondary)]">Finding transfer targets…</p>
        ) : error ? (
          <div>
            <p className="text-[14px] font-bold text-[var(--coral)]">Could not load transfer advice</p>
            <p className="mt-2 text-[13px] text-[var(--text-secondary)]">{error}</p>
          </div>
        ) : advice ? (
          <>
            <div className="flex items-start justify-between gap-2">
              <p className="text-[16px] font-extrabold text-[var(--navy)]">{advice.headline}</p>
              <span className="font-label shrink-0 rounded bg-[var(--navy)] px-2 py-0.5 text-[10px] font-bold text-white">
                {advice.action}
              </span>
            </div>
            <p className="mt-2 text-[13px] leading-relaxed text-[var(--text-secondary)]">{advice.summary}</p>

            {advice.transfers.length > 0 ? (
              <ul className="mt-4 space-y-2">
                {advice.transfers.map((t, i) => (
                  <li
                    key={`${t.out}-${t.in}-${i}`}
                    className="rounded-[3px] border border-[var(--border)] bg-[var(--canvas)] px-3 py-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-[14px] font-extrabold text-[var(--navy)]">
                        <span className="text-[var(--coral)]">{t.out ?? "—"}</span>
                        <span className="mx-2 text-[var(--text-secondary)]">→</span>
                        <span className="text-[var(--positive)]">{t.in ?? "—"}</span>
                      </p>
                      <div className="flex flex-wrap gap-2 text-[11px] text-[var(--text-secondary)]">
                        {t.position ? (
                          <span className="font-label rounded bg-white px-1.5 py-0.5 font-bold">{t.position}</span>
                        ) : null}
                        {t.priceDelta != null ? (
                          <span className="font-semibold">
                            £{t.priceDelta > 0 ? "+" : ""}
                            {Number(t.priceDelta).toFixed(1)}m
                          </span>
                        ) : null}
                        {t.outXp != null && t.inXp != null ? (
                          <span>
                            {Number(t.outXp).toFixed(1)} → {Number(t.inXp).toFixed(1)} xP
                          </span>
                        ) : null}
                      </div>
                    </div>
                    {t.reason ? (
                      <p className="mt-1.5 text-[12px] text-[var(--text-secondary)]">{t.reason}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 rounded-[3px] bg-[var(--canvas)] px-3 py-3 text-[13px] text-[var(--text-secondary)]">
                No forced moves this week — hold looks fine on current xP/form.
              </p>
            )}

            <p className="mt-3 font-label text-[10px] text-[var(--text-secondary)]">
              {advice.source === "heuristic" ? "Dugout heuristic (Gemini blocked)" : "Powered by Gemini"}
              {" · "}confidence {advice.confidence}%
              {advice.gameweek ? ` · GW${advice.gameweek}` : ""}
            </p>
          </>
        ) : (
          <p className="text-[13px] text-[var(--text-secondary)]">No transfer advice yet.</p>
        )}
        <Link href="/upload" className="mt-4 inline-block text-[12px] font-semibold text-[var(--coral)] hover:underline">
          Re-scan squad →
        </Link>
      </div>
    </section>
  );
}
