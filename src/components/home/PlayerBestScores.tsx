"use client";

import React, { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { publicClient } from "@/lib/chain/blockData";
import {
  TEMPO_SCORE_REGISTRY_ABI,
  TEMPO_SCORE_REGISTRY_ADDRESS,
} from "@/lib/chain/scoreContract";
import { timeAgo, abscanBlockUrl } from "@/lib/format";
import type { Address } from "viem";

interface ScoreEntry {
  player: string;
  blockNumber: bigint;
  score: bigint;
  timestamp: bigint;
}

export function PlayerBestScores() {
  const { address } = useAccount();
  const [scores, setScores] = useState<ScoreEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchScores = (playerAddress: Address) => {
    setLoading(true);
    setError(false);
    publicClient
      .readContract({
        address: TEMPO_SCORE_REGISTRY_ADDRESS,
        abi: TEMPO_SCORE_REGISTRY_ABI,
        functionName: "getPlayerScores",
        args: [playerAddress],
      })
      .then((result) => {
        const entries = result as unknown as ScoreEntry[];
        const sorted = [...entries].sort(
          (a, b) => Number(b.score) - Number(a.score)
        );
        setScores(sorted);
      })
      .catch(() => {
        setScores([]);
        setError(true);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!address) {
      setScores([]);
      setLoading(false);
      return;
    }

    fetchScores(address as Address);
  }, [address]);

  if (!address) return null;

  if (loading) {
    return (
      <div className="w-full max-w-md mx-auto mt-6">
        <div className="retro-card p-6">
          <h2 className="text-xs font-bold mb-4 font-[family-name:var(--font-avenue-mono)] tracking-[0.2em] uppercase text-[#4ecdc4]/70 retro-header">
            Your Scores
          </h2>
          <div className="flex items-center justify-center py-6">
            <div className="w-5 h-5 border-2 border-[#45b7d1]/20 border-t-[#45b7d1]/60 rounded-full animate-spin" />
          </div>
        </div>
      </div>
    );
  }

  if (error && address) {
    return (
      <div className="w-full max-w-md mx-auto mt-6">
        <div className="retro-card p-6">
          <h2 className="text-xs font-bold mb-4 font-[family-name:var(--font-avenue-mono)] tracking-[0.2em] uppercase text-[#4ecdc4]/70 retro-header">
            Your Scores
          </h2>
          <div className="text-center py-4">
            <p className="text-sm text-white/30 font-[family-name:var(--font-avenue-mono)] mb-3">
              Failed to load your scores
            </p>
            <button
              onClick={() => fetchScores(address as Address)}
              className="text-xs text-[#4ecdc4]/70 hover:text-[#4ecdc4] border border-[#4ecdc4]/20 hover:border-[#4ecdc4]/40 px-4 py-2 rounded-lg transition-colors font-[family-name:var(--font-roobert)]"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (scores.length === 0) {
    return (
      <div className="w-full max-w-md mx-auto mt-6">
        <div className="retro-card p-6">
          <h2 className="text-xs font-bold mb-4 font-[family-name:var(--font-avenue-mono)] tracking-[0.2em] uppercase text-[#4ecdc4]/70 retro-header">
            Your Scores
          </h2>
          <p className="text-sm text-white/30 text-center py-4 font-[family-name:var(--font-avenue-mono)]">
            No scores yet. Play a block to get started!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto mt-6">
      <div className="retro-card p-6">
        <h2 className="text-xs font-bold mb-4 font-[family-name:var(--font-avenue-mono)] tracking-[0.2em] uppercase text-[#4ecdc4]/70 retro-header">
          Your Scores
        </h2>
        <div className="space-y-1.5 max-h-60 overflow-y-auto">
          {scores.map((entry) => (
            <div
              key={entry.blockNumber.toString()}
              className="flex items-center justify-between p-3 min-h-[52px] rounded-lg hover:bg-white/5 transition-colors"
            >
              <div>
                <a
                  href={abscanBlockUrl(entry.blockNumber)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-[family-name:var(--font-avenue-mono)] text-white/60 hover:text-[#4ecdc4] transition-colors"
                >
                  Block #{entry.blockNumber.toString()}
                </a>
                <p className="text-[10px] text-white/25 mt-0.5 font-[family-name:var(--font-avenue-mono)]">
                  {timeAgo(entry.timestamp)}
                </p>
              </div>
              <p className="text-sm font-bold font-[family-name:var(--font-avenue-mono)] tabular-nums text-white/80">
                {Number(entry.score).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
