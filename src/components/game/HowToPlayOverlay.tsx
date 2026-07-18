"use client";

import React, { useEffect, useCallback, useState } from "react";
import {
  LANE_COLORS,
  LANE_LABELS,
  LANE_NAMES,
} from "@/lib/game/constants";

interface HowToPlayOverlayProps {
  onDismiss: () => void;
}

const STORAGE_KEY = "abstrack-block-builder-intro-seen-v1";

export function hasSeenHowToPlay(): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(STORAGE_KEY) === "true";
}

export function markHowToPlaySeen(): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, "true");
}

export function HowToPlayOverlay({ onDismiss }: HowToPlayOverlayProps) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsMobile("ontouchstart" in window || navigator.maxTouchPoints > 0);
  }, []);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " " || e.key === "Escape") {
        e.preventDefault();
        onDismiss();
      }
    },
    [onDismiss]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto safe-all"
      data-game-ui
      style={{
        touchAction: "auto",
        background:
          "radial-gradient(circle at 50% 0%, rgba(62,185,95,0.11), rgba(1,5,3,0.97) 52%)",
        backdropFilter: "blur(8px)",
      }}
    >
      <div className="absolute inset-0 crt-scanlines" />

      <div className="w-full max-w-2xl relative z-10">
        <div className="block-surface p-5 sm:p-7">
          <div className="mb-5 sm:mb-6 text-center">
            <p className="text-[9px] uppercase tracking-[0.25em] text-[#A0E7AB]/55 font-[family-name:var(--font-avenue-mono)]">
              Sequencer orientation
            </p>
            <h2
              className="mt-2 text-3xl sm:text-4xl font-black font-[family-name:var(--font-roobert)] text-white"
            >
              Build the block on beat.
            </h2>
            <p className="text-xs sm:text-sm text-white/45 mt-2 font-[family-name:var(--font-avenue-mono)]">
              Pending transactions move down the pipeline. Confirm them exactly
              as they cross the commit boundary.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
            <div className="rounded-md border border-white/8 bg-black/35 p-4">
              <p className="text-[10px] uppercase tracking-[0.2em] text-white/45 mb-3 font-[family-name:var(--font-avenue-mono)]">
                {isMobile ? "Tap fee bands" : "Route by fee band"}
              </p>

              <div className="grid grid-cols-4 gap-2">
                {LANE_LABELS.map((label, i) => (
                  <div key={label} className="text-center">
                    <div
                      className="h-12 sm:h-14 rounded-[4px] border flex items-center justify-center text-lg font-bold font-[family-name:var(--font-avenue-mono)]"
                      style={{
                        borderColor: LANE_COLORS[i],
                        color: LANE_COLORS[i],
                        background: `${LANE_COLORS[i]}12`,
                        boxShadow: `inset 0 0 14px ${LANE_COLORS[i]}22, 0 0 10px ${LANE_COLORS[i]}1c`,
                      }}
                    >
                      {label}
                    </div>
                    <p className="mt-1 text-[10px] text-white/30 font-[family-name:var(--font-avenue-mono)]">
                      {LANE_NAMES[i]}
                    </p>
                  </div>
                ))}
              </div>

              <p className="text-[11px] text-white/40 mt-3 leading-relaxed font-[family-name:var(--font-avenue-mono)]">
                {isMobile
                  ? "Tap a lane as its packet reaches the green commit boundary."
                  : "Arrow keys mirror D / F / J / K: Left / Down / Up / Right."}
              </p>
            </div>

            <div className="rounded-md border border-white/8 bg-black/35 p-4">
              <p className="text-[10px] uppercase tracking-[0.2em] text-white/45 mb-3 font-[family-name:var(--font-avenue-mono)]">
                Confirmation quality
              </p>

              <div className="space-y-2">
                {[
                  { label: "Sealed", points: "perfect · +1000", color: "#A0E7AB" },
                  { label: "Valid", points: "great · +600", color: "#73C98C" },
                  { label: "Late", points: "good · +300", color: "#f2c94c" },
                  { label: "Returned", points: "miss · +0", color: "#ff6b6b" },
                ].map((g) => (
                  <div key={g.label} className="flex items-center justify-between rounded-[4px] border border-white/8 bg-white/[0.02] px-3 py-2">
                    <span className="text-sm font-bold font-[family-name:var(--font-roobert)]" style={{ color: g.color }}>
                      {g.label}
                    </span>
                    <span className="text-xs text-white/55 font-[family-name:var(--font-avenue-mono)]">{g.points}</span>
                  </div>
                ))}
              </div>

              <p className="text-[11px] text-white/40 mt-3 leading-relaxed font-[family-name:var(--font-avenue-mono)]">
                Consecutive confirmations increase throughput and efficiency.
                Returned packets break the streak.{" "}
                {isMobile ? "Use the top pause control anytime." : "Press Esc to pause processing."}
              </p>
            </div>
          </div>

          <div className="mt-5 sm:mt-6 flex flex-col items-center gap-3">
            <button
              onClick={onDismiss}
              className="processing-btn w-full sm:w-auto sm:min-w-[320px] h-12 rounded-md bg-[#A0E7AB] text-[#031006] font-bold text-sm hover:bg-[#b9f2c2] active:scale-[0.99] transition-all font-[family-name:var(--font-roobert)]"
            >
              Start sequencer
            </button>

            {!isMobile && (
              <p className="text-[10px] text-white/20 font-[family-name:var(--font-avenue-mono)]">
                Enter / Space to continue
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
