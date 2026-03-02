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

const RANK_STYLES: Record<number, { color: string; glow: string; label: string }> = {
  0: { color: "#ffd700", glow: "0 0 8px rgba(255,215,0,0.4)", label: "1st" },
  1: { color: "#c0c0c0", glow: "0 0 6px rgba(192,192,192,0.3)", label: "2nd" },
  2: { color: "#cd7f32", glow: "0 0 6px rgba(205,127,50,0.3)", label: "3rd" },
};

function MedalIcon({ rank }: { rank: number }) {
  const style = RANK_STYLES[rank];
  if (!style) return null;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill={style.color}
      stroke={style.color}
      strokeWidth="1"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ filter: `drop-shadow(${style.glow})` }}
    >
      <circle cx="12" cy="8" r="6" />
      <path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11" />
    </svg>
  );
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
      fetchScores();
    });
    return unwatch;
  }, [fetchScores]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchScores();
    setRefreshing(false);
  };

  const headerRow = (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ffd700" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-60">
          <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
          <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
          <path d="M4 22h16" />
          <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
          <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
          <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
        </svg>
        <h2 className="text-xs font-bold font-[family-name:var(--font-avenue-mono)] tracking-[0.2em] uppercase text-[#ffd700]/70 retro-header">
          High Scores
        </h2>
      </div>
      <button
        onClick={handleRefresh}
        disabled={refreshing}
        className="flex items-center justify-center w-9 h-9 text-white/40 hover:text-[#4ecdc4] active:text-[#4ecdc4] transition-colors disabled:opacity-50 rounded-lg hover:bg-white/5"
        title="Refresh leaderboard"
      >
        {refreshing ? (
          <span className="inline-block w-4 h-4 border border-white/20 border-t-[#4ecdc4] rounded-full animate-spin" />
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
          </svg>
        )}
      </button>
    </div>
  );

  if (loading) {
    return (
      <div className="w-full">
        <div className="retro-card p-6">
          {headerRow}
          <div className="flex items-center justify-center py-8">
            <div className="w-5 h-5 border-2 border-[#ffd700]/20 border-t-[#ffd700]/60 rounded-full animate-spin" />
          </div>
        </div>
      </div>
    );
  }

  if (scores.length === 0) {
    return (
      <div className="w-full">
        <div className="retro-card p-6">
          {headerRow}
          <p className="text-sm text-white/30 text-center py-4 font-[family-name:var(--font-avenue-mono)]">
            No scores yet. Be the first!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="retro-card p-6">
        {headerRow}
        <div className="space-y-1">
          {scores.map((entry, i) => {
            const rankStyle = RANK_STYLES[i];
            const isTop3 = i < 3;

            return (
              <div
                key={`${entry.player}-${entry.blockNumber}`}
                className={`flex items-center gap-3 p-3 rounded-xl transition-colors hover:bg-white/5 ${isTop3 ? "min-h-[56px]" : "min-h-[48px]"}`}
                style={{
                  background: rankStyle
                    ? `linear-gradient(90deg, ${rankStyle.color}08, transparent 60%)`
                    : undefined,
                  borderLeft: rankStyle
                    ? `2px solid ${rankStyle.color}40`
                    : "2px solid transparent",
                }}
              >
                <span className="w-8 shrink-0 flex items-center justify-center">
                  {isTop3 ? (
                    <MedalIcon rank={i} />
                  ) : (
                    <span
                      className="text-sm font-bold font-[family-name:var(--font-avenue-mono)]"
                      style={{ color: "rgba(255,255,255,0.25)" }}
                    >
                      {i + 1}
                    </span>
                  )}
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
                  className={`font-bold font-[family-name:var(--font-avenue-mono)] tabular-nums shrink-0 ${isTop3 ? "text-base" : "text-sm"}`}
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
