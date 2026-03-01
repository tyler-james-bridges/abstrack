"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
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
import { abscanTxUrl } from "@/lib/format";

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

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

interface ValidationResult {
  valid: boolean;
  error: string | null;
}

function validateScore(
  totalScore: number,
  blockNumber: number
): ValidationResult {
  if (totalScore < 0) {
    return { valid: false, error: "Score cannot be negative." };
  }
  if (totalScore > MAX_SCORE) {
    return {
      valid: false,
      error: `Score exceeds the maximum allowed value (${MAX_SCORE.toLocaleString()}).`,
    };
  }
  if (!Number.isInteger(totalScore)) {
    return { valid: false, error: "Score must be a whole number." };
  }
  if (blockNumber <= 0) {
    return { valid: false, error: "Invalid block number." };
  }
  if (!Number.isInteger(blockNumber)) {
    return { valid: false, error: "Block number must be a whole number." };
  }
  return { valid: true, error: null };
}

/**
 * Parse a user-friendly error message from a contract revert or RPC error.
 */
function parseSubmissionError(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err);

  // Contract-level reverts
  if (message.includes("New score must be higher")) {
    return "You already have a higher score for this block. Only improvements are recorded on-chain.";
  }
  if (message.includes("Score exceeds maximum")) {
    return "Score exceeds the maximum allowed value (1,000,000).";
  }

  // Wallet-level rejections
  if (
    message.includes("rejected") ||
    message.includes("denied") ||
    message.includes("User rejected")
  ) {
    return "Transaction was rejected. You can try again.";
  }

  // RPC errors
  if (message.includes("insufficient funds")) {
    return "Insufficient funds for gas. The paymaster may be out of funds.";
  }
  if (
    message.includes("network") ||
    message.includes("timeout") ||
    message.includes("fetch")
  ) {
    return "Network error. Please check your connection and try again.";
  }

  // Fallback: truncate long messages
  if (message.length > 150) {
    return message.slice(0, 147) + "...";
  }
  return message;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function GameOverScreen({
  finalScore,
  onPlayAgain,
}: GameOverScreenProps) {
  const router = useRouter();
  const { address } = useAccount();
  const [submitted, setSubmitted] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  const {
    writeContractSponsored,
    data: txHash,
    isPending: isSubmitting,
    error: writeError,
  } = useWriteContractSponsored();

  const { data: receipt } = useWaitForTransactionReceipt({ hash: txHash });

  // Keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "r" || e.key === "R") {
        e.preventDefault();
        onPlayAgain();
      }
      if (e.key === "Escape") {
        e.preventDefault();
        router.push("/");
      }
    },
    [onPlayAgain, router]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // Client-side validation (runs once)
  const validation = useMemo(
    () => validateScore(finalScore.totalScore, finalScore.blockNumber),
    [finalScore.totalScore, finalScore.blockNumber]
  );

  // Derive error to display from either validation, write error, or manual error
  const displayError = useMemo(() => {
    if (!validation.valid) return validation.error;
    if (submissionError) return submissionError;
    if (writeError) return parseSubmissionError(writeError);
    return null;
  }, [validation, submissionError, writeError]);

  const handleSubmitScore = () => {
    if (!address || submitted) return;
    if (!validation.valid) return;

    setSubmissionError(null);

    try {
      writeContractSponsored(
        {
          abi: TEMPO_SCORE_REGISTRY_ABI,
          address: TEMPO_SCORE_REGISTRY_ADDRESS,
          functionName: "submitScore",
          args: [
            BigInt(finalScore.blockNumber),
            BigInt(finalScore.totalScore),
          ],
          paymaster: PAYMASTER_ADDRESS,
          paymasterInput: getGeneralPaymasterInput({ innerInput: "0x" }),
        },
        {
          onError: (error) => {
            setSubmissionError(parseSubmissionError(error));
            setSubmitted(false);
          },
        }
      );

      setSubmitted(true);
    } catch (err) {
      setSubmissionError(parseSubmissionError(err));
    }
  };

  const accuracy = (finalScore.accuracy * 100).toFixed(1);

  return (
    <div
      className="flex flex-col items-center min-h-dvh bg-black text-white overflow-y-auto safe-all"
    >
      {/* Scrollable content wrapper — centers vertically on tall screens,
          scrolls naturally on short / mobile screens */}
      <div className="w-full max-w-md mx-auto px-4 py-6 sm:py-10 flex flex-col items-center justify-center flex-1">
        {/* Letter Grade */}
        <div
          className={`w-full text-center mb-5 sm:mb-8 p-5 sm:p-8 rounded-2xl bg-gradient-to-b ${GRADE_BG_COLORS[finalScore.letterGrade]} border border-white/10 backdrop-blur-sm`}
        >
          <p className="text-xs sm:text-sm text-white/50 uppercase tracking-widest mb-1 sm:mb-2">
            Rank
          </p>
          <p
            className="text-6xl sm:text-8xl font-black"
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
        <div className="text-center mb-4 sm:mb-6">
          <p className="text-3xl sm:text-4xl font-bold font-mono tabular-nums">
            {finalScore.totalScore.toLocaleString()}
          </p>
          <p className="text-xs sm:text-sm text-white/40 mt-1">
            / {MAX_SCORE.toLocaleString()}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="w-full grid grid-cols-2 gap-2 sm:gap-3 mb-4 sm:mb-6">
          <div className="bg-white/5 rounded-lg p-3 text-center border border-white/10">
            <p className="text-[10px] sm:text-xs text-white/40 uppercase">Max Combo</p>
            <p className="text-lg sm:text-xl font-bold">{finalScore.maxCombo}</p>
          </div>
          <div className="bg-white/5 rounded-lg p-3 text-center border border-white/10">
            <p className="text-[10px] sm:text-xs text-white/40 uppercase">Accuracy</p>
            <p className="text-lg sm:text-xl font-bold">{accuracy}%</p>
          </div>
        </div>

        {/* Grade Breakdown */}
        <div className="w-full grid grid-cols-4 gap-1.5 sm:gap-2 mb-5 sm:mb-8">
          {(["perfect", "great", "good", "miss"] as const).map((grade) => (
            <div
              key={grade}
              className="text-center bg-white/5 rounded-lg p-2 border border-white/5"
            >
              <p
                className="text-[10px] sm:text-xs font-bold uppercase"
                style={{ color: GRADE_COLORS[grade] }}
              >
                {grade}
              </p>
              <p className="text-base sm:text-lg font-bold">
                {finalScore.gradeCounts[grade]}
              </p>
            </div>
          ))}
        </div>

        {/* Block info */}
        <p className="text-center text-xs text-white/30 mb-4 sm:mb-6">
          Block #{finalScore.blockNumber} | {finalScore.totalNotes} notes
        </p>

        {/* Error display */}
        {displayError && (
          <div className="w-full mb-3 sm:mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-sm text-red-400">{displayError}</p>
          </div>
        )}

        {/* Actions */}
        <div className="w-full flex flex-col gap-3">
          {address && !receipt && (
            <button
              onClick={handleSubmitScore}
              disabled={isSubmitting || submitted || !validation.valid}
              className="w-full h-12 sm:h-12 rounded-full bg-gradient-to-r from-[#4ecdc4] to-[#45b7d1] text-black font-bold text-sm hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed font-[family-name:var(--font-roobert)]"
            >
              {isSubmitting
                ? "Submitting..."
                : submitted && !submissionError
                  ? "Confirming..."
                  : !validation.valid
                    ? "Score Invalid"
                    : "Submit Score (Gas-Free)"}
            </button>
          )}

          {/* Retry button shown after an error */}
          {submissionError && !isSubmitting && (
            <button
              onClick={() => {
                setSubmitted(false);
                setSubmissionError(null);
              }}
              className="w-full h-12 rounded-full border border-red-500/30 text-red-400 text-sm hover:bg-red-500/10 active:bg-red-500/20 transition-colors font-[family-name:var(--font-roobert)]"
            >
              Try Again
            </button>
          )}

          {receipt && (
            <div className="text-center p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
              <p className="text-sm text-green-400 font-medium">
                Score submitted on-chain!
              </p>
              <a
                href={abscanTxUrl(receipt.transactionHash)}
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
            className="w-full h-12 rounded-full border border-white/20 text-white font-bold text-sm hover:bg-white/10 active:bg-white/15 active:scale-[0.98] transition-all font-[family-name:var(--font-roobert)]"
          >
            Play Again
          </button>

          <button
            onClick={() => router.push("/")}
            className="w-full h-12 text-white/50 text-sm hover:text-white/80 active:text-white transition-colors font-[family-name:var(--font-roobert)]"
          >
            Home
          </button>
        </div>

        {/* Keyboard shortcuts — hide on mobile since they don't apply */}
        <div className="hidden sm:flex justify-center gap-4 mt-3 text-[10px] text-white/20">
          <span>
            <kbd className="px-1 py-0.5 rounded bg-white/5 text-white/30 font-mono">
              R
            </kbd>{" "}
            Replay
          </span>
          <span>
            <kbd className="px-1 py-0.5 rounded bg-white/5 text-white/30 font-mono">
              Esc
            </kbd>{" "}
            Home
          </span>
        </div>
      </div>
    </div>
  );
}
