"use client";

import React, { useEffect, useState } from "react";
import { publicClient } from "@/lib/chain/blockData";
import {
  TEMPO_SCORE_REGISTRY_ABI,
  TEMPO_SCORE_REGISTRY_ADDRESS,
} from "@/lib/chain/scoreContract";

interface ScoreEntry {
  player: string;
  blockNumber: bigint;
  score: bigint;
  timestamp: bigint;
}

export function Leaderboard() {
  const [scores, setScores] = useState<ScoreEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    publicClient
      .readContract({
        address: TEMPO_SCORE_REGISTRY_ADDRESS,
        abi: TEMPO_SCORE_REGISTRY_ABI,
        functionName: "getGlobalTopScores",
        args: [10n],
      })
      .then((result) => {
        setScores(result as unknown as ScoreEntry[]);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="w-full max-w-md mx-auto mt-6">
        <div className="bg-white/5 border border-white/10 rounded-xl p-6 backdrop-blur-sm">
          <h2 className="text-lg font-bold mb-4 font-[family-name:var(--font-roobert)]">
            Leaderboard
          </h2>
          <div className="flex items-center justify-center py-8">
            <div className="w-5 h-5 border-2 border-white/20 border-t-[#ffd700] rounded-full animate-spin" />
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
            Leaderboard
          </h2>
          <p className="text-sm text-white/40 text-center py-4">
            No scores yet. Be the first to play!
          </p>
        </div>
      </div>
    );
  }

  const rankColors = ["#ffd700", "#c0c0c0", "#cd7f32"];

  return (
    <div className="w-full max-w-md mx-auto mt-6">
      <div className="bg-white/5 border border-white/10 rounded-xl p-6 backdrop-blur-sm">
        <h2 className="text-lg font-bold mb-4 font-[family-name:var(--font-roobert)]">
          Leaderboard
        </h2>
        <div className="space-y-2">
          {scores.map((entry, i) => (
            <div
              key={`${entry.player}-${entry.blockNumber}`}
              className="flex items-center gap-3 p-3 bg-white/3 border border-white/5 rounded-lg"
            >
              <span
                className="text-lg font-bold w-8 text-center"
                style={{ color: rankColors[i] ?? "rgba(255,255,255,0.4)" }}
              >
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-mono text-white/70 truncate">
                  {entry.player}
                </p>
                <p className="text-xs text-white/30">
                  Block #{entry.blockNumber.toString()}
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
