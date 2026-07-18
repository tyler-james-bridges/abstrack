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
  const [mounted, setMounted] = useState(false);
  const [timeLeft, setTimeLeft] = useState<string>("--:--:--");

  useEffect(() => {
    getLatestBlockNumber()
      .then((latest) => setBlockNumber(pickDailyChallengeBlock(latest)))
      .catch(() => {});
  }, []);

  useEffect(() => {
    setMounted(true);
    setTimeLeft(timeLeftToUtcMidnight());
    const id = window.setInterval(() => setTimeLeft(timeLeftToUtcMidnight()), 1000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="w-full">
      <div className="block-surface p-5">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#3EB95F]/70 font-[family-name:var(--font-avenue-mono)]">
            Daily block build · {getTodayChallengeSeed()}
          </p>
          <span className="text-[10px] text-white/45 font-[family-name:var(--font-avenue-mono)]" suppressHydrationWarning>
            resets in {mounted ? timeLeft : "--:--:--"}
          </span>
        </div>
        <p className="text-sm text-white/80 mb-3 font-[family-name:var(--font-roobert)]">
          {blockNumber ? `Everyone processes block #${blockNumber.toString()}` : "Selecting today’s block..."}
        </p>
        <p className="mb-4 text-[10px] leading-relaxed text-white/32 font-[family-name:var(--font-avenue-mono)]">
          One shared transaction queue. One daily leaderboard.
        </p>
        <button
          disabled={!blockNumber}
          onClick={() => blockNumber && router.push(`/play/${blockNumber}`)}
          className="processing-btn w-full h-11 rounded-md bg-[#A0E7AB] text-[#031006] font-bold text-sm disabled:opacity-40"
        >
          Process daily block
        </button>
      </div>
    </div>
  );
}
