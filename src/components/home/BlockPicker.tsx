"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { getLatestBlockNumber } from "@/lib/chain/blockData";

function randomBigIntBetween(min: bigint, max: bigint): bigint {
  const range = max - min + 1n;
  if (range <= 0n) return min;

  const bits = range.toString(2).length;
  const bytes = Math.ceil(bits / 8);
  const randomBytes = new Uint8Array(bytes);

  while (true) {
    crypto.getRandomValues(randomBytes);
    let value = 0n;
    for (const byte of randomBytes) {
      value = (value << 8n) + BigInt(byte);
    }

    if (value < range) {
      return min + value;
    }
  }
}

export function BlockPicker() {
  const router = useRouter();
  const [blockInput, setBlockInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePlay = () => {
    setError(null);
    const num = parseInt(blockInput, 10);
    if (isNaN(num) || num <= 0) {
      setError("Enter a valid block number > 0");
      return;
    }
    router.push(`/play/${num}`);
  };

  const handlePlayLatest = async () => {
    setError(null);
    setLoading(true);
    try {
      const latest = await getLatestBlockNumber();
      router.push(`/play/${latest}`);
    } catch {
      setLoading(false);
      setError("Couldn’t fetch latest block. Try again.");
    }
  };

  const handleRandomBlock = async () => {
    setError(null);
    setLoading(true);
    try {
      const latest = await getLatestBlockNumber();
      const random = randomBigIntBetween(1n, latest);
      router.push(`/play/${random}`);
    } catch {
      setLoading(false);
      setError("Couldn’t fetch random block. Try again.");
    }
  };

  const handleAgentMode = async () => {
    setError(null);
    setLoading(true);
    try {
      const latest = await getLatestBlockNumber();
      router.push(`/play/${latest}?bot=1&profile=great`);
    } catch {
      setLoading(false);
      setError("Couldn’t launch agent mode. Try again.");
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="retro-card p-6">
        <h2 className="text-xs font-bold mb-4 font-[family-name:var(--font-avenue-mono)] tracking-[0.2em] uppercase text-[#3EB95F]/70 retro-header">
          Play a Block
        </h2>

        {/* Block number input */}
        <div className="flex gap-2 mb-2">
          <input
            type="number"
            inputMode="numeric"
            min={1}
            value={blockInput}
            onChange={(e) => setBlockInput(e.target.value)}
            placeholder="Block #..."
            className="retro-input flex-1 h-12 px-4 bg-white/5 border border-white/10 rounded-lg text-white text-base placeholder:text-white/20 font-[family-name:var(--font-avenue-mono)] transition-all"
            onKeyDown={(e) => e.key === "Enter" && handlePlay()}
          />
          <button
            onClick={handlePlay}
            disabled={!blockInput || loading}
            className="neon-btn h-12 px-6 rounded-lg bg-gradient-to-r from-[#3EB95F] to-[#73C98C] text-black font-bold text-sm hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed transition-all font-[family-name:var(--font-roobert)]"
          >
            Play
          </button>
        </div>

        {error && (
          <p className="mb-4 text-xs text-red-300/90 font-[family-name:var(--font-avenue-mono)]">
            {error}
          </p>
        )}

        {/* Quick actions */}
        <div className="flex gap-2">
          <button
            onClick={handlePlayLatest}
            disabled={loading}
            className="neon-btn flex-1 h-12 rounded-lg border border-[#3EB95F]/20 text-[#3EB95F]/70 text-sm hover:bg-[#3EB95F]/5 hover:text-[#3EB95F] hover:border-[#3EB95F]/30 active:bg-[#3EB95F]/10 transition-all disabled:opacity-50 font-[family-name:var(--font-roobert)]"
          >
            {loading ? "Loading..." : "Latest Block"}
          </button>
          <button
            onClick={handleRandomBlock}
            disabled={loading}
            className="neon-btn flex-1 h-12 rounded-lg border border-[#73C98C]/20 text-[#73C98C]/70 text-sm hover:bg-[#73C98C]/5 hover:text-[#73C98C] hover:border-[#73C98C]/30 active:bg-[#73C98C]/10 transition-all disabled:opacity-50 font-[family-name:var(--font-roobert)]"
          >
            {loading ? "Loading..." : "Random Block"}
          </button>
        </div>

        <button
          onClick={handleAgentMode}
          disabled={loading}
          className="mt-2 neon-btn w-full h-11 rounded-lg border border-[#3EB95F]/30 text-[#3EB95F]/80 text-xs hover:bg-[#3EB95F]/5 hover:text-[#3EB95F] hover:border-[#3EB95F]/40 active:bg-[#3EB95F]/10 transition-all disabled:opacity-50 font-[family-name:var(--font-avenue-mono)] tracking-wider uppercase"
        >
          {loading ? "Loading..." : "Agent Autoplay"}
        </button>
      </div>
    </div>
  );
}
