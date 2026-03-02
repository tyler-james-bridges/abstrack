"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getLatestBlockNumber } from "@/lib/chain/blockData";
import { pickDailyChallengeBlock, getTodayChallengeSeed } from "@/lib/game/dailyChallenge";

function timeLeftToUtcMidnight(): string {
  const now = new Date();
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
  const ms = next.getTime() - now.getTime();
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = String(Math.floor(total / 3600)).padStart(2, "0");
  const m = String(Math.floor((total % 3600) / 60)).padStart(2, "0");
  const s = String(total % 60).padStart(2, "0");
  return `${h}:${m}:${s}`;
}

export function DailyChallengeCard() {
  const router = useRouter();
  const [blockNumber, setBlockNumber] = useState<bigint | null>(null);
  const [timeLeft, setTimeLeft] = useState<string>(timeLeftToUtcMidnight());

  useEffect(() => {
    getLatestBlockNumber()
      .then((latest) => setBlockNumber(pickDailyChallengeBlock(latest)))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => setTimeLeft(timeLeftToUtcMidnight()), 1000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="w-full max-w-md mx-auto mb-6">
      <div className="retro-card p-5 border border-[#3EB95F]/20">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#3EB95F]/70 font-[family-name:var(--font-avenue-mono)]">
            Daily Beat Challenge · {getTodayChallengeSeed()}
          </p>
          <span className="text-[10px] text-white/45 font-[family-name:var(--font-avenue-mono)]">
            resets in {timeLeft}
          </span>
        </div>
        <p className="text-sm text-white/80 mb-3 font-[family-name:var(--font-roobert)]">
          {blockNumber ? `Today’s block is #${blockNumber.toString()}` : "Picking today’s block..."}
        </p>
        <button
          disabled={!blockNumber}
          onClick={() => blockNumber && router.push(`/play/${blockNumber}`)}
          className="neon-btn w-full h-11 rounded-lg bg-gradient-to-r from-[#3EB95F] to-[#73C98C] text-black font-bold text-sm disabled:opacity-40"
        >
          Play Daily Challenge
        </button>
      </div>
    </div>
  );
}
