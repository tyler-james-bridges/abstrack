"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getBlockForGame,
  getLatestBlockNumber,
  type BlockData,
} from "@/lib/chain/blockData";
import { estimateDifficulty } from "@/lib/format";
import { BlockMosaic } from "@/components/ui/BlockMosaic";

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
  const [latestBlock, setLatestBlock] = useState<BlockData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const loadLatestCandidate = async () => {
      try {
        const latest = await getLatestBlockNumber();
        const block = await getBlockForGame(latest);
        if (active) setLatestBlock(block);
      } catch {
        // The primary controls still work and surface their own errors.
      }
    };

    loadLatestCandidate();
    return () => {
      active = false;
    };
  }, []);

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
      const latest = latestBlock?.number ?? (await getLatestBlockNumber());
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
    <div className="block-surface w-full overflow-hidden">
      <div className="grid lg:grid-cols-[1.05fr_0.95fr]">
        <div className="p-5 sm:p-7 lg:p-8">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#3EB95F] opacity-30" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[#3EB95F]" />
            </span>
            <p className="text-[9px] uppercase tracking-[0.25em] text-[#A0E7AB]/55 font-[family-name:var(--font-avenue-mono)]">
              Live blockspace
            </p>
          </div>

          <h2 className="mt-4 max-w-lg text-3xl sm:text-4xl font-black leading-[0.96] text-white font-[family-name:var(--font-roobert)]">
            Turn transaction flow into{" "}
            <span className="text-[#3EB95F]">a playable block.</span>
          </h2>
          <p className="mt-4 max-w-md text-xs sm:text-sm leading-relaxed text-white/42 font-[family-name:var(--font-avenue-mono)]">
            Every Abstract block becomes a deterministic sequencer run. Route
            its packets, hold throughput, and seal your score onchain.
          </p>

          <button
            onClick={handlePlayLatest}
            disabled={loading}
            className="processing-btn mt-6 h-12 w-full sm:w-auto sm:min-w-[250px] rounded-md bg-[#A0E7AB] px-6 text-sm font-bold text-[#031006] transition-all hover:bg-[#b9f2c2] active:scale-[0.99] disabled:opacity-45 font-[family-name:var(--font-roobert)]"
          >
            {loading ? "Opening pipeline..." : "Process latest block"}
          </button>

          <p className="mt-3 text-[9px] uppercase tracking-[0.16em] text-white/22 font-[family-name:var(--font-avenue-mono)]">
            Guest play enabled · wallet optional
          </p>
        </div>

        <div className="border-t border-white/8 bg-[#030805]/72 p-5 sm:p-7 lg:border-l lg:border-t-0 lg:p-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[8px] uppercase tracking-[0.22em] text-white/28 font-[family-name:var(--font-avenue-mono)]">
                Latest confirmed block
              </p>
              <p className="mt-1 text-2xl font-bold text-white/82 font-[family-name:var(--font-avenue-mono)]">
                {latestBlock ? `#${latestBlock.number}` : "Syncing…"}
              </p>
            </div>
            {latestBlock && (() => {
              const difficulty = estimateDifficulty(
                latestBlock.gasUsed,
                latestBlock.transactions.length
              );
              return (
                <span className={`rounded-[3px] border border-white/8 bg-white/4 px-2 py-1 text-[8px] uppercase tracking-wider ${difficulty.color}`}>
                  {difficulty.label} flow
                </span>
              );
            })()}
          </div>

          <BlockMosaic
            seed={latestBlock?.number ?? 0}
            fill={latestBlock ? 1 : 0.2}
            className="mt-4 min-h-[92px]"
          />

          <div className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-md border border-white/8 bg-white/8">
            <div className="bg-[#050b08] px-3 py-2.5">
              <p className="text-[8px] uppercase tracking-wider text-white/24 font-[family-name:var(--font-avenue-mono)]">
                Transactions
              </p>
              <p className="mt-1 text-sm font-bold text-white/66 font-[family-name:var(--font-avenue-mono)]">
                {latestBlock
                  ? latestBlock.transactions.length.toLocaleString()
                  : "—"}
              </p>
            </div>
            <div className="bg-[#050b08] px-3 py-2.5">
              <p className="text-[8px] uppercase tracking-wider text-white/24 font-[family-name:var(--font-avenue-mono)]">
                Gas used
              </p>
              <p className="mt-1 text-sm font-bold text-white/66 font-[family-name:var(--font-avenue-mono)]">
                {latestBlock
                  ? `${(Number(latestBlock.gasUsed) / 1e6).toFixed(2)}M`
                  : "—"}
              </p>
            </div>
          </div>

          <div className="mt-5 border-t border-white/8 pt-4">
            <label
              htmlFor="block-number"
              className="text-[8px] uppercase tracking-[0.2em] text-white/28 font-[family-name:var(--font-avenue-mono)]"
            >
              Process a specific block
            </label>
            <div className="mt-2 flex gap-2">
              <input
                id="block-number"
                type="number"
                inputMode="numeric"
                min={1}
                value={blockInput}
                onChange={(e) => setBlockInput(e.target.value)}
                placeholder="Block number"
                className="retro-input h-11 min-w-0 flex-1 rounded-md border border-white/10 bg-black/35 px-3 text-sm text-white placeholder:text-white/20 font-[family-name:var(--font-avenue-mono)] transition-all"
                onKeyDown={(e) => e.key === "Enter" && handlePlay()}
              />
              <button
                onClick={handlePlay}
                disabled={!blockInput || loading}
                className="h-11 rounded-md border border-[#3EB95F]/28 px-4 text-xs font-bold text-[#A0E7AB]/75 transition-all hover:bg-[#3EB95F]/8 disabled:cursor-not-allowed disabled:opacity-30 font-[family-name:var(--font-roobert)]"
              >
                Load
              </button>
            </div>
            {error && (
              <p className="mt-2 text-[10px] text-red-300/90 font-[family-name:var(--font-avenue-mono)]">
                {error}
              </p>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                onClick={handleRandomBlock}
                disabled={loading}
                className="h-9 rounded-md border border-white/9 px-3 text-[9px] uppercase tracking-wider text-white/38 transition-colors hover:border-white/16 hover:text-white/65 disabled:opacity-40 font-[family-name:var(--font-avenue-mono)]"
              >
                Random block
              </button>
              <button
                onClick={handleAgentMode}
                disabled={loading}
                className="h-9 rounded-md border border-[#3EB95F]/16 px-3 text-[9px] uppercase tracking-wider text-[#A0E7AB]/45 transition-colors hover:border-[#3EB95F]/28 hover:text-[#A0E7AB]/75 disabled:opacity-40 font-[family-name:var(--font-avenue-mono)]"
              >
                Watch autonomous run
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
