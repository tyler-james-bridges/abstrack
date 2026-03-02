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
      <div className="w-full">
        <div className="retro-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4ecdc4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-60">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            <h2 className="text-xs font-bold font-[family-name:var(--font-avenue-mono)] tracking-[0.2em] uppercase text-[#4ecdc4]/70 retro-header">
              Your Scores
            </h2>
          </div>
          <div className="flex items-center justify-center py-6">
            <div className="w-5 h-5 border-2 border-[#45b7d1]/20 border-t-[#45b7d1]/60 rounded-full animate-spin" />
          </div>
        </div>
      </div>
    );
  }

  if (scores.length === 0) {
    return (
      <div className="w-full">
        <div className="retro-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4ecdc4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-60">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            <h2 className="text-xs font-bold font-[family-name:var(--font-avenue-mono)] tracking-[0.2em] uppercase text-[#4ecdc4]/70 retro-header">
              Your Scores
            </h2>
          </div>
          <div className="text-center py-6">
            <p className="text-sm text-white/30 font-[family-name:var(--font-avenue-mono)] mb-1">
              No scores yet
            </p>
            <p className="text-xs text-white/20 font-[family-name:var(--font-avenue-mono)]">
              Play a block to get started!
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="retro-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4ecdc4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-60">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          <h2 className="text-xs font-bold font-[family-name:var(--font-avenue-mono)] tracking-[0.2em] uppercase text-[#4ecdc4]/70 retro-header">
            Your Scores
          </h2>
        </div>
        <div className="space-y-1 max-h-60 overflow-y-auto">
          {scores.map((entry, idx) => (
            <div
              key={entry.blockNumber.toString()}
              className="flex items-center justify-between p-3 min-h-[48px] rounded-xl hover:bg-white/5 transition-colors"
              style={{
                borderLeft: idx === 0 ? "2px solid rgba(78,205,196,0.3)" : "2px solid transparent",
                background: idx === 0 ? "linear-gradient(90deg, rgba(78,205,196,0.05), transparent 60%)" : undefined,
              }}
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
              <p
                className="text-sm font-bold font-[family-name:var(--font-avenue-mono)] tabular-nums"
                style={{
                  color: idx === 0 ? "#4ecdc4" : "rgba(255,255,255,0.7)",
                  textShadow: idx === 0 ? "0 0 8px rgba(78,205,196,0.3)" : undefined,
                }}
              >
                {Number(entry.score).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
