"use client";

import React, { useEffect, useCallback } from "react";
import type { BeatChart } from "@/lib/game/types";
import {
  LANE_COLORS,
  LANE_LABELS,
  LANE_NAMES,
  withAlpha,
} from "@/lib/game/constants";

interface GameReadyOverlayProps {
  chart: BeatChart;
  botEnabled?: boolean;
  onStart: () => void;
}

function formatDuration(seconds: number): string {
  const totalSeconds = Math.round(seconds);
  const minutes = Math.floor(totalSeconds / 60);
  const remainder = totalSeconds % 60;
  return `${minutes}:${String(remainder).padStart(2, "0")}`;
}

export function GameReadyOverlay({
  chart,
  botEnabled = false,
  onStart,
}: GameReadyOverlayProps) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        onStart();
      }
    },
    [onStart]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center p-4 safe-all"
      data-game-ui
      style={{
        touchAction: "auto",
        background:
          "radial-gradient(circle at 50% 12%, rgba(62,185,95,0.12), rgba(1,5,3,0.97) 54%)",
        backdropFilter: "blur(8px)",
      }}
    >
      <div className="absolute inset-0 crt-scanlines pointer-events-none" />

      <div className="block-surface w-full max-w-xl px-5 py-6 sm:px-7 sm:py-7 relative z-10">
        <div className="flex items-start justify-between gap-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-[#3EB95F] shadow-[0_0_10px_rgba(62,185,95,0.7)]" />
              <p className="text-[9px] uppercase tracking-[0.26em] text-[#A0E7AB]/60 font-[family-name:var(--font-avenue-mono)]">
                Mempool snapshot locked
              </p>
            </div>
            <h2 className="mt-3 text-3xl sm:text-4xl font-black text-white font-[family-name:var(--font-roobert)] leading-none">
              Build block{" "}
              <span className="text-[#3EB95F]">
                #{chart.blockNumber}
              </span>
            </h2>
            <p className="mt-3 max-w-sm text-xs leading-relaxed text-white/42 font-[family-name:var(--font-avenue-mono)]">
              Route pending packets through the commit boundary. Every clean
              confirmation adds weight to your block.
            </p>
          </div>

          <div className="hidden sm:block shrink-0 w-[92px]">
            <p className="mb-2 text-right text-[8px] uppercase tracking-[0.16em] text-white/25 font-[family-name:var(--font-avenue-mono)]">
              Candidate
            </p>
            <div className="grid grid-cols-4 gap-1 border border-[#3EB95F]/20 bg-black/40 p-2 rounded-md">
              {Array.from({ length: 20 }, (_, i) => (
                <span
                  key={i}
                  className="aspect-square rounded-[2px] border"
                  style={{
                    borderColor: withAlpha(
                      LANE_COLORS[(i + chart.blockNumber) % 4],
                      0.33
                    ),
                    background: withAlpha(
                      LANE_COLORS[(i + chart.blockNumber) % 4],
                      i < 8 ? 0.33 : 0.05
                    ),
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-px mt-6 overflow-hidden rounded-md border border-white/8 bg-white/8">
          {[
            { label: "Source tx", value: chart.transactionCount.toLocaleString() },
            { label: "Packets", value: chart.notes.length.toLocaleString() },
            { label: "Gas used", value: `${(chart.gasUsed / 1e6).toFixed(2)}M` },
            { label: "Block time", value: formatDuration(chart.duration) },
          ].map((item) => (
            <div
              key={item.label}
              className="bg-[#050b08] px-1.5 py-3 text-center"
            >
              <p className="text-[7px] sm:text-[8px] uppercase tracking-wider text-white/28 font-[family-name:var(--font-avenue-mono)]">
                {item.label}
              </p>
              <p className="mt-1 text-xs sm:text-sm font-bold text-white/78 font-[family-name:var(--font-avenue-mono)]">
                {item.value}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-4 border-t border-white/8 pt-4">
          <p className="mb-3 text-[8px] uppercase tracking-[0.2em] text-white/28 font-[family-name:var(--font-avenue-mono)]">
            Fee routing keys
          </p>
          <div className="grid grid-cols-4 gap-2">
            {LANE_LABELS.map((label, index) => (
              <div key={label} className="min-w-0 text-center">
                <span
                  className="mx-auto flex h-8 w-full items-center justify-center rounded-[4px] border text-xs font-bold font-[family-name:var(--font-avenue-mono)]"
                  style={{
                    borderColor: withAlpha(LANE_COLORS[index], 0.53),
                    color: LANE_COLORS[index],
                    background: withAlpha(LANE_COLORS[index], 0.05),
                  }}
                >
                  {label}
                </span>
                <p
                  className="mt-1.5 truncate text-[7px] uppercase tracking-wider font-[family-name:var(--font-avenue-mono)]"
                  style={{ color: withAlpha(LANE_COLORS[index], 0.67) }}
                >
                  {LANE_NAMES[index]}
                </p>
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={onStart}
          className="processing-btn mt-5 w-full h-12 rounded-md bg-[#A0E7AB] text-[#031006] font-bold text-sm hover:bg-[#b9f2c2] active:scale-[0.99] transition-all font-[family-name:var(--font-roobert)]"
        >
          {botEnabled ? "Run autonomous sequencer" : "Start processing"}
        </button>

        <p className="hidden sm:block mt-3 text-center text-[10px] text-white/20 font-[family-name:var(--font-avenue-mono)]">
          Enter / Space to start
        </p>
      </div>
    </div>
  );
}
