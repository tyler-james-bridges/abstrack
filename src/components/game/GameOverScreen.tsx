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

const GRADE_GLOW: Record<string, string> = {
  S: "0 0 20px #ffd700, 0 0 40px #ffd700, 0 0 80px rgba(255,215,0,0.4)",
  A: "0 0 15px #4ecdc4, 0 0 30px rgba(78,205,196,0.3)",
  B: "0 0 10px #45b7d1, 0 0 20px rgba(69,183,209,0.2)",
  C: "0 0 10px rgba(168,130,255,0.4)",
  D: "0 0 10px rgba(255,107,107,0.3)",
};

const GRADE_COLORS_MAP: Record<string, string> = {
  S: "#ffd700",
  A: "#4ecdc4",
  B: "#45b7d1",
  C: "#a882ff",
  D: "#ff6b6b",
};

// ---------------------------------------------------------------------------
// Confetti particles for S and A grades
// ---------------------------------------------------------------------------

const CONFETTI_COLORS = ["#ffd700", "#4ecdc4", "#45b7d1", "#ff6b6b", "#f9ca24", "#a882ff"];

function CelebrationConfetti({ grade }: { grade: string }) {
  if (grade !== "S" && grade !== "A") return null;

  const particles = useMemo(() => {
    return Array.from({ length: 40 }, (_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      delay: `${Math.random() * 1.5}s`,
      duration: `${1.5 + Math.random() * 2}s`,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      size: 4 + Math.random() * 6,
      rotation: Math.random() * 360,
    }));
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-30">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute top-0"
          style={{
            left: p.left,
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            borderRadius: Math.random() > 0.5 ? "50%" : "1px",
            animation: `confetti-fall ${p.duration} ease-in ${p.delay} both`,
            transform: `rotate(${p.rotation}deg)`,
          }}
        />
      ))}
    </div>
  );
}

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

