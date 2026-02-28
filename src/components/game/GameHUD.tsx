"use client";

import React from "react";
import type { GameState } from "@/lib/game/types";

interface GameHUDProps {
  state: GameState;
}

export function GameHUD({ state }: GameHUDProps) {
  const { score, combo, chart, elapsedTime } = state;
  const progress = chart ? Math.min(elapsedTime / chart.duration, 1) : 0;

  return (
    <div className="absolute inset-0 pointer-events-none z-10">
      {/* Progress bar */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-white/10">
        <div
          className="h-full bg-gradient-to-r from-[#4ecdc4] to-[#45b7d1] transition-all duration-100"
          style={{ width: `${progress * 100}%` }}
        />
      </div>

      {/* Score */}
      <div className="absolute top-4 right-4 text-right">
        <p className="text-3xl font-bold text-white font-mono tabular-nums">
          {score.toLocaleString()}
        </p>
        {chart && (
          <p className="text-xs text-white/50 mt-1">
            {chart.bpm} BPM | Block #{chart.blockNumber}
          </p>
        )}
      </div>

      {/* Combo */}
      {combo > 1 && (
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 text-center">
          <p
            className="text-5xl font-black text-white/90 tabular-nums"
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
          <p className="text-sm font-bold text-white/60 tracking-widest uppercase">
            combo
          </p>
        </div>
      )}

      {/* BPM indicator */}
      <div className="absolute top-4 left-4">
        <p className="text-sm text-white/30 font-mono">
          {chart?.bpm ?? "--"} BPM
        </p>
      </div>
    </div>
  );
}
