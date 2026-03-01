"use client";

import React, { useState, useEffect, useCallback } from "react";
import type { GameState } from "@/lib/game/types";

const VOLUME_STORAGE_KEY = "tempo-volume";

/** Convert a 0-100 slider value to dB (-60 to 0) */
function sliderToDb(value: number): number {
  if (value <= 0) return -Infinity;
  // Logarithmic curve: 0-100 maps to -60..0 dB
  return -60 + (value / 100) * 60;
}

function getStoredVolume(): number {
  if (typeof window === "undefined") return 70;
  const stored = localStorage.getItem(VOLUME_STORAGE_KEY);
  if (stored !== null) {
    const parsed = parseInt(stored, 10);
    if (!isNaN(parsed)) return Math.max(0, Math.min(100, parsed));
  }
  return 70;
}

interface GameHUDProps {
  state: GameState;
  onVolumeChange?: (db: number) => void;
}

export function GameHUD({ state, onVolumeChange }: GameHUDProps) {
  const { score, combo, chart, elapsedTime } = state;
  const progress = chart ? Math.min(elapsedTime / chart.duration, 1) : 0;

  const [volume, setVolume] = useState<number>(70);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);

  // Load stored volume on mount
  useEffect(() => {
    const stored = getStoredVolume();
    setVolume(stored);
    onVolumeChange?.(sliderToDb(stored));
  }, [onVolumeChange]);

  const handleVolumeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = parseInt(e.target.value, 10);
      setVolume(val);
      localStorage.setItem(VOLUME_STORAGE_KEY, String(val));
      onVolumeChange?.(sliderToDb(val));
    },
    [onVolumeChange]
  );

  // Volume icon based on level
  const volumeIcon =
    volume === 0 ? (
      // Muted
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
        <line x1="23" y1="9" x2="17" y2="15" />
        <line x1="17" y1="9" x2="23" y2="15" />
      </svg>
    ) : volume < 50 ? (
      // Low volume
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
        <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
      </svg>
    ) : (
      // High volume
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
        <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
        <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
      </svg>
    );

  return (
    <div className="absolute inset-0 pointer-events-none z-10">
      {/* Progress bar — sits flush at top, accounts for safe area */}
      <div
        className="absolute top-0 left-0 right-0 h-1 bg-white/10"
        style={{ marginTop: "env(safe-area-inset-top, 0px)" }}
      >
        <div
          className="h-full bg-gradient-to-r from-[#4ecdc4] to-[#45b7d1] transition-all duration-100"
          style={{ width: `${progress * 100}%` }}
        />
      </div>

      {/* Score — top right, pushed down by safe area */}
      <div
        className="absolute right-3 sm:right-4 text-right"
        style={{
          top: "calc(env(safe-area-inset-top, 0px) + 12px)",
        }}
      >
        <p className="text-lg sm:text-3xl font-bold text-white font-mono tabular-nums leading-tight">
          {score.toLocaleString()}
        </p>
        {chart && (
          <p className="text-[10px] sm:text-xs text-white/50 mt-0.5">
            {chart.bpm} BPM | Block #{chart.blockNumber}
          </p>
        )}
      </div>

      {/* Combo — positioned above hit zone for visibility */}
      {combo > 1 && (
        <div className="absolute top-[30%] sm:top-1/3 left-1/2 -translate-x-1/2 text-center">
          <p
            className="text-2xl sm:text-5xl font-black text-white/90 tabular-nums leading-none"
            style={{
              textShadow:
                combo >= 50
                  ? "0 0 30px #ffd700, 0 0 60px #ffd700"
                  : combo >= 25
                    ? "0 0 20px #4ecdc4"
                    : "0 0 10px rgba(255,255,255,0.3)",
            }}
          >
            {combo}
          </p>
          <p className="text-[9px] sm:text-sm font-bold text-white/60 tracking-widest uppercase">
            combo
          </p>
        </div>
      )}

      {/* Volume control — top left, pushed down by safe area, 44px tap target */}
      <div
        className="absolute left-2 sm:left-4 pointer-events-auto"
        style={{
          top: "calc(env(safe-area-inset-top, 0px) + 8px)",
          touchAction: "auto",
        }}
      >
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowVolumeSlider((v) => !v)}
            className="flex items-center justify-center w-11 h-11 text-white/40 hover:text-white/70 active:text-white/90 transition-colors rounded-lg"
            aria-label="Toggle volume"
          >
            {volumeIcon}
          </button>
          {showVolumeSlider && (
            <div className="flex items-center gap-2 bg-black/70 backdrop-blur-sm rounded-full px-3 py-2 border border-white/10">
              <input
                type="range"
                min="0"
                max="100"
                value={volume}
                onChange={handleVolumeChange}
                className="w-20 sm:w-24 h-2 accent-[#4ecdc4] cursor-pointer"
                aria-label="Volume"
              />
              <span className="text-[10px] text-white/40 font-mono w-6 text-right tabular-nums">
                {volume}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
