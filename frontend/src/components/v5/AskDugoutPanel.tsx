"use client";

import { useMemo, useState } from "react";
import { useDashboard } from "@/context/DashboardContext";
import { estimatePlayerXp } from "@/lib/projections";
import { recommendChipStrategy } from "@/lib/chip-strategy";
import { rankCaptainCandidates } from "@/lib/strategy-mode";
import { SectionHead } from "./ui/SectionHead";

const PRESETS = [
  "Should I take a -4 for this transfer?",
  "Who should I captain?",
  "Should I wildcard?",
  "Who should I bench?",
  "Should I play Bench Boost?",
];

function answerQuestion(
  q: string,
  ctx: {
    captain: string;
    transfer: string;
    chip: string;
    weakest: string;
    benchLow: string;
    hitWorth: boolean;
  },
): { headline: string; body: string; verdict: "YES" | "NO" | "MAYBE" } {
  const lower = q.toLowerCase();
  if (lower.includes("-4") || lower.includes("hit")) {
    return ctx.hitWorth
      ? { verdict: "MAYBE", headline: "Only if the gain clears +4 xP", body: `${ctx.transfer}. Net gain after -4 may still be positive — check minutes before deadline.` }
      : { verdict: "NO", headline: "No — wait", body: `Projected gain doesn't clear the -4 after accounting for variance. ${ctx.weakest} is the weak link but rolling may be smarter.` };
  }
  if (lower.includes("captain")) {
    return { verdict: "YES", headline: `Captain ${ctx.captain}`, body: "Highest blend of xP, minutes and fixture in your current risk mode." };
  }
  if (lower.includes("wildcard") || lower.includes("wc")) {
    return ctx.chip.includes("Wildcard")
      ? { verdict: "MAYBE", headline: "Wildcard window approaching", body: ctx.chip }
      : { verdict: "NO", headline: "Save Wildcard", body: "No structural rebuild needed this week — chip value higher later." };
  }
  if (lower.includes("bench")) {
    return { verdict: "YES", headline: `Bench ${ctx.benchLow} first`, body: "Lowest projected starter — auto-sub order should protect your XI." };
  }
  if (lower.includes("bench boost") || lower.includes("bb")) {
    return { verdict: "MAYBE", headline: "Bench Boost situational", body: ctx.chip };
  }
  return { verdict: "MAYBE", headline: "Ask something specific", body: "Try captain, -4, wildcard, or bench questions." };
}

export function AskDugoutPanel() {
  const { hasSquad, starters, bench, strategyMode, chipUsage, activeChip, bank, freeTransfers, fplRank } =
    useDashboard();
  const [question, setQuestion] = useState(PRESETS[1]);
  const [custom, setCustom] = useState("");

  const ctx = useMemo(() => {
    const cap = rankCaptainCandidates(starters, strategyMode)[0]?.player.name ?? "—";
    const chip = recommendChipStrategy(starters, bench, chipUsage);
    const weakest = [...starters].filter((p) => p.position !== "GKP").sort((a, b) => a.xp - b.xp)[0]?.name ?? "—";
    const benchLow = bench[bench.length - 1]?.name ?? "—";
    return {
      captain: cap,
      transfer: `Weakest: ${weakest}`,
      chip: chip?.headline ?? "Hold chips",
      weakest,
      benchLow,
      hitWorth: false,
    };
  }, [starters, bench, strategyMode, chipUsage]);

  const response = useMemo(
    () => answerQuestion(custom || question, ctx),
    [custom, question, ctx],
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
              }}
              className={`control px-2 py-1 text-[10px] font-semibold ${
                question === p && !custom ? "bg-[var(--navy)] text-white" : "border border-[var(--border)]"
              }`}
            >
              {p.replace("?", "")}
            </button>
          ))}
        </div>
        <input
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          placeholder="Or type your question…"
          className="control mt-3 w-full border border-[var(--border)] px-3 py-2 text-[13px]"
        />
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
        <p className="mt-2 font-label text-[10px] text-[var(--text-secondary)]">
          Context: {starters.length} starters · chip {activeChip ?? "none"} · {strategyMode} mode
        </p>
      </div>
    </section>
  );
}
