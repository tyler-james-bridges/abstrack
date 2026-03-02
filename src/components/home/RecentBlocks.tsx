"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getRecentBlocks, type BlockData } from "@/lib/chain/blockData";
import { timeAgo, estimateDifficulty } from "@/lib/format";

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
      <div className="w-full max-w-md mx-auto mt-6">
        <div className="retro-card p-6">
          <h2 className="text-xs font-bold mb-4 font-[family-name:var(--font-avenue-mono)] tracking-[0.2em] uppercase text-[#73C98C]/70 retro-header">
            Recent Blocks
          </h2>
          <div className="flex items-center justify-center py-8">
            <div className="w-5 h-5 border-2 border-[#3EB95F]/20 border-t-[#3EB95F]/60 rounded-full animate-spin" />
          </div>
        </div>
      </div>
    );
  }

  if (blocks.length === 0) return null;

  return (
    <div className="w-full max-w-md mx-auto mt-6">
      <div className="retro-card p-6">
        <h2 className="text-xs font-bold mb-4 font-[family-name:var(--font-avenue-mono)] tracking-[0.2em] uppercase text-[#73C98C]/70 retro-header">
          Recent Blocks
        </h2>
        <div className="space-y-1.5 max-h-80 overflow-y-auto">
          {blocks.map((block) => {
            const difficulty = estimateDifficulty(
              block.gasUsed,
              block.transactions.length
            );

            return (
              <button
                key={block.number.toString()}
                onClick={() => router.push(`/play/${block.number}`)}
                className="w-full flex items-center justify-between p-3 min-h-[52px] hover:bg-[#3EB95F]/5 active:bg-[#3EB95F]/10 rounded-lg transition-all group border border-transparent hover:border-[#3EB95F]/10"
              >
                <div className="text-left">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-[family-name:var(--font-avenue-mono)] text-white/70 group-hover:text-[#3EB95F] transition-colors">
                      #{block.number.toString()}
                    </p>
                    <span
                      className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${difficulty.color} bg-white/5 border border-white/5`}
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
                <span className="text-xs text-[#3EB95F] opacity-40 group-hover:opacity-100 transition-opacity font-[family-name:var(--font-avenue-mono)]">
                  PLAY &rarr;
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
