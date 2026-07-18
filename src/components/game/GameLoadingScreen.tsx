"use client";

import React from "react";

interface GameLoadingScreenProps {
  blockNumber: number;
  status: string;
}

export function GameLoadingScreen({ blockNumber, status }: GameLoadingScreenProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-dvh bg-[#020503] text-white px-6 safe-all">
      <div className="absolute inset-0 crt-scanlines z-10" />

      <div className="block-surface flex w-full max-w-sm flex-col gap-6 relative z-20 px-6 py-7">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[9px] uppercase tracking-[0.24em] text-[#A0E7AB]/45 font-[family-name:var(--font-avenue-mono)]">
              Abstract sequencer
            </p>
            <h2 className="mt-2 text-xl sm:text-2xl font-black font-[family-name:var(--font-roobert)]">
              Indexing block{" "}
              <span className="text-[#3EB95F]">#{blockNumber}</span>
            </h2>
          </div>
          <span className="mt-1 flex h-8 w-8 items-center justify-center rounded-[4px] border border-[#3EB95F]/30 bg-[#3EB95F]/8 text-sm font-black text-[#3EB95F] font-[family-name:var(--font-roobert)]">
            A
          </span>
        </div>

        <div className="grid grid-cols-6 gap-1.5 rounded-md border border-white/8 bg-black/35 p-3">
          {Array.from({ length: 24 }, (_, i) => (
            <span
              key={i}
              className="h-3 rounded-[2px] border border-[#3EB95F]/15 bg-[#3EB95F]/5"
              style={{
                animation: `packet-index 1.4s ease-in-out ${
                  (i % 8) * 70
                }ms infinite`,
              }}
            />
          ))}
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between text-[9px] uppercase tracking-[0.15em] font-[family-name:var(--font-avenue-mono)]">
            <span className="text-white/38">{status}</span>
            <span className="text-[#3EB95F]/55">syncing</span>
          </div>
          <div className="h-[3px] overflow-hidden rounded-full bg-white/5">
          <div
              className="h-full rounded-full animate-loading-bar"
            style={{
                background:
                  "linear-gradient(90deg, #2f7f6a, #3EB95F, #A0E7AB)",
                boxShadow: "0 0 8px rgba(62,185,95,0.65)",
            }}
          />
          </div>
        </div>
      </div>
    </div>
  );
}
