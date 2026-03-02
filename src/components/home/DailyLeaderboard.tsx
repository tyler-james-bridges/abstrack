"use client";

import { useEffect, useState } from "react";
import { publicClient, getLatestBlockNumber } from "@/lib/chain/blockData";
import { ABSTRACK_ABI, ABSTRACK_ADDRESS } from "@/lib/chain/scoreContract";
import { pickDailyChallengeBlock } from "@/lib/game/dailyChallenge";
import { truncateAddress } from "@/lib/format";

interface ScoreEntry {
  player: string;
  blockNumber: bigint;
  score: bigint;
  timestamp: bigint;
}

export function DailyLeaderboard() {
  const [rows, setRows] = useState<ScoreEntry[]>([]);
  const [block, setBlock] = useState<bigint | null>(null);

  const shareDaily = async () => {
    if (!block || rows.length === 0) return;
    const top = rows[0];
    const text = `ABSTRACK daily challenge #${block.toString()} — top score ${Number(top.score).toLocaleString()} by ${truncateAddress(top.player)}. Can you beat it?`;
    const url = typeof window !== "undefined" ? window.location.origin : "https://abstrack.live";

    try {
      if (navigator.share) {
        await navigator.share({ text, url });
      } else {
        await navigator.clipboard.writeText(`${text} ${url}`);
      }
    } catch {
      // no-op
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const latest = await getLatestBlockNumber();
        const dailyBlock = pickDailyChallengeBlock(latest);
        setBlock(dailyBlock);

        const result = await publicClient.readContract({
          address: ABSTRACK_ADDRESS,
          abi: ABSTRACK_ABI,
          functionName: "getBlockScores",
          args: [dailyBlock],
        });

        const entries = (result as unknown as ScoreEntry[])
          .sort((a, b) => Number(b.score - a.score))
          .slice(0, 10);
        setRows(entries);
      } catch {
        setRows([]);
      }
    })();
  }, []);

  return (
    <div className="w-full max-w-md mx-auto mt-6">
      <div className="retro-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-bold font-[family-name:var(--font-avenue-mono)] tracking-[0.2em] uppercase text-[#3EB95F]/70 retro-header">
            Daily Leaderboard {block ? `#${block}` : ""}
          </h2>
          <button
            onClick={shareDaily}
            disabled={!block || rows.length === 0}
            className="text-[10px] uppercase tracking-wider text-[#3EB95F]/70 hover:text-[#3EB95F] disabled:opacity-40"
          >
            Share
          </button>
        </div>
        {rows.length === 0 ? (
          <p className="text-sm text-white/30">No daily scores yet. Be first.</p>
        ) : (
          <div className="space-y-1.5">
            {rows.map((r, i) => (
              <div key={`${r.player}-${i}`} className="flex items-center justify-between p-2 rounded-lg bg-white/5">
                <span className="text-xs text-white/50 w-6">{i + 1}</span>
                <span className="text-xs text-white/70 flex-1">{truncateAddress(r.player)}</span>
                <span className="text-sm font-[family-name:var(--font-avenue-mono)]">{Number(r.score).toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
