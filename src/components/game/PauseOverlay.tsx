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
      className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm safe-all"
      data-game-ui
      style={{ touchAction: "auto" }}
    >
      <div className="flex flex-col items-center gap-6 sm:gap-8 px-6 w-full max-w-xs">
        {/* Pause icon */}
        <div className="flex items-center gap-3">
          <div className="w-3.5 sm:w-4 h-12 sm:h-14 bg-white/90 rounded-sm" />
          <div className="w-3.5 sm:w-4 h-12 sm:h-14 bg-white/90 rounded-sm" />
        </div>

        <h2 className="text-2xl sm:text-3xl font-bold text-white font-[family-name:var(--font-roobert)]">
          Paused
        </h2>

        <div className="flex flex-col gap-3 w-full">
          <button
            onClick={onResume}
            className="w-full h-12 sm:h-12 rounded-full bg-gradient-to-r from-[#4ecdc4] to-[#45b7d1] text-black font-bold text-sm hover:opacity-90 active:scale-[0.98] transition-all font-[family-name:var(--font-roobert)]"
          >
            Resume
          </button>
          <button
            onClick={onQuit}
            className="w-full h-12 sm:h-12 rounded-full border border-white/20 text-white font-bold text-sm hover:bg-white/10 active:bg-white/15 active:scale-[0.98] transition-all font-[family-name:var(--font-roobert)]"
          >
            Quit
          </button>
        </div>

        {/* Keyboard hints — hidden on mobile */}
        <div className="hidden sm:flex flex-col items-center gap-1 text-xs text-white/30">
          <p>
            <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white/50 font-mono">Esc</kbd>
            {" "}or{" "}
            <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white/50 font-mono">Enter</kbd>
            {" "}to resume
          </p>
          <p>
            <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white/50 font-mono">Q</kbd>
            {" "}to quit
          </p>
        </div>
      </div>
    </div>
  );
}
