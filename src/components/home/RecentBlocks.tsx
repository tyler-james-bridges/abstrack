"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getRecentBlocks, type BlockData } from "@/lib/chain/blockData";
import { timeAgo, estimateDifficulty } from "@/lib/format";
import { BlockMosaic } from "@/components/ui/BlockMosaic";

export function RecentBlocks() {
  const router = useRouter();
  const [blocks, setBlocks] = useState<BlockData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getRecentBlocks(8)
      .then(setBlocks)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="block-surface w-full p-5 sm:p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-[9px] font-bold font-[family-name:var(--font-avenue-mono)] tracking-[0.22em] uppercase text-[#A0E7AB]/48">
            Confirmed chain
          </h2>
          <span className="text-[8px] uppercase tracking-wider text-white/22 font-[family-name:var(--font-avenue-mono)]">
            syncing blocks
          </span>
        </div>
        <div className="mt-5 flex gap-3 overflow-hidden">
          {Array.from({ length: 4 }, (_, i) => (
            <div
              key={i}
              className="h-36 min-w-[190px] animate-pulse rounded-md border border-white/6 bg-white/[0.02]"
            />
          ))}
        </div>
      </div>
    );
  }

  if (blocks.length === 0) return null;

  return (
    <div className="block-surface w-full p-5 sm:p-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-[8px] uppercase tracking-[0.22em] text-[#A0E7AB]/45 font-[family-name:var(--font-avenue-mono)]">
            Abstract mainnet
          </p>
          <h2 className="mt-1 text-lg font-bold text-white/82 font-[family-name:var(--font-roobert)]">
            Confirmed chain
          </h2>
        </div>
        <p className="text-right text-[8px] uppercase tracking-wider text-white/22 font-[family-name:var(--font-avenue-mono)]">
          Select any block to process
        </p>
      </div>
      <div className="mt-5 flex gap-3 overflow-x-auto pb-2 [scrollbar-width:thin]">
          {blocks.map((block) => {
            const difficulty = estimateDifficulty(
              block.gasUsed,
              block.transactions.length
            );

            return (
              <button
                key={block.number.toString()}
                onClick={() => router.push(`/play/${block.number}`)}
                className="group min-w-[210px] rounded-md border border-white/8 bg-black/24 p-3 text-left transition-all hover:-translate-y-0.5 hover:border-[#3EB95F]/28 hover:bg-[#3EB95F]/[0.025] active:translate-y-0"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-[8px] uppercase tracking-wider text-white/22 font-[family-name:var(--font-avenue-mono)]">
                      Confirmed {timeAgo(block.timestamp)}
                    </p>
                    <p className="mt-1 text-sm text-white/72 transition-colors group-hover:text-[#A0E7AB] font-[family-name:var(--font-avenue-mono)]">
                      #{block.number.toString()}
                    </p>
                  </div>
                  <span
                    className={`rounded-[3px] border border-white/7 bg-white/[0.025] px-1.5 py-1 text-[7px] font-bold uppercase ${difficulty.color}`}
                  >
                    {difficulty.label}
                  </span>
                </div>

                <BlockMosaic
                  seed={block.number}
                  cells={24}
                  className="mt-3 min-h-[62px] !grid-cols-8 !gap-0.5 !p-2"
                />

                <div className="mt-3 flex items-end justify-between">
                  <p className="text-[8px] leading-relaxed text-white/28 font-[family-name:var(--font-avenue-mono)]">
                    {block.transactions.length} TX
                    <br />
                    {(Number(block.gasUsed) / 1e6).toFixed(2)}M GAS
                  </p>
                  <span className="text-[8px] uppercase tracking-wider text-[#3EB95F]/45 transition-colors group-hover:text-[#A0E7AB] font-[family-name:var(--font-avenue-mono)]">
                    Process &rarr;
                  </span>
                </div>
              </button>
            );
          })}
      </div>
    </div>
  );
}
