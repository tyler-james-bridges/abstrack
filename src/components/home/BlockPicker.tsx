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
      <div className="bg-white/5 border border-white/10 rounded-xl p-6 backdrop-blur-sm">
        <h2 className="text-lg font-bold mb-4 font-[family-name:var(--font-roobert)]">
          Play a Block
        </h2>

        {/* Block number input */}
        <div className="flex gap-2 mb-4">
          <input
            type="number"
            value={blockInput}
            onChange={(e) => setBlockInput(e.target.value)}
            placeholder="Enter block number..."
            className="flex-1 h-10 px-3 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-[#4ecdc4]/50 font-mono"
            onKeyDown={(e) => e.key === "Enter" && handlePlay()}
          />
          <button
            onClick={handlePlay}
            disabled={!blockInput || loading}
            className="h-10 px-4 rounded-lg bg-gradient-to-r from-[#4ecdc4] to-[#45b7d1] text-black font-bold text-sm hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed transition-opacity font-[family-name:var(--font-roobert)]"
          >
            Play
          </button>
        </div>

        {/* Quick actions */}
        <div className="flex gap-2">
          <button
            onClick={handlePlayLatest}
            disabled={loading}
            className="flex-1 h-10 rounded-lg border border-white/10 text-white/80 text-sm hover:bg-white/5 transition-colors disabled:opacity-50 font-[family-name:var(--font-roobert)]"
          >
            {loading ? "Loading..." : "Play Latest"}
          </button>
          <button
            onClick={handleRandomBlock}
            disabled={loading}
            className="flex-1 h-10 rounded-lg border border-white/10 text-white/80 text-sm hover:bg-white/5 transition-colors disabled:opacity-50 font-[family-name:var(--font-roobert)]"
          >
            {loading ? "Loading..." : "Random Block"}
          </button>
        </div>
      </div>
    </div>
  );
}
