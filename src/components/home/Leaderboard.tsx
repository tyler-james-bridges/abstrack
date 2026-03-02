"use client";

import React, { useEffect, useState, useCallback } from "react";
import { publicClient } from "@/lib/chain/blockData";
import {
  ABSTRACK_ABI,
  ABSTRACK_ADDRESS,
} from "@/lib/chain/scoreContract";
import { watchScoreSubmitted } from "@/lib/chain/events";
import { truncateAddress, timeAgo, abscanBlockUrl } from "@/lib/format";

interface ScoreEntry {
  player: string;
  blockNumber: bigint;
  score: bigint;
  timestamp: bigint;
}

const RANK_STYLES: Record<number, { color: string; glow: string }> = {
  0: { color: "#ffd700", glow: "0 0 8px rgba(255,215,0,0.4)" },
  1: { color: "#c0c0c0", glow: "0 0 6px rgba(192,192,192,0.3)" },
  2: { color: "#cd7f32", glow: "0 0 6px rgba(205,127,50,0.3)" },
};

export function Leaderboard() {
  const [scores, setScores] = useState<ScoreEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchScores = useCallback(async () => {
    try {
      const result = await publicClient.readContract({
        address: ABSTRACK_ADDRESS,
        abi: ABSTRACK_ABI,
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
        <div className="retro-card p-6">
          <h2 className="text-xs font-bold mb-4 font-[family-name:var(--font-avenue-mono)] tracking-[0.2em] uppercase text-[#ffd700]/70 retro-header">
            High Scores
          </h2>
          <div className="flex items-center justify-center py-8">
            <div className="w-5 h-5 border-2 border-[#ffd700]/20 border-t-[#ffd700]/60 rounded-full animate-spin" />
          </div>
        </div>
      </div>
    );
  }

  if (scores.length === 0) {
    return (
      <div className="w-full max-w-md mx-auto mt-6">
        <div className="retro-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-bold font-[family-name:var(--font-avenue-mono)] tracking-[0.2em] uppercase text-[#ffd700]/70 retro-header">
              High Scores
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
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
                </svg>
              )}
            </button>
          </div>
          <p className="text-sm text-white/30 text-center py-4 font-[family-name:var(--font-avenue-mono)]">
            No scores yet. Be the first!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto mt-6">
      <div className="retro-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-bold font-[family-name:var(--font-avenue-mono)] tracking-[0.2em] uppercase text-[#ffd700]/70 retro-header">
            High Scores
          </h2>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center justify-center w-10 h-10 text-white/40 hover:text-[#4ecdc4] active:text-[#4ecdc4] transition-colors disabled:opacity-50 rounded-lg"
            title="Refresh leaderboard"
          >
            {refreshing ? (
              <span className="inline-block w-4 h-4 border border-white/20 border-t-[#4ecdc4] rounded-full animate-spin" />
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
              </svg>
            )}
          </button>
        </div>
        <div className="space-y-1.5">
          {scores.map((entry, i) => {
            const rankStyle = RANK_STYLES[i];

            return (
              <div
                key={`${entry.player}-${entry.blockNumber}`}
                className="flex items-center gap-3 p-3 min-h-[52px] rounded-lg transition-colors hover:bg-white/5"
                style={{
                  background: rankStyle
                    ? `linear-gradient(90deg, ${rankStyle.color}08, transparent 60%)`
                    : undefined,
                  borderLeft: rankStyle
                    ? `2px solid ${rankStyle.color}40`
                    : "2px solid transparent",
                }}
              >
                <span
                  className="text-lg font-black w-8 text-center shrink-0 font-[family-name:var(--font-avenue-mono)]"
                  style={{
                    color: rankStyle?.color ?? "rgba(255,255,255,0.25)",
                    textShadow: rankStyle?.glow,
                  }}
                >
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-[family-name:var(--font-avenue-mono)] text-white/60 truncate">
                    {truncateAddress(entry.player)}
                  </p>
                  <div className="flex items-center gap-2">
                    <a
                      href={abscanBlockUrl(entry.blockNumber)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-white/25 hover:text-[#4ecdc4] transition-colors font-[family-name:var(--font-avenue-mono)]"
                    >
                      Block #{entry.blockNumber.toString()}
                    </a>
                    <span className="text-[10px] text-white/15">|</span>
                    <span className="text-[10px] text-white/25 font-[family-name:var(--font-avenue-mono)]">
                      {timeAgo(entry.timestamp)}
                    </span>
                  </div>
                </div>
                <p
                  className="text-sm font-bold font-[family-name:var(--font-avenue-mono)] tabular-nums shrink-0"
                  style={{
                    color: rankStyle?.color ?? "rgba(255,255,255,0.7)",
                    textShadow: i === 0 ? "0 0 8px rgba(255,215,0,0.3)" : undefined,
                  }}
                >
                  {Number(entry.score).toLocaleString()}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
