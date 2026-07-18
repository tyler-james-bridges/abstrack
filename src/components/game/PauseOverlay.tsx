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
        background: "rgba(1,5,3,0.9)",
        backdropFilter: "blur(8px)",
      }}
    >
      {/* CRT scanlines */}
      <div className="absolute inset-0 crt-scanlines" />

      <div className="block-surface flex flex-col items-center gap-6 px-6 py-7 w-full max-w-xs relative z-10">
        <div className="flex items-center gap-3">
          <div
            className="w-2.5 h-10 rounded-[2px]"
            style={{
              background: "#3EB95F",
              boxShadow: "0 0 10px rgba(62,185,95,0.45)",
            }}
          />
          <div
            className="w-2.5 h-10 rounded-[2px]"
            style={{
              background: "#3EB95F",
              boxShadow: "0 0 10px rgba(62,185,95,0.45)",
            }}
          />
        </div>

        <div className="text-center">
          <p className="text-[9px] uppercase tracking-[0.22em] text-[#A0E7AB]/45 font-[family-name:var(--font-avenue-mono)]">
            Transaction flow halted
          </p>
          <h2 className="mt-1 text-2xl sm:text-3xl font-bold text-white font-[family-name:var(--font-roobert)]">
            Sequencer paused
          </h2>
        </div>

        <div className="flex flex-col gap-3 w-full">
          <button
            onClick={onResume}
            className="processing-btn w-full h-12 rounded-md bg-[#A0E7AB] text-[#031006] font-bold text-sm hover:bg-[#b9f2c2] active:scale-[0.99] transition-all font-[family-name:var(--font-roobert)]"
          >
            Resume processing
          </button>
          <button
            onClick={onQuit}
            className="w-full h-12 rounded-md border border-white/12 text-white/55 font-bold text-sm hover:bg-white/5 hover:text-white/75 active:scale-[0.99] transition-all font-[family-name:var(--font-roobert)]"
          >
            Abandon block
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
