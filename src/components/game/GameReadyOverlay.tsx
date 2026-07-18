"use client";

import React, { useEffect, useCallback } from "react";
import type { BeatChart } from "@/lib/game/types";
import { LANE_COLORS, LANE_LABELS } from "@/lib/game/constants";

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
          "radial-gradient(circle at 50% 8%, rgba(62,185,95,0.14), rgba(0,0,0,0.96) 48%)",
        backdropFilter: "blur(6px)",
      }}
    >
      <div className="absolute inset-0 crt-scanlines pointer-events-none" />

      <div className="retro-card w-full max-w-md px-5 py-6 sm:px-7 sm:py-8 relative z-10 border border-[#73C98C]/25">
        <div className="text-center">
          <p className="text-[10px] uppercase tracking-[0.28em] text-[#A0E7AB]/60 font-[family-name:var(--font-avenue-mono)]">
            Block loaded
          </p>
          <h2
            className="mt-1 text-3xl sm:text-4xl font-black text-[#3EB95F] font-[family-name:var(--font-roobert)]"
            style={{ textShadow: "0 0 18px rgba(62,185,95,0.28)" }}
          >
            Ready to drop?
          </h2>
          <p className="mt-2 text-xs text-white/40 font-[family-name:var(--font-avenue-mono)]">
            Press start to unlock audio and begin the countdown.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2 mt-6">
          {[
            { label: "Tempo", value: `${chart.bpm} BPM` },
            { label: "Notes", value: chart.notes.length.toLocaleString() },
            { label: "Length", value: formatDuration(chart.duration) },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-lg border border-white/10 bg-black/35 px-2 py-3 text-center"
            >
              <p className="text-[9px] uppercase tracking-wider text-white/30 font-[family-name:var(--font-avenue-mono)]">
                {item.label}
              </p>
              <p className="mt-1 text-sm font-bold text-white/80 font-[family-name:var(--font-avenue-mono)]">
                {item.value}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-4 rounded-lg border border-white/10 bg-black/25 px-3 py-3">
          <div className="flex items-center justify-center gap-2">
            {LANE_LABELS.map((label, index) => (
              <span
                key={label}
                className="flex h-8 w-8 items-center justify-center rounded-md border text-xs font-bold font-[family-name:var(--font-avenue-mono)]"
                style={{
                  borderColor: `${LANE_COLORS[index]}88`,
                  color: LANE_COLORS[index],
                  background: `${LANE_COLORS[index]}10`,
                }}
              >
                {label}
              </span>
            ))}
          </div>
          <p className="mt-2 text-center text-[10px] text-white/30 font-[family-name:var(--font-avenue-mono)]">
            Match each lane when the note crosses the judgement line.
          </p>
        </div>

        <button
          onClick={onStart}
          className="neon-btn mt-5 w-full h-12 rounded-full bg-gradient-to-r from-[#3EB95F] to-[#73C98C] text-black font-bold text-sm hover:opacity-90 active:scale-[0.98] transition-all font-[family-name:var(--font-roobert)]"
          style={{ boxShadow: "0 0 24px rgba(62,185,95,0.22)" }}
        >
          {botEnabled ? "Run Agent" : "Drop the Beat"}
        </button>

        <p className="hidden sm:block mt-3 text-center text-[10px] text-white/20 font-[family-name:var(--font-avenue-mono)]">
          Enter / Space to start
        </p>
      </div>
    </div>
  );
}
