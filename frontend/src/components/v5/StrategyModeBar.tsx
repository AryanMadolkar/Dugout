"use client";

import { useDashboard } from "@/context/DashboardContext";
import { STRATEGY_COPY, STRATEGY_MODES, type StrategyMode } from "@/lib/strategy-mode";

export function StrategyModeBar({ compact }: { compact?: boolean }) {
  const { strategyMode, setStrategyMode } = useDashboard();

  return (
    <div className={`panel overflow-hidden ${compact ? "" : "panel-elevated"}`}>
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div>
          <p className="font-label text-[10px] text-[var(--text-secondary)]">Risk mode</p>
          {!compact ? (
            <p className="text-[12px] text-[var(--text-secondary)]">{STRATEGY_COPY[strategyMode].subtitle}</p>
          ) : null}
        </div>
        <div className="flex gap-1">
          {STRATEGY_MODES.map((mode) => {
            const active = strategyMode === mode;
            const tone =
              mode === "SAFE"
                ? active
                  ? "bg-[var(--positive)] text-white"
                  : "border border-[var(--border)]"
                : mode === "AGGRESSIVE"
                  ? active
                    ? "bg-[var(--coral)] text-white"
                    : "border border-[var(--border)]"
                  : active
                    ? "bg-[var(--navy)] text-white"
                    : "border border-[var(--border)]";
            return (
              <button
                key={mode}
                type="button"
                onClick={() => setStrategyMode(mode)}
                title={STRATEGY_COPY[mode].subtitle}
                className={`control px-3 py-1.5 text-[10px] font-bold tracking-wide ${tone}`}
              >
                {STRATEGY_COPY[mode].title}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function strategyBadge(mode: StrategyMode) {
  if (mode === "SAFE") return "text-[var(--positive)]";
  if (mode === "AGGRESSIVE") return "text-[var(--coral)]";
  return "text-[var(--navy)]";
}
