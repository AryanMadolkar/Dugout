"use client";

import { useCallback, useState } from "react";
import { useDashboard } from "@/context/DashboardContext";
import { fetchAiAsk } from "@/lib/api";
import { managerAdviceContext, squadToApiPayload } from "@/lib/advice-context";
import { SectionHead } from "./ui/SectionHead";

const PRESETS = [
  "Should I take a -4 for this transfer?",
  "Who should I captain?",
  "Should I wildcard?",
  "Who should I bench?",
  "Should I play Bench Boost?",
];

export function AskDugoutPanel() {
  const {
    hasSquad,
    allPlayers,
    strategyMode,
    activeChip,
    bank,
    freeTransfers,
    fplRank,
  } = useDashboard();
  const [question, setQuestion] = useState(PRESETS[1]);
  const [custom, setCustom] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<{
    verdict: string;
    headline: string;
    body: string;
  } | null>(null);

  const ask = useCallback(
    async (q: string) => {
      if (!hasSquad || !q.trim()) return;
      setLoading(true);
      setError(null);
      try {
        const data = await fetchAiAsk(
          q.trim(),
          squadToApiPayload(allPlayers),
          activeChip,
          managerAdviceContext({ bank, freeTransfers, fplRank, strategyMode }),
        );
        setResponse({
          verdict: data.verdict,
          headline: data.headline,
          body: data.body,
        });
      } catch (err) {
        setResponse(null);
        setError(err instanceof Error ? err.message : "Ask Dugout unavailable");
      } finally {
        setLoading(false);
      }
    },
    [hasSquad, allPlayers, activeChip, bank, freeTransfers, fplRank, strategyMode],
  );

  if (!hasSquad) {
    return (
      <section className="panel overflow-hidden">
        <SectionHead title="Ask Dugout" />
        <p className="p-4 text-[13px] text-[var(--text-secondary)]">Scan your squad to ask contextual questions.</p>
      </section>
    );
  }

  return (
    <section className="panel-elevated overflow-hidden">
      <SectionHead
        title="Ask Dugout"
        right={
          <span className="text-[10px] text-[var(--text-secondary)]">
            {freeTransfers} FT · £{bank.toFixed(1)}m{fplRank ? ` · #${fplRank.toLocaleString()}` : ""}
          </span>
        }
      />
      <div className="p-4">
        <div className="flex flex-wrap gap-1">
          {PRESETS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => {
                setQuestion(p);
                setCustom("");
                void ask(p);
              }}
              className={`control px-2 py-1 text-[10px] font-semibold ${
                question === p && !custom ? "bg-[var(--navy)] text-white" : "border border-[var(--border)]"
              }`}
            >
              {p.replace("?", "")}
            </button>
          ))}
        </div>
        <form
          className="mt-3 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void ask(custom || question);
          }}
        >
          <input
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            placeholder="Or type your question…"
            className="control flex-1 border border-[var(--border)] px-3 py-2 text-[13px]"
          />
          <button
            type="submit"
            disabled={loading}
            className="control bg-[var(--navy)] px-3 py-2 text-[12px] font-bold text-white disabled:opacity-50"
          >
            Ask
          </button>
        </form>
        {loading ? (
          <p className="mt-4 text-[13px] text-[var(--text-secondary)]">Thinking…</p>
        ) : error ? (
          <p className="mt-4 text-[13px] text-[var(--coral)]">{error}</p>
        ) : response ? (
          <div className="mt-4 rounded-[3px] border border-[var(--border)] bg-[var(--canvas)] px-3 py-3">
            <p
              className={`font-label text-[11px] font-bold ${
                response.verdict === "YES"
                  ? "text-[var(--positive)]"
                  : response.verdict === "NO"
                    ? "text-[var(--coral)]"
                    : "text-[var(--navy)]"
              }`}
            >
              {response.verdict}
            </p>
            <p className="mt-1 text-[15px] font-extrabold text-[var(--navy)]">{response.headline}</p>
            <p className="mt-2 text-[13px] leading-relaxed text-[var(--text-body)]">{response.body}</p>
          </div>
        ) : null}
        <p className="mt-2 font-label text-[10px] text-[var(--text-secondary)]">
          Context: {allPlayers.filter((p) => p.slot !== "bench").length} starters · chip {activeChip ?? "none"} ·{" "}
          {strategyMode} mode
        </p>
      </div>
    </section>
  );
}
