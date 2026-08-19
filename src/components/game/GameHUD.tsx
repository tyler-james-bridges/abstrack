"use client";

import React, { useState, useEffect, useCallback } from "react";
import type { GameState } from "@/lib/game/types";
import { COMBO_MULTIPLIER_TIERS, LANE_COLORS } from "@/lib/game/constants";

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
  const { score, combo, chart, elapsedTime, gradeCounts } = state;
  const progress = chart
    ? Math.max(0, Math.min(elapsedTime / chart.duration, 1))
    : 0;
  const processed =
    gradeCounts.perfect + gradeCounts.great + gradeCounts.good;
  const inclusion = chart && chart.notes.length > 0
    ? Math.max(0, Math.min(processed / chart.notes.length, 1))
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
      {/* Block-time rail */}
      <div
        className="absolute top-0 left-0 right-0 h-[3px] bg-white/[0.04]"
        style={{ marginTop: "env(safe-area-inset-top, 0px)" }}
      >
        <div
          className="h-full transition-all duration-100"
          style={{
            width: `${progress * 100}%`,
            background: `linear-gradient(90deg, ${LANE_COLORS[0]}, ${LANE_COLORS[1]} 58%, ${LANE_COLORS[2]})`,
          }}
        />
      </div>

      {/* Network identity */}
      {chart && (
        <div
          className="absolute left-16 hidden sm:block border-l border-[var(--abstrack-rule)] pl-3 font-[family-name:var(--font-avenue-mono)]"
          style={{
            top: "calc(env(safe-area-inset-top, 0px) + 14px)",
          }}
        >
          <p className="text-[9px] uppercase tracking-[0.22em] text-[var(--abstrack-dim)]">
            Abstract mainnet · processing
          </p>
          <p className="mt-1 text-xs font-bold text-[var(--foreground)]">
            BLOCK #{chart.blockNumber}
          </p>
          <p className="mt-0.5 text-[9px] text-[var(--abstrack-faint)]">
            {(chart.gasUsed / 1e6).toFixed(2)}M GAS · {chart.bpm} BPM
          </p>
        </div>
      )}

      {/* Score / throughput cluster */}
      <div
        className="absolute right-3 sm:right-4 min-w-[124px] text-right rounded-md border border-[var(--abstrack-line)] bg-[var(--abstrack-panel)]/90 px-3 py-2 backdrop-blur-md"
        style={{
          top: "calc(env(safe-area-inset-top, 0px) + 10px)",
        }}
      >
        <p className="text-[8px] uppercase tracking-[0.18em] text-[var(--abstrack-faint)] font-[family-name:var(--font-avenue-mono)]">
          Sequencer score
        </p>
        <p className="mt-0.5 text-lg sm:text-2xl font-bold text-[var(--foreground)] font-[family-name:var(--font-avenue-mono)] tabular-nums leading-tight">
          {score.toLocaleString()}
        </p>
        {combo > 0 && (
          <div className="mt-1.5 flex items-center justify-end gap-1.5 border-t border-[var(--abstrack-line)] pt-1.5 font-[family-name:var(--font-avenue-mono)]">
            <span className="text-[9px] uppercase tracking-wider text-[var(--abstrack-dim)]">
              {combo} throughput
            </span>
            <span
              className="rounded-sm px-1.5 py-0.5 text-[9px] font-bold"
              style={{
                color: multiplier > 1 ? LANE_COLORS[1] : LANE_COLORS[2],
                background: "rgba(237,235,228,0.06)",
              }}
            >
              ×{multiplier}
            </span>
            {nextTier && (
              <span className="hidden md:inline text-[8px] text-[var(--abstrack-faint)]">
                ×{nextTier.multiplier} in {nextTier.threshold - combo}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Live block assembly status */}
      {chart && (
        <div
          className="absolute left-3 right-3 sm:left-1/2 sm:right-auto sm:w-[360px] sm:-translate-x-1/2"
          style={{
            top: "calc(env(safe-area-inset-top, 0px) + 66px)",
          }}
        >
          <div className="flex items-center justify-between text-[8px] uppercase tracking-[0.16em] font-[family-name:var(--font-avenue-mono)]">
            <span className="text-[var(--abstrack-dim)]">
              Block assembly
            </span>
            <span className="text-[var(--abstrack-faint)] tabular-nums">
              {processed}/{chart.notes.length} packets
            </span>
          </div>
          <div className="relative mt-1 h-[5px] overflow-hidden rounded-[2px] border border-[var(--abstrack-line)] bg-black/55">
            <div
              className="absolute inset-y-0 left-0 transition-all duration-100"
              style={{
                width: `${progress * 100}%`,
                background: "rgba(237,235,228,0.06)",
              }}
            />
            <div
              className="absolute inset-y-0 left-0 transition-all duration-150"
              style={{
                width: `${inclusion * 100}%`,
                background: `linear-gradient(90deg, ${LANE_COLORS[0]}, ${LANE_COLORS[1]}, ${LANE_COLORS[2]})`,
              }}
            />
            <div
              className="absolute inset-y-0 w-px opacity-80"
              style={{ left: `${progress * 100}%`, background: LANE_COLORS[2] }}
            />
          </div>
        </div>
      )}

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
            className="flex items-center justify-center w-11 h-11 text-white/35 hover:text-[var(--foreground)] active:text-[var(--foreground)] transition-colors rounded-md"
            aria-label="Toggle volume"
          >
            {volumeIcon}
          </button>
          {showVolumeSlider && (
            <div
              className="flex items-center gap-2 rounded-md px-3 py-2"
              style={{
                background: "rgba(3,8,5,0.92)",
                border: "1px solid rgba(62,185,95,0.18)",
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
