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

  useEffect(() => {
    if (!address) {
      setScores([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    publicClient
      .readContract({
        address: TEMPO_SCORE_REGISTRY_ADDRESS,
        abi: TEMPO_SCORE_REGISTRY_ABI,
        functionName: "getPlayerScores",
        args: [address as Address],
      })
      .then((result) => {
        const entries = result as unknown as ScoreEntry[];
        // Sort by score descending
        const sorted = [...entries].sort(
          (a, b) => Number(b.score) - Number(a.score)
        );
        setScores(sorted);
      })
      .catch(() => {
        setScores([]);
      })
      .finally(() => setLoading(false));
  }, [address]);

  if (!address) return null;

  if (loading) {
    return (
      <div className="w-full max-w-md mx-auto mt-6">
        <div className="bg-white/5 border border-white/10 rounded-xl p-6 backdrop-blur-sm">
          <h2 className="text-lg font-bold mb-4 font-[family-name:var(--font-roobert)]">
            Your Scores
          </h2>
          <div className="flex items-center justify-center py-6">
            <div className="w-5 h-5 border-2 border-white/20 border-t-[#45b7d1] rounded-full animate-spin" />
          </div>
        </div>
      </div>
    );
  }

  if (scores.length === 0) {
    return (
      <div className="w-full max-w-md mx-auto mt-6">
        <div className="bg-white/5 border border-white/10 rounded-xl p-6 backdrop-blur-sm">
          <h2 className="text-lg font-bold mb-4 font-[family-name:var(--font-roobert)]">
            Your Scores
          </h2>
          <p className="text-sm text-white/40 text-center py-4">
            No scores submitted yet. Play a block to get started!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto mt-6">
      <div className="bg-white/5 border border-white/10 rounded-xl p-6 backdrop-blur-sm">
        <h2 className="text-lg font-bold mb-4 font-[family-name:var(--font-roobert)]">
          Your Scores
        </h2>
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {scores.map((entry) => (
            <div
              key={entry.blockNumber.toString()}
              className="flex items-center justify-between p-3 min-h-[52px] bg-white/3 border border-white/5 rounded-lg"
            >
              <div>
                <a
                  href={abscanBlockUrl(entry.blockNumber)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-mono text-white/70 hover:text-[#4ecdc4] transition-colors"
                >
                  Block #{entry.blockNumber.toString()}
                </a>
                <p className="text-xs text-white/30 mt-0.5">
                  {timeAgo(entry.timestamp)}
                </p>
              </div>
              <p className="text-sm font-bold font-mono tabular-nums text-white">
                {Number(entry.score).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
