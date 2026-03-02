"use client";

import React, { useEffect, useCallback, useState } from "react";
import { LANE_COLORS, LANE_LABELS } from "@/lib/game/constants";

interface HowToPlayOverlayProps {
  onDismiss: () => void;
}

const STORAGE_KEY = "abstrack-how-to-play-seen";

export function hasSeenHowToPlay(): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(STORAGE_KEY) === "true";
}

export function markHowToPlaySeen(): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, "true");
}

const LANE_NAMES = ["Kick", "Snare", "Hi-hat", "Melody"];

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
        background: "radial-gradient(circle at 50% -20%, rgba(62,185,95,0.12), rgba(0,0,0,0.95) 45%)",
        backdropFilter: "blur(6px)",
      }}
    >
      <div className="absolute inset-0 crt-scanlines" />

      <div className="w-full max-w-2xl relative z-10">
        <div className="retro-card p-5 sm:p-7 border border-[#73C98C]/25">
          <div className="mb-5 sm:mb-6 text-center">
            <p className="text-[10px] uppercase tracking-[0.25em] text-[#A0E7AB]/60 font-[family-name:var(--font-avenue-mono)]">
              Quick Start
            </p>
            <h2
              className="text-3xl sm:text-4xl font-black font-[family-name:var(--font-roobert)] text-[#3EB95F]"
              style={{ textShadow: "0 0 18px rgba(62,185,95,0.28)" }}
            >
              Ride the Block
            </h2>
            <p className="text-xs sm:text-sm text-white/45 mt-2 font-[family-name:var(--font-avenue-mono)]">
              Hit notes on the judgement line. Keep combo alive. Chase perfect timing.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
            <div className="rounded-xl border border-white/10 bg-black/35 p-4">
              <p className="text-[10px] uppercase tracking-[0.2em] text-white/45 mb-3 font-[family-name:var(--font-avenue-mono)]">
                {isMobile ? "Tap Controls" : "Keyboard Controls"}
              </p>

              <div className="grid grid-cols-4 gap-2">
                {LANE_LABELS.map((label, i) => (
                  <div key={label} className="text-center">
                    <div
                      className="h-12 sm:h-14 rounded-lg border-2 flex items-center justify-center text-lg font-bold font-[family-name:var(--font-avenue-mono)]"
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
                  ? "Tap the lane columns near the bottom when notes align with the hit line."
                  : "Arrow keys also work: Left / Down / Up / Right."}
              </p>
            </div>

            <div className="rounded-xl border border-white/10 bg-black/35 p-4">
              <p className="text-[10px] uppercase tracking-[0.2em] text-white/45 mb-3 font-[family-name:var(--font-avenue-mono)]">
                Scoring + Flow
              </p>

              <div className="space-y-2">
                {[
                  { label: "Perfect", points: "+1000", color: "#A0E7AB" },
                  { label: "Great", points: "+600", color: "#73C98C" },
                  { label: "Good", points: "+300", color: "#3EB95F" },
                  { label: "Miss", points: "+0", color: "#ff6b6b" },
                ].map((g) => (
                  <div key={g.label} className="flex items-center justify-between rounded-lg border border-white/8 bg-white/[0.02] px-3 py-2">
                    <span className="text-sm font-bold font-[family-name:var(--font-roobert)]" style={{ color: g.color }}>
                      {g.label}
                    </span>
                    <span className="text-xs text-white/55 font-[family-name:var(--font-avenue-mono)]">{g.points}</span>
                  </div>
                ))}
              </div>

              <p className="text-[11px] text-white/40 mt-3 leading-relaxed font-[family-name:var(--font-avenue-mono)]">
                Build combo for multipliers. {isMobile ? "Use top pause button anytime." : "Press Esc to pause."}
              </p>
            </div>
          </div>

          <div className="mt-5 sm:mt-6 flex flex-col items-center gap-3">
            <button
              onClick={onDismiss}
              className="neon-btn w-full sm:w-auto sm:min-w-[320px] h-12 rounded-full bg-gradient-to-r from-[#3EB95F] to-[#73C98C] text-black font-bold text-sm hover:opacity-90 active:scale-[0.98] transition-all font-[family-name:var(--font-roobert)]"
              style={{ boxShadow: "0 0 24px rgba(62,185,95,0.22)" }}
            >
              Let&apos;s Play
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
