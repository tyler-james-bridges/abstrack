"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getLatestBlockNumber } from "@/lib/chain/blockData";
import { pickDailyChallengeBlock, getTodayChallengeSeed } from "@/lib/game/dailyChallenge";

export function DailyChallengeCard() {
  const router = useRouter();
  const [blockNumber, setBlockNumber] = useState<bigint | null>(null);

  useEffect(() => {
    getLatestBlockNumber()
      .then((latest) => setBlockNumber(pickDailyChallengeBlock(latest)))
      .catch(() => {});
  }, []);

  return (
    <div className="w-full max-w-md mx-auto mb-6">
      <div className="retro-card p-5 border border-fuchsia-400/20">
        <p className="text-[10px] uppercase tracking-[0.2em] text-fuchsia-300/70 font-[family-name:var(--font-avenue-mono)] mb-2">
          Daily Beat Challenge · {getTodayChallengeSeed()}
        </p>
        <p className="text-sm text-white/80 mb-3 font-[family-name:var(--font-roobert)]">
          {blockNumber ? `Today’s block is #${blockNumber.toString()}` : "Picking today’s block..."}
        </p>
        <button
          disabled={!blockNumber}
          onClick={() => blockNumber && router.push(`/play/${blockNumber}`)}
          className="neon-btn w-full h-11 rounded-lg bg-gradient-to-r from-fuchsia-400 to-cyan-400 text-black font-bold text-sm disabled:opacity-40"
        >
          Play Daily Challenge
        </button>
      </div>
    </div>
  );
}
