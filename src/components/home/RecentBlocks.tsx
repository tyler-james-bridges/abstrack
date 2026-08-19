"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getRecentBlocks, type BlockData } from "@/lib/chain/blockData";
import { generateBeatChart } from "@/lib/game/BlockBeatGenerator";
import { buildFingerprint, type Fingerprint as FingerprintData } from "@/lib/game/fingerprint";
import { Fingerprint } from "@/components/ui/Fingerprint";

interface TickerBlock {
  block: BlockData;
  fingerprint: FingerprintData;
}

/**
 * The live block ticker. Kept at getRecentBlocks(8) — that's 8 parallel RPC
 * calls already; raising it multiplies that cost for a strip that scrolls
 * past in a couple seconds anyway.
 */
export function RecentBlocks() {
  const router = useRouter();
  const [blocks, setBlocks] = useState<TickerBlock[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    getRecentBlocks(8)
      .then((fetched) => {
        if (!active) return;
        setBlocks(
          fetched.map((block) => ({
            block,
            fingerprint: buildFingerprint(generateBeatChart(block), 24),
          }))
        );
      })
      .catch(() => {})
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-2 overflow-hidden">
        {Array.from({ length: 8 }, (_, i) => (
          <div
            key={i}
            className="h-8 w-14 shrink-0 animate-pulse rounded-[3px] border border-[var(--abstrack-line)] bg-white/[0.02]"
          />
        ))}
      </div>
    );
  }

  if (blocks.length === 0) return null;

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:thin]">
      {blocks.map(({ block, fingerprint }) => (
        <button
          key={block.number.toString()}
          onClick={() => router.push(`/play/${block.number}`)}
          className="group shrink-0 rounded-[3px] border border-[var(--abstrack-line)] bg-black/20 px-1.5 pt-1.5 pb-1 text-left transition-colors hover:border-[var(--abstrack-lane-2)]/50"
          title={`Block #${block.number}`}
        >
          <Fingerprint
            fingerprint={fingerprint}
            height={22}
            gap={1}
            ghostUnpainted={false}
            className="w-14"
          />
          <p className="mt-1 text-[7px] uppercase tracking-wider text-[var(--abstrack-faint)] font-[family-name:var(--font-avenue-mono)] group-hover:text-[var(--abstrack-dim)]">
            #{block.number.toString().slice(-5)}
          </p>
        </button>
      ))}
    </div>
  );
}
