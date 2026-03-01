"use client";

import React from "react";

interface GameLoadingScreenProps {
  blockNumber: number;
  status: string;
}

export function GameLoadingScreen({ blockNumber, status }: GameLoadingScreenProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-dvh bg-black text-white px-6 safe-all">
      <div className="flex flex-col items-center gap-5 sm:gap-6">
        {/* Animated logo */}
        <div className="relative w-16 h-16 sm:w-20 sm:h-20">
          <div className="absolute inset-0 rounded-full border-2 border-[#4ecdc4]/30 animate-ping" />
          <div className="absolute inset-2 rounded-full border-2 border-[#45b7d1]/50 animate-pulse" />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-2xl sm:text-3xl font-black text-white">T</span>
          </div>
        </div>

        <div className="text-center">
          <h2 className="text-lg sm:text-xl font-bold font-[family-name:var(--font-roobert)] mb-2">
            Loading Block #{blockNumber}
          </h2>
          <p className="text-sm text-white/50">{status}</p>
        </div>

        {/* Loading bar */}
        <div className="w-40 sm:w-48 h-1 bg-white/10 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-[#4ecdc4] to-[#45b7d1] rounded-full animate-loading-bar" />
        </div>
      </div>
    </div>
  );
}
