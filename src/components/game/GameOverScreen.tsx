"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { useWriteContractSponsored } from "@abstract-foundation/agw-react";
import { useWaitForTransactionReceipt } from "wagmi";
import { getGeneralPaymasterInput } from "viem/zksync";
import type { FinalScore } from "@/lib/game/types";
import { GRADE_COLORS, MAX_SCORE } from "@/lib/game/constants";
import {
  TEMPO_SCORE_REGISTRY_ABI,
  TEMPO_SCORE_REGISTRY_ADDRESS,
  PAYMASTER_ADDRESS,
} from "@/lib/chain/scoreContract";

interface GameOverScreenProps {
  finalScore: FinalScore;
  onPlayAgain: () => void;
}

const GRADE_BG_COLORS: Record<string, string> = {
  S: "from-yellow-500/20 to-yellow-600/10",
  A: "from-green-500/20 to-green-600/10",
  B: "from-blue-500/20 to-blue-600/10",
  C: "from-purple-500/20 to-purple-600/10",
  D: "from-red-500/20 to-red-600/10",
};

export function GameOverScreen({ finalScore, onPlayAgain }: GameOverScreenProps) {
  const router = useRouter();
  const { address } = useAccount();
  const [submitted, setSubmitted] = useState(false);

  const {
    writeContractSponsored,
    data: txHash,
    isPending: isSubmitting,
  } = useWriteContractSponsored();

  const { data: receipt } = useWaitForTransactionReceipt({ hash: txHash });

  const handleSubmitScore = () => {
    if (!address || submitted) return;

    writeContractSponsored({
      abi: TEMPO_SCORE_REGISTRY_ABI,
      address: TEMPO_SCORE_REGISTRY_ADDRESS,
      functionName: "submitScore",
      args: [BigInt(finalScore.blockNumber), BigInt(finalScore.totalScore)],
      paymaster: PAYMASTER_ADDRESS,
      paymasterInput: getGeneralPaymasterInput({ innerInput: "0x" }),
    });

    setSubmitted(true);
  };

  const accuracy = (finalScore.accuracy * 100).toFixed(1);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white p-4">
      <div className="w-full max-w-md">
        {/* Letter Grade */}
        <div
          className={`text-center mb-8 p-8 rounded-2xl bg-gradient-to-b ${GRADE_BG_COLORS[finalScore.letterGrade]} border border-white/10 backdrop-blur-sm`}
        >
          <p className="text-sm text-white/50 uppercase tracking-widest mb-2">
            Rank
          </p>
          <p
            className="text-8xl font-black"
            style={{
              textShadow:
                finalScore.letterGrade === "S"
                  ? "0 0 40px #ffd700, 0 0 80px #ffd700"
                  : "0 0 20px rgba(255,255,255,0.2)",
            }}
          >
            {finalScore.letterGrade}
          </p>
        </div>

        {/* Score */}
        <div className="text-center mb-6">
          <p className="text-4xl font-bold font-mono tabular-nums">
            {finalScore.totalScore.toLocaleString()}
          </p>
          <p className="text-sm text-white/40 mt-1">
            / {MAX_SCORE.toLocaleString()}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-white/5 rounded-lg p-3 text-center border border-white/10">
            <p className="text-xs text-white/40 uppercase">Max Combo</p>
            <p className="text-xl font-bold">{finalScore.maxCombo}</p>
          </div>
          <div className="bg-white/5 rounded-lg p-3 text-center border border-white/10">
            <p className="text-xs text-white/40 uppercase">Accuracy</p>
            <p className="text-xl font-bold">{accuracy}%</p>
          </div>
        </div>

        {/* Grade Breakdown */}
        <div className="flex justify-between gap-2 mb-8">
          {(["perfect", "great", "good", "miss"] as const).map((grade) => (
            <div
              key={grade}
              className="flex-1 text-center bg-white/5 rounded-lg p-2 border border-white/5"
            >
              <p
                className="text-xs font-bold uppercase"
                style={{ color: GRADE_COLORS[grade] }}
              >
                {grade}
              </p>
              <p className="text-lg font-bold">{finalScore.gradeCounts[grade]}</p>
            </div>
          ))}
        </div>

        {/* Block info */}
        <p className="text-center text-xs text-white/30 mb-6">
          Block #{finalScore.blockNumber} | {finalScore.totalNotes} notes
        </p>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          {address && !receipt && (
            <button
              onClick={handleSubmitScore}
              disabled={isSubmitting || submitted}
              className="w-full h-12 rounded-full bg-gradient-to-r from-[#4ecdc4] to-[#45b7d1] text-black font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed font-[family-name:var(--font-roobert)]"
            >
              {isSubmitting
                ? "Submitting..."
                : submitted
                  ? "Confirming..."
                  : "Submit Score (Gas-Free)"}
            </button>
          )}

          {receipt && (
            <div className="text-center p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
              <p className="text-sm text-green-400 font-medium">
                Score submitted on-chain!
              </p>
              <a
                href={`https://sepolia.abscan.org/tx/${receipt.transactionHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-400 hover:text-blue-300 underline"
              >
                View on Abscan
              </a>
            </div>
          )}

          <button
            onClick={onPlayAgain}
            className="w-full h-12 rounded-full border border-white/20 text-white font-bold text-sm hover:bg-white/10 transition-colors font-[family-name:var(--font-roobert)]"
          >
            Play Again
          </button>

          <button
            onClick={() => router.push("/")}
            className="w-full h-10 text-white/50 text-sm hover:text-white/80 transition-colors font-[family-name:var(--font-roobert)]"
          >
            Home
          </button>
        </div>
      </div>
    </div>
  );
}
