"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getRecentBlocks, type BlockData } from "@/lib/chain/blockData";
import { timeAgo, estimateDifficulty } from "@/lib/format";

const DIFFICULTY_BADGE: Record<string, string> = {
  Easy: "bg-green-500/10 border-green-500/20 text-green-400",
  Medium: "bg-yellow-500/10 border-yellow-500/20 text-yellow-400",
  Hard: "bg-orange-500/10 border-orange-500/20 text-orange-400",
  Extreme: "bg-red-500/10 border-red-500/20 text-red-400",
};

export function RecentBlocks() {
  const router = useRouter();
  const [blocks, setBlocks] = useState<BlockData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getRecentBlocks(10)
      .then(setBlocks)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="w-full">
        <div className="retro-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#45b7d1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-60">
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
            </svg>
            <h2 className="text-xs font-bold font-[family-name:var(--font-avenue-mono)] tracking-[0.2em] uppercase text-[#45b7d1]/70 retro-header">
              Recent Blocks
            </h2>
          </div>
          <div className="flex items-center justify-center py-8">
            <div className="w-5 h-5 border-2 border-[#4ecdc4]/20 border-t-[#4ecdc4]/60 rounded-full animate-spin" />
          </div>
        </div>
      </div>
    );
  }

  if (blocks.length === 0) return null;

  return (
    <div className="w-full">
      <div className="retro-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#45b7d1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-60">
            <rect x="3" y="3" width="7" height="7" />
            <rect x="14" y="3" width="7" height="7" />
            <rect x="14" y="14" width="7" height="7" />
            <rect x="3" y="14" width="7" height="7" />
          </svg>
          <h2 className="text-xs font-bold font-[family-name:var(--font-avenue-mono)] tracking-[0.2em] uppercase text-[#45b7d1]/70 retro-header">
            Recent Blocks
          </h2>
        </div>
        <div className="space-y-1 max-h-[400px] overflow-y-auto">
          {blocks.map((block, idx) => {
            const difficulty = estimateDifficulty(
              block.gasUsed,
              block.transactions.length
            );
            const badgeClass = DIFFICULTY_BADGE[difficulty.label] ?? "bg-white/5 border-white/10 text-white/50";

            return (
              <button
                key={block.number.toString()}
                onClick={() => router.push(`/play/${block.number}`)}
                className="w-full flex items-center justify-between p-3 min-h-[52px] hover:bg-[#4ecdc4]/5 active:bg-[#4ecdc4]/10 rounded-xl transition-all group border border-transparent hover:border-[#4ecdc4]/10"
                style={{
                  animationDelay: `${idx * 30}ms`,
                }}
              >
                <div className="text-left">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-[family-name:var(--font-avenue-mono)] text-white/70 group-hover:text-[#4ecdc4] transition-colors">
                      #{block.number.toString()}
                    </p>
                    <span
                      className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-md border ${badgeClass}`}
                    >
                      {difficulty.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-xs text-white/30 font-[family-name:var(--font-avenue-mono)]">
                      {block.transactions.length} txs &middot;{" "}
                      {(Number(block.gasUsed) / 1e6).toFixed(1)}M gas
                    </p>
                    <span className="text-xs text-white/15">|</span>
                    <p className="text-xs text-white/25 font-[family-name:var(--font-avenue-mono)]">
                      {timeAgo(block.timestamp)}
                    </p>
                  </div>
                </div>
                <span className="text-xs text-[#4ecdc4] opacity-0 group-hover:opacity-100 transition-all group-hover:translate-x-0.5 font-[family-name:var(--font-avenue-mono)] flex items-center gap-1">
                  PLAY
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
