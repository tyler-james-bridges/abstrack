"use client";

import React, { useEffect, useCallback } from "react";
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
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4" data-game-ui style={{ touchAction: "auto" }}>
      <div className="w-full max-w-sm flex flex-col items-center gap-6">
        {/* Title */}
        <h2
          className="text-2xl sm:text-3xl font-bold text-white font-[family-name:var(--font-roobert)]"
          style={{ textShadow: "0 0 20px rgba(78, 205, 196, 0.4)" }}
        >
          How to Play
        </h2>

        {/* Lane keys */}
        <div className="w-full">
          <p className="text-xs text-white/40 uppercase tracking-widest text-center mb-3">
            Hit the keys as notes reach the line
          </p>
          <div className="flex justify-center gap-3 sm:gap-4">
            {LANE_LABELS.map((label, i) => (
              <div key={label} className="flex flex-col items-center gap-2">
                <div
                  className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg border-2 flex items-center justify-center text-lg sm:text-xl font-bold font-mono"
                  style={{
                    borderColor: LANE_COLORS[i],
                    color: LANE_COLORS[i],
                    background: LANE_COLORS[i] + "15",
                    boxShadow: `0 0 12px ${LANE_COLORS[i]}30`,
                  }}
                >
                  {label}
                </div>
                <span className="text-[10px] text-white/30">
                  {["Kick", "Snare", "Hi-hat", "Melody"][i]}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Arrow keys alternative */}
        <p className="text-xs text-white/30 text-center">
          Arrow keys also work:
          <span className="font-mono text-white/50 ml-1">
            Left / Down / Up / Right
          </span>
        </p>

        {/* Timing grades */}
        <div className="w-full">
          <p className="text-xs text-white/40 uppercase tracking-widest text-center mb-3">
            Timing Grades
          </p>
          <div className="flex justify-center gap-4 text-center">
            <div>
              <p className="text-sm font-bold" style={{ color: "#ffd700" }}>PERFECT</p>
              <p className="text-[10px] text-white/30">+1000</p>
            </div>
            <div>
              <p className="text-sm font-bold" style={{ color: "#4ecdc4" }}>GREAT</p>
              <p className="text-[10px] text-white/30">+600</p>
            </div>
            <div>
              <p className="text-sm font-bold" style={{ color: "#45b7d1" }}>GOOD</p>
              <p className="text-[10px] text-white/30">+300</p>
            </div>
            <div>
              <p className="text-sm font-bold" style={{ color: "#ff6b6b" }}>MISS</p>
              <p className="text-[10px] text-white/30">+0</p>
            </div>
          </div>
        </div>

        {/* Tips */}
        <div className="w-full bg-white/5 rounded-lg p-3 border border-white/10">
          <p className="text-xs text-white/50 leading-relaxed text-center">
            Build combos for score multipliers.
            <br />
            Press <kbd className="px-1 py-0.5 rounded bg-white/10 text-white/60 font-mono text-[10px]">Esc</kbd> to pause during play.
            <br />
            On mobile, tap the lane zones at the bottom.
          </p>
        </div>

        {/* Dismiss button */}
        <button
          onClick={onDismiss}
          className="w-full max-w-xs h-12 rounded-full bg-gradient-to-r from-[#4ecdc4] to-[#45b7d1] text-black font-bold text-sm hover:opacity-90 transition-opacity font-[family-name:var(--font-roobert)]"
        >
          Got it!
        </button>

        <p className="text-[10px] text-white/20">
          Press <kbd className="font-mono">Enter</kbd> or <kbd className="font-mono">Space</kbd> to start
        </p>
      </div>
    </div>
  );
}
