"use client";

import React, { useEffect, useCallback, useState } from "react";
import { LANE_COLORS, LANE_LABELS } from "@/lib/game/constants";

interface HowToPlayOverlayProps {
  onDismiss: () => void;
}

const STORAGE_KEY = "tempo-how-to-play-seen";

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
    setIsMobile(
      "ontouchstart" in window || navigator.maxTouchPoints > 0
    );
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
        background: "rgba(0,0,0,0.92)",
        backdropFilter: "blur(4px)",
      }}
    >
      {/* CRT scanlines */}
      <div className="absolute inset-0 crt-scanlines" />

      <div className="w-full max-w-sm flex flex-col items-center gap-4 sm:gap-6 py-4 relative z-10">
        {/* Title */}
        <h2
          className="text-2xl sm:text-3xl font-bold text-[#4ecdc4] font-[family-name:var(--font-roobert)]"
          style={{
            textShadow: "0 0 10px rgba(78,205,196,0.5), 0 0 20px rgba(78,205,196,0.2)",
          }}
        >
          How to Play
        </h2>

        {/* Mobile: show touch instructions */}
        {isMobile ? (
          <div className="w-full">
            <p className="text-[10px] text-white/35 uppercase tracking-[0.2em] text-center mb-3 font-[family-name:var(--font-avenue-mono)]">
              Tap the lanes as notes reach the line
            </p>
            <div className="flex justify-center gap-2">
              {LANE_LABELS.map((label, i) => (
                <div key={label} className="flex flex-col items-center gap-1.5">
                  <div
                    className="w-14 h-14 rounded-xl border-2 flex items-center justify-center text-xl font-bold font-[family-name:var(--font-avenue-mono)]"
                    style={{
                      borderColor: LANE_COLORS[i],
                      color: LANE_COLORS[i],
                      background: LANE_COLORS[i] + "10",
                      boxShadow: `0 0 15px ${LANE_COLORS[i]}25`,
                    }}
                  >
                    {label}
                  </div>
                  <span className="text-[10px] text-white/25 font-[family-name:var(--font-avenue-mono)]">
                    {["Kick", "Snare", "Hi-hat", "Melody"][i]}
                  </span>
                </div>
              ))}
            </div>
            <p className="text-xs text-white/30 text-center mt-3 font-[family-name:var(--font-avenue-mono)]">
              Tap anywhere in a lane column to hit notes.
              <br />
              The bottom of the screen is your tap zone.
            </p>
          </div>
        ) : (
          <>
            {/* Desktop: show keyboard controls */}
            <div className="w-full">
              <p className="text-[10px] text-white/35 uppercase tracking-[0.2em] text-center mb-3 font-[family-name:var(--font-avenue-mono)]">
                Hit the keys as notes reach the line
              </p>
              <div className="flex justify-center gap-3 sm:gap-4">
                {LANE_LABELS.map((label, i) => (
                  <div key={label} className="flex flex-col items-center gap-2">
                    <div
                      className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg border-2 flex items-center justify-center text-lg sm:text-xl font-bold font-[family-name:var(--font-avenue-mono)]"
                      style={{
                        borderColor: LANE_COLORS[i],
                        color: LANE_COLORS[i],
                        background: LANE_COLORS[i] + "10",
                        boxShadow: `0 0 15px ${LANE_COLORS[i]}25`,
                      }}
                    >
                      {label}
                    </div>
                    <span className="text-[10px] text-white/25 font-[family-name:var(--font-avenue-mono)]">
                      {["Kick", "Snare", "Hi-hat", "Melody"][i]}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <p className="text-xs text-white/25 text-center font-[family-name:var(--font-avenue-mono)]">
              Arrow keys also work:
              <span className="text-white/40 ml-1">
                Left / Down / Up / Right
              </span>
            </p>
          </>
        )}

        {/* Timing grades */}
        <div className="w-full">
          <p className="text-[10px] text-white/35 uppercase tracking-[0.2em] text-center mb-2 sm:mb-3 font-[family-name:var(--font-avenue-mono)]">
            Timing Grades
          </p>
          <div className="flex justify-center gap-3 sm:gap-4 text-center">
            {[
              { label: "PERFECT", color: "#ffd700", points: "+1000" },
              { label: "GREAT", color: "#4ecdc4", points: "+600" },
              { label: "GOOD", color: "#45b7d1", points: "+300" },
              { label: "MISS", color: "#ff6b6b", points: "+0" },
            ].map((grade) => (
              <div key={grade.label}>
                <p
                  className="text-xs sm:text-sm font-bold font-[family-name:var(--font-avenue-mono)]"
                  style={{
                    color: grade.color,
                    textShadow: `0 0 8px ${grade.color}40`,
                  }}
                >
                  {grade.label}
                </p>
                <p className="text-[10px] text-white/25 font-[family-name:var(--font-avenue-mono)]">
                  {grade.points}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Tips */}
        <div className="w-full retro-card p-3">
          <p className="text-xs text-white/40 leading-relaxed text-center font-[family-name:var(--font-avenue-mono)]">
            Build combos for score multipliers.
            <br />
            {isMobile ? (
              <>Tap the pause button at the top to pause.</>
            ) : (
              <>
                Press <kbd className="px-1 py-0.5 rounded bg-white/5 text-white/50 border border-white/10 text-[10px]">Esc</kbd> to pause.
              </>
            )}
          </p>
        </div>

        {/* Dismiss button */}
        <button
          onClick={onDismiss}
          className="neon-btn w-full max-w-xs h-12 sm:h-14 rounded-full bg-gradient-to-r from-[#4ecdc4] to-[#45b7d1] text-black font-bold text-sm hover:opacity-90 active:scale-[0.98] transition-all font-[family-name:var(--font-roobert)]"
          style={{
            boxShadow: "0 0 20px rgba(78,205,196,0.2)",
          }}
        >
          Got it &mdash; Let&apos;s Play!
        </button>

        {!isMobile && (
          <p className="text-[10px] text-white/15 font-[family-name:var(--font-avenue-mono)]">
            Press <kbd>Enter</kbd> or <kbd>Space</kbd> to start
          </p>
        )}
      </div>
    </div>
  );
}
