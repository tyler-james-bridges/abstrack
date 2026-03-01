"use client";

import React, { useEffect, useCallback } from "react";

interface PauseOverlayProps {
  onResume: () => void;
  onQuit: () => void;
}

export function PauseOverlay({ onResume, onQuit }: PauseOverlayProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Enter") {
        e.preventDefault();
        onResume();
      }
      if (e.key === "q" || e.key === "Q") {
        e.preventDefault();
        onQuit();
      }
    },
    [onResume, onQuit]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center safe-all"
      data-game-ui
      style={{
        touchAction: "auto",
        background: "rgba(0,0,0,0.85)",
        backdropFilter: "blur(4px)",
      }}
    >
      {/* CRT scanlines */}
      <div className="absolute inset-0 crt-scanlines" />

      <div className="flex flex-col items-center gap-6 sm:gap-8 px-6 w-full max-w-xs relative z-10">
        {/* Pause icon with neon glow */}
        <div className="flex items-center gap-3">
          <div
            className="w-3.5 sm:w-4 h-12 sm:h-14 rounded-sm"
            style={{
              background: "#4ecdc4",
              boxShadow: "0 0 10px rgba(78,205,196,0.5), 0 0 20px rgba(78,205,196,0.2)",
            }}
          />
          <div
            className="w-3.5 sm:w-4 h-12 sm:h-14 rounded-sm"
            style={{
              background: "#4ecdc4",
              boxShadow: "0 0 10px rgba(78,205,196,0.5), 0 0 20px rgba(78,205,196,0.2)",
            }}
          />
        </div>

        <h2
          className="text-2xl sm:text-3xl font-bold text-white font-[family-name:var(--font-roobert)]"
          style={{
            textShadow: "0 0 15px rgba(78,205,196,0.4)",
          }}
        >
          Paused
        </h2>

        <div className="flex flex-col gap-3 w-full">
          <button
            onClick={onResume}
            className="neon-btn w-full h-12 sm:h-14 rounded-full bg-gradient-to-r from-[#4ecdc4] to-[#45b7d1] text-black font-bold text-sm hover:opacity-90 active:scale-[0.98] transition-all font-[family-name:var(--font-roobert)]"
            style={{
              boxShadow: "0 0 20px rgba(78,205,196,0.2)",
            }}
          >
            Resume
          </button>
          <button
            onClick={onQuit}
            className="neon-btn w-full h-12 sm:h-14 rounded-full border border-white/15 text-white/70 font-bold text-sm hover:bg-white/5 hover:border-white/25 active:scale-[0.98] transition-all font-[family-name:var(--font-roobert)]"
          >
            Quit
          </button>
        </div>

        {/* Keyboard hints */}
        <div className="hidden sm:flex flex-col items-center gap-1 text-xs text-white/25 font-[family-name:var(--font-avenue-mono)]">
          <p>
            <kbd className="px-1.5 py-0.5 rounded bg-white/5 text-white/40 border border-white/10">Esc</kbd>
            {" "}or{" "}
            <kbd className="px-1.5 py-0.5 rounded bg-white/5 text-white/40 border border-white/10">Enter</kbd>
            {" "}to resume
          </p>
          <p>
            <kbd className="px-1.5 py-0.5 rounded bg-white/5 text-white/40 border border-white/10">Q</kbd>
            {" "}to quit
          </p>
        </div>
      </div>
    </div>
  );
}
