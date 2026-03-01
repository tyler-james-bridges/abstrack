"use client";

import React, { useEffect, useState, useCallback } from "react";
import { publicClient } from "@/lib/chain/blockData";
import {
  TEMPO_SCORE_REGISTRY_ABI,
  TEMPO_SCORE_REGISTRY_ADDRESS,
} from "@/lib/chain/scoreContract";
import { watchScoreSubmitted } from "@/lib/chain/events";
import { truncateAddress, timeAgo, abscanBlockUrl } from "@/lib/format";

interface ScoreEntry {
  player: string;
  blockNumber: bigint;
  score: bigint;
  timestamp: bigint;
}

export function Leaderboard() {
  const [scores, setScores] = useState<ScoreEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchScores = useCallback(async () => {
    try {
      const result = await publicClient.readContract({
        address: TEMPO_SCORE_REGISTRY_ADDRESS,
        abi: TEMPO_SCORE_REGISTRY_ABI,
        functionName: "getGlobalTopScores",
        args: [10n],
      });
      setScores(result as unknown as ScoreEntry[]);
    } catch {
      // silently fail -- scores stay as-is
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchScores().finally(() => setLoading(false));
  }, [fetchScores]);

  // Real-time updates via event watching
  useEffect(() => {
    const unwatch = watchScoreSubmitted(() => {
      // A new score was submitted -- refresh the leaderboard
      fetchScores();
    });
    return unwatch;
  }, [fetchScores]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchScores();
    setRefreshing(false);
  };

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
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold font-[family-name:var(--font-roobert)]">
              Leaderboard
            </h2>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="text-xs text-white/40 hover:text-white/70 transition-colors disabled:opacity-50"
              title="Refresh leaderboard"
            >
              {refreshing ? (
                <span className="inline-block w-4 h-4 border border-white/20 border-t-white/60 rounded-full animate-spin" />
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
                </svg>
              )}
            </button>
          </div>
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
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold font-[family-name:var(--font-roobert)]">
            Leaderboard
          </h2>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center justify-center w-10 h-10 text-white/40 hover:text-white/70 active:text-white/90 transition-colors disabled:opacity-50 rounded-lg"
            title="Refresh leaderboard"
          >
            {refreshing ? (
              <span className="inline-block w-4 h-4 border border-white/20 border-t-white/60 rounded-full animate-spin" />
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
              </svg>
            )}
          </button>
        </div>
        <div className="space-y-2">
          {scores.map((entry, i) => (
            <div
              key={`${entry.player}-${entry.blockNumber}`}
              className="flex items-center gap-3 p-3 min-h-[52px] bg-white/3 border border-white/5 rounded-lg"
            >
              <span
                className="text-lg font-bold w-8 text-center shrink-0"
                style={{ color: rankColors[i] ?? "rgba(255,255,255,0.4)" }}
              >
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-mono text-white/70 truncate">
                  {truncateAddress(entry.player)}
                </p>
                <div className="flex items-center gap-2">
                  <a
                    href={abscanBlockUrl(entry.blockNumber)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-white/30 hover:text-[#4ecdc4] transition-colors"
                  >
                    Block #{entry.blockNumber.toString()}
                  </a>
                  <span className="text-xs text-white/20">|</span>
                  <span className="text-xs text-white/30">
                    {timeAgo(entry.timestamp)}
                  </span>
                </div>
              </div>
              <p className="text-sm font-bold font-mono tabular-nums text-white shrink-0">
                {Number(entry.score).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
