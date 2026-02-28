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
        <div className="bg-white/5 border border-white/10 rounded-xl p-6 backdrop-blur-sm">
          <h2 className="text-lg font-bold mb-4 font-[family-name:var(--font-roobert)]">
            Recent Blocks
          </h2>
          <div className="flex items-center justify-center py-8">
            <div className="w-5 h-5 border-2 border-white/20 border-t-[#4ecdc4] rounded-full animate-spin" />
          </div>
        </div>
      </div>
    );
  }

  if (blocks.length === 0) return null;

  return (
    <div className="w-full max-w-md mx-auto mt-6">
      <div className="bg-white/5 border border-white/10 rounded-xl p-6 backdrop-blur-sm">
        <h2 className="text-lg font-bold mb-4 font-[family-name:var(--font-roobert)]">
          Recent Blocks
        </h2>
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {blocks.map((block) => {
            const difficulty = estimateDifficulty(
              block.gasUsed,
              block.transactions.length
            );

            return (
              <button
                key={block.number.toString()}
                onClick={() => router.push(`/play/${block.number}`)}
                className="w-full flex items-center justify-between p-3 bg-white/3 hover:bg-white/8 border border-white/5 rounded-lg transition-colors group"
              >
                <div className="text-left">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-mono text-white/80">
                      #{block.number.toString()}
                    </p>
                    <span
                      className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${difficulty.color} bg-white/5 border border-white/5`}
                    >
                      {difficulty.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-xs text-white/40">
                      {block.transactions.length} txs &middot;{" "}
                      {(Number(block.gasUsed) / 1e6).toFixed(1)}M gas
                    </p>
                    <span className="text-xs text-white/20">|</span>
                    <p className="text-xs text-white/30">
                      {timeAgo(block.timestamp)}
                    </p>
                  </div>
                </div>
                <span className="text-xs text-[#4ecdc4] opacity-0 group-hover:opacity-100 transition-opacity font-[family-name:var(--font-roobert)]">
                  Play
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
