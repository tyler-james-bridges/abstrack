"use client";

import React from "react";

interface GameLoadingScreenProps {
  blockNumber: number;
  status: string;
}

export function GameLoadingScreen({ blockNumber, status }: GameLoadingScreenProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-dvh bg-black text-white px-6 safe-all">
      {/* CRT scanline overlay */}
      <div className="absolute inset-0 crt-scanlines z-10" />

      <div className="flex flex-col items-center gap-5 sm:gap-6 relative z-20">
        {/* Animated TEMPO logo with neon glow */}
        <div className="relative">
          {/* Outer pulse ring */}
          <div
            className="absolute inset-[-16px] rounded-full animate-pulse-ring"
            style={{
              border: "1px solid rgba(78,205,196,0.25)",
            }}
          />
          {/* Middle pulse ring — offset timing */}
          <div
            className="absolute inset-[-8px] rounded-full animate-pulse-ring"
            style={{
              border: "1px solid rgba(69,183,209,0.2)",
              animationDelay: "0.8s",
            }}
          />
          <div
            className="relative w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center rounded-full"
            style={{
              background: "radial-gradient(circle, rgba(78,205,196,0.1) 0%, transparent 70%)",
              boxShadow: "0 0 30px rgba(78,205,196,0.15), 0 0 60px rgba(78,205,196,0.05)",
            }}
          >
            <span
              className="text-2xl sm:text-3xl font-black neon-pulse"
              style={{
                color: "#4ecdc4",
                textShadow: "0 0 7px #4ecdc4, 0 0 15px rgba(78,205,196,0.5)",
              }}
            >
              T
            </span>
          </div>
        </div>

        <div className="text-center animate-fade-in-up">
          <h2
            className="text-lg sm:text-xl font-bold font-[family-name:var(--font-roobert)] mb-2"
            style={{
              textShadow: "0 0 10px rgba(78,205,196,0.3)",
            }}
          >
            Block #{blockNumber}
          </h2>
          <p className="text-xs text-white/40 font-[family-name:var(--font-avenue-mono)] tracking-wider uppercase">
            {status}
          </p>
        </div>

        {/* Loading bar with neon glow */}
        <div
          className="w-40 sm:w-48 h-[3px] bg-white/5 rounded-full overflow-hidden"
          style={{
            boxShadow: "0 0 8px rgba(78,205,196,0.1)",
          }}
        >
          <div
            className="h-full rounded-full animate-loading-bar"
            style={{
              background: "linear-gradient(90deg, #4ecdc4, #45b7d1, #4ecdc4)",
              boxShadow: "0 0 12px #4ecdc4, 0 0 4px #4ecdc4",
            }}
          />
        </div>

        {/* Hint text */}
        <p className="text-[10px] text-white/15 font-[family-name:var(--font-avenue-mono)] tracking-wider mt-2 animate-fade-in-up stagger-3">
          Generating rhythm from block data...
        </p>
      </div>
    </div>
  );
}
