"use client";

import React, { useState, useEffect, useCallback } from "react";
import type { GameState } from "@/lib/game/types";
import { COMBO_MULTIPLIER_TIERS } from "@/lib/game/constants";

const VOLUME_STORAGE_KEY = "abstrack-volume";

/** Convert a 0-100 slider value to dB (-60 to 0) */
function sliderToDb(value: number): number {
  if (value <= 0) return -Infinity;
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

function getComboMultiplier(combo: number): number {
  return (
    COMBO_MULTIPLIER_TIERS.find((tier) => combo >= tier.threshold)
      ?.multiplier ?? 1
  );
}

export function GameHUD({ state, onVolumeChange }: GameHUDProps) {
  const { score, combo, chart, elapsedTime } = state;
  const progress = chart
    ? Math.max(0, Math.min(elapsedTime / chart.duration, 1))
    : 0;
  const multiplier = getComboMultiplier(combo);
  const nextTier = [...COMBO_MULTIPLIER_TIERS]
    .reverse()
    .find((tier) => tier.threshold > combo);

  const [volume, setVolume] = useState<number>(70);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);

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

  const volumeIcon =
    volume === 0 ? (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
        <line x1="23" y1="9" x2="17" y2="15" />
        <line x1="17" y1="9" x2="23" y2="15" />
      </svg>
    ) : volume < 50 ? (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
        <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
      </svg>
    ) : (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
        <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
        <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
      </svg>
    );

  return (
    <div className="absolute inset-0 pointer-events-none z-10">
      {/* Progress bar — neon glow */}
      <div
        className="absolute top-0 left-0 right-0 h-[2px] bg-white/5"
        style={{ marginTop: "env(safe-area-inset-top, 0px)" }}
      >
        <div
          className="h-full transition-all duration-100"
          style={{
            width: `${progress * 100}%`,
            background: "linear-gradient(90deg, #3EB95F, #73C98C)",
            boxShadow: "0 0 8px rgba(182,255,0,0.4), 0 1px 4px rgba(182,255,0,0.2)",
          }}
        />
      </div>

      {/* Score card */}
      <div
        className="absolute right-3 sm:right-4 text-right rounded-xl border border-[#73C98C]/20 bg-black/55 px-3 py-2 backdrop-blur-sm"
        style={{
          top: "calc(env(safe-area-inset-top, 0px) + 10px)",
          boxShadow: "0 0 16px rgba(62,185,95,0.10)",
        }}
      >
        <p
          className="text-lg sm:text-3xl font-bold text-white font-[family-name:var(--font-avenue-mono)] tabular-nums leading-tight"
          style={{
            textShadow: "0 0 8px rgba(62,185,95,0.22)",
          }}
        >
          {score.toLocaleString()}
        </p>
        {chart && (
          <p className="text-[10px] sm:text-xs text-white/45 mt-0.5 font-[family-name:var(--font-avenue-mono)] tracking-wider">
            {chart.bpm} BPM · #{chart.blockNumber}
          </p>
        )}
        {combo > 0 && (
          <div className="mt-2 flex items-center justify-end gap-2 border-t border-white/10 pt-1.5 font-[family-name:var(--font-avenue-mono)]">
            <span className="text-[10px] uppercase tracking-wider text-white/50">
              {combo} combo
            </span>
            <span
              className="rounded px-1.5 py-0.5 text-[10px] font-bold"
              style={{
                color: multiplier > 1 ? "#ffd700" : "#A0E7AB",
                background:
                  multiplier > 1
                    ? "rgba(255,215,0,0.10)"
                    : "rgba(160,231,171,0.08)",
              }}
            >
              ×{multiplier}
            </span>
            {nextTier && (
              <span className="hidden sm:inline text-[9px] text-white/25">
                ×{nextTier.multiplier} in {nextTier.threshold - combo}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Volume control */}
      <div
        className="absolute left-2 sm:left-4 pointer-events-auto"
        style={{
          top: "calc(env(safe-area-inset-top, 0px) + 8px)",
          touchAction: "auto",
        }}
      >
        <div className="flex items-center">
          <button
            onClick={() => setShowVolumeSlider((v) => !v)}
            className="flex items-center justify-center w-11 h-11 text-white/40 hover:text-[#3EB95F] active:text-[#3EB95F] transition-colors rounded-lg"
            aria-label="Toggle volume"
          >
            {volumeIcon}
          </button>
          {showVolumeSlider && (
            <div
              className="flex items-center gap-2 rounded-full px-3 py-2"
              style={{
                background: "rgba(0,0,0,0.8)",
                border: "1px solid rgba(182,255,0,0.15)",
                backdropFilter: "blur(8px)",
              }}
            >
              <input
                type="range"
                min="0"
                max="100"
                value={volume}
                onChange={handleVolumeChange}
                className="w-20 sm:w-24 h-2 accent-[#3EB95F] cursor-pointer"
                aria-label="Volume"
              />
              <span className="text-[10px] text-white/40 font-[family-name:var(--font-avenue-mono)] w-6 text-right tabular-nums">
                {volume}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
