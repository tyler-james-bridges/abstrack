"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { getLatestBlockNumber } from "@/lib/chain/blockData";

export function BlockPicker() {
  const router = useRouter();
  const [blockInput, setBlockInput] = useState("");
  const [loading, setLoading] = useState(false);

  const handlePlay = () => {
    const num = parseInt(blockInput, 10);
    if (isNaN(num) || num <= 0) return;
    router.push(`/play/${num}`);
  };

  const handlePlayLatest = async () => {
    setLoading(true);
    try {
      const latest = await getLatestBlockNumber();
      router.push(`/play/${latest}`);
    } catch {
      setLoading(false);
    }
  };

  const handleRandomBlock = async () => {
    setLoading(true);
    try {
      const latest = await getLatestBlockNumber();
      const random = BigInt(Math.floor(Math.random() * Number(latest))) + 1n;
      router.push(`/play/${random}`);
    } catch {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="glass-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4ecdc4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-60">
            <polygon points="5 3 19 12 5 21 5 3" />
          </svg>
          <h2 className="text-xs font-bold font-[family-name:var(--font-avenue-mono)] tracking-[0.2em] uppercase text-[#4ecdc4]/70 retro-header">
            Play a Block
          </h2>
        </div>

        {/* Block number input */}
        <div className="flex gap-2 mb-4">
          <div className="relative flex-1">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 font-[family-name:var(--font-avenue-mono)] text-sm pointer-events-none">
              #
            </span>
            <input
              type="number"
              inputMode="numeric"
              value={blockInput}
              onChange={(e) => setBlockInput(e.target.value)}
              placeholder="Enter block number"
              className="retro-input w-full h-12 pl-8 pr-4 bg-white/5 border border-white/10 rounded-xl text-white text-base placeholder:text-white/20 font-[family-name:var(--font-avenue-mono)] transition-all"
              onKeyDown={(e) => e.key === "Enter" && handlePlay()}
            />
          </div>
          <button
            onClick={handlePlay}
            disabled={!blockInput || loading}
            className="neon-btn h-12 px-6 rounded-xl bg-gradient-to-r from-[#4ecdc4] to-[#45b7d1] text-black font-bold text-sm hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed transition-all font-[family-name:var(--font-roobert)] active:scale-[0.97]"
          >
            Play
          </button>
        </div>

        {/* Quick actions */}
        <div className="flex gap-2">
          <button
            onClick={handlePlayLatest}
            disabled={loading}
            className="neon-btn flex-1 h-11 rounded-xl border border-[#4ecdc4]/20 text-[#4ecdc4]/70 text-sm hover:bg-[#4ecdc4]/5 hover:text-[#4ecdc4] hover:border-[#4ecdc4]/30 active:bg-[#4ecdc4]/10 active:scale-[0.98] transition-all disabled:opacity-50 font-[family-name:var(--font-roobert)] flex items-center justify-center gap-2"
          >
            {loading ? (
              <span className="inline-block w-4 h-4 border-2 border-[#4ecdc4]/20 border-t-[#4ecdc4]/60 rounded-full animate-spin" />
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                Latest
              </>
            )}
          </button>
          <button
            onClick={handleRandomBlock}
            disabled={loading}
            className="neon-btn flex-1 h-11 rounded-xl border border-[#45b7d1]/20 text-[#45b7d1]/70 text-sm hover:bg-[#45b7d1]/5 hover:text-[#45b7d1] hover:border-[#45b7d1]/30 active:bg-[#45b7d1]/10 active:scale-[0.98] transition-all disabled:opacity-50 font-[family-name:var(--font-roobert)] flex items-center justify-center gap-2"
          >
            {loading ? (
              <span className="inline-block w-4 h-4 border-2 border-[#45b7d1]/20 border-t-[#45b7d1]/60 rounded-full animate-spin" />
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <circle cx="15.5" cy="8.5" r="1.5" />
                  <circle cx="15.5" cy="15.5" r="1.5" />
                  <circle cx="8.5" cy="15.5" r="1.5" />
                  <circle cx="12" cy="12" r="1.5" />
                </svg>
                Random
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