function parseSubmissionError(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err);

  if (message.includes("New score must be higher")) {
    return "You already have a higher score for this block. Only improvements are recorded on-chain.";
  }
  if (message.includes("Score exceeds maximum")) {
    return "Score exceeds the maximum allowed value (1,000,000).";
  }
  if (
    message.includes("rejected") ||
    message.includes("denied") ||
    message.includes("User rejected")
  ) {
    return "Transaction was rejected. You can try again.";
  }
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

  const validation = useMemo(
    () => validateScore(finalScore.totalScore, finalScore.blockNumber),
    [finalScore.totalScore, finalScore.blockNumber]
  );

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
  const gradeColor = GRADE_COLORS_MAP[finalScore.letterGrade] ?? "#fff";
  const gradeGlow = GRADE_GLOW[finalScore.letterGrade] ?? "";
  const isHighGrade = finalScore.letterGrade === "S" || finalScore.letterGrade === "A";

  return (
    <div className="flex flex-col items-center min-h-dvh bg-black text-white overflow-y-auto safe-all">
      {/* CRT scanline overlay */}
      <div className="absolute inset-0 crt-scanlines z-10 pointer-events-none" />

      {/* Celebration confetti for S/A grades */}
      <CelebrationConfetti grade={finalScore.letterGrade} />

      <div className="w-full max-w-md mx-auto px-4 py-6 sm:py-10 flex flex-col items-center justify-center flex-1 relative z-20">
        {/* Letter Grade — dramatic neon display */}
        <div className="w-full text-center mb-5 sm:mb-8 py-8 sm:py-10 relative animate-score-pop">
          {/* Background glow */}
          <div
            className="absolute inset-0 rounded-2xl"
            style={{
              background: `radial-gradient(ellipse 80% 60% at 50% 50%, ${gradeColor}10, transparent 70%)`,
              border: `1px solid ${gradeColor}20`,
            }}
          />
          {/* Extra glow ring for S rank */}
          {finalScore.letterGrade === "S" && (
            <div
              className="absolute inset-[-4px] rounded-2xl animate-pulse-ring"
              style={{
                border: `1px solid ${gradeColor}30`,
              }}
            />
          )}
          <p className="relative text-[10px] sm:text-xs text-white/40 uppercase tracking-[0.3em] mb-2 font-[family-name:var(--font-avenue-mono)]">
            Rank
          </p>
          <p
            className={`relative text-7xl sm:text-9xl font-black font-[family-name:var(--font-roobert)] ${isHighGrade ? "text-shimmer" : ""}`}
            style={{
              color: isHighGrade ? undefined : gradeColor,
              textShadow: isHighGrade ? undefined : gradeGlow,
              WebkitTextFillColor: isHighGrade ? undefined : gradeColor,
            }}
          >
            {finalScore.letterGrade}
          </p>
        </div>

        {/* Score — big monospace number */}
        <div className="text-center mb-4 sm:mb-6 animate-fade-in-up stagger-1">
          <p
            className="text-3xl sm:text-4xl font-bold font-[family-name:var(--font-avenue-mono)] tabular-nums"
            style={{
              textShadow: "0 0 15px rgba(78,205,196,0.3)",
            }}
          >
            {finalScore.totalScore.toLocaleString()}
          </p>
          <p className="text-[10px] sm:text-xs text-white/30 mt-1 font-[family-name:var(--font-avenue-mono)]">
            / {MAX_SCORE.toLocaleString()}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="w-full grid grid-cols-2 gap-2 sm:gap-3 mb-4 sm:mb-6 animate-fade-in-up stagger-2">
          <div className="retro-card p-3 text-center">
            <p className="text-[10px] sm:text-xs text-white/30 uppercase font-[family-name:var(--font-avenue-mono)] tracking-wider">
              Max Combo
            </p>
            <p className="text-lg sm:text-xl font-bold font-[family-name:var(--font-avenue-mono)]">
              {finalScore.maxCombo}
            </p>
          </div>
          <div className="retro-card p-3 text-center">
            <p className="text-[10px] sm:text-xs text-white/30 uppercase font-[family-name:var(--font-avenue-mono)] tracking-wider">
              Accuracy
            </p>
            <p className="text-lg sm:text-xl font-bold font-[family-name:var(--font-avenue-mono)]">
              {accuracy}%
            </p>
          </div>
        </div>

        {/* Grade Breakdown */}
        <div className="w-full grid grid-cols-4 gap-1.5 sm:gap-2 mb-5 sm:mb-8 animate-fade-in-up stagger-3">
          {(["perfect", "great", "good", "miss"] as const).map((grade) => (
            <div
              key={grade}
              className="text-center rounded-xl p-2.5 border"
              style={{
                borderColor: GRADE_COLORS[grade] + "20",
                background: GRADE_COLORS[grade] + "08",
              }}
            >
              <p
                className="text-[10px] sm:text-xs font-bold uppercase font-[family-name:var(--font-avenue-mono)]"
                style={{ color: GRADE_COLORS[grade] }}
              >
                {grade}
              </p>
              <p className="text-base sm:text-lg font-bold font-[family-name:var(--font-avenue-mono)]">
                {finalScore.gradeCounts[grade]}
              </p>
            </div>
          ))}
        </div>

        {/* Block info */}
        <p className="text-center text-[10px] text-white/25 mb-4 sm:mb-6 font-[family-name:var(--font-avenue-mono)] tracking-wider animate-fade-in-up stagger-4">
          Block #{finalScore.blockNumber} | {finalScore.totalNotes} notes
        </p>

        {/* Error display */}
        {displayError && (
          <div className="w-full mb-3 sm:mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
            <p className="text-sm text-red-400">{displayError}</p>
          </div>
        )}

        {/* Actions */}
        <div className="w-full flex flex-col gap-3 animate-fade-in-up stagger-4">
          {address && !receipt && (
            <button
              onClick={handleSubmitScore}
              disabled={isSubmitting || submitted || !validation.valid}
              className="neon-btn w-full h-12 sm:h-14 rounded-full bg-gradient-to-r from-[#4ecdc4] to-[#45b7d1] text-black font-bold text-sm hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed font-[family-name:var(--font-roobert)] flex items-center justify-center gap-2"
              style={{
                boxShadow: "0 0 20px rgba(78,205,196,0.2)",
              }}
            >
              {isSubmitting ? (
                <>
                  <span className="inline-block w-4 h-4 border-2 border-black/20 border-t-black/60 rounded-full animate-spin" />
                  Submitting...
                </>
              ) : submitted && !submissionError ? (
                <>
                  <span className="inline-block w-4 h-4 border-2 border-black/20 border-t-black/60 rounded-full animate-spin" />
                  Confirming...
                </>
              ) : !validation.valid ? (
                "Score Invalid"
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                  Submit Score (Gas-Free)
                </>
              )}
            </button>
          )}

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
            <div
              className="text-center p-4 rounded-xl border animate-fade-in-up"
              style={{
                background: "rgba(78,205,196,0.05)",
                borderColor: "rgba(78,205,196,0.2)",
              }}
            >
              <div className="flex items-center justify-center gap-2 mb-1">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4ecdc4" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <p className="text-sm text-[#4ecdc4] font-medium font-[family-name:var(--font-roobert)]">
                  Score submitted on-chain!
                </p>
              </div>
              <a
                href={abscanTxUrl(receipt.transactionHash)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-[#45b7d1]/70 hover:text-[#45b7d1] underline font-[family-name:var(--font-avenue-mono)]"
              >
                View on Abscan
              </a>
            </div>
          )}

          <button
            onClick={onPlayAgain}
            className="neon-btn w-full h-12 rounded-full border border-[#4ecdc4]/20 text-[#4ecdc4]/80 font-bold text-sm hover:bg-[#4ecdc4]/5 hover:border-[#4ecdc4]/30 active:scale-[0.98] transition-all font-[family-name:var(--font-roobert)] flex items-center justify-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
            Play Again
          </button>

          <button
            onClick={() => router.push("/")}
            className="w-full h-12 text-white/40 text-sm hover:text-white/70 active:text-white transition-colors font-[family-name:var(--font-roobert)] flex items-center justify-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            Home
          </button>
        </div>

        {/* Keyboard shortcuts */}
        <div className="hidden sm:flex justify-center gap-4 mt-3 text-[10px] text-white/20 font-[family-name:var(--font-avenue-mono)]">
          <span>
            <kbd className="px-1.5 py-0.5 rounded bg-white/5 text-white/30 border border-white/10">
              R
            </kbd>{" "}
            Replay
          </span>
          <span>
            <kbd className="px-1.5 py-0.5 rounded bg-white/5 text-white/30 border border-white/10">
              Esc
            </kbd>{" "}
            Home
          </span>
        </div>
      </div>
    </div>
  );
}
