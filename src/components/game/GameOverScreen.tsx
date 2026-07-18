"use client";

import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { useWaitForTransactionReceipt } from "wagmi";
import type { BeatChart, FinalScore } from "@/lib/game/types";
import { GRADE_COLORS, MAX_SCORE } from "@/lib/game/constants";
import { useSessionScoreSubmit } from "@/hooks/useSessionScoreSubmit";
import { abscanTxUrl } from "@/lib/format";
import { publicClient, getLatestBlockNumber } from "@/lib/chain/blockData";
import { ABSTRACK_ABI, ABSTRACK_ADDRESS } from "@/lib/chain/scoreContract";
import { pickDailyChallengeBlock } from "@/lib/game/dailyChallenge";

interface GameOverScreenProps {
  finalScore: FinalScore;
  chart?: BeatChart;
  onPlayAgain: () => void;
  isAgentRun?: boolean;
}

const GRADE_GLOW: Record<string, string> = {
  S: "0 0 20px #ffd700, 0 0 40px #ffd700, 0 0 80px rgba(255,215,0,0.4)",
  A: "0 0 15px #3EB95F, 0 0 30px rgba(182,255,0,0.3)",
  B: "0 0 10px #73C98C, 0 0 20px rgba(148,216,45,0.2)",
  C: "0 0 10px rgba(168,130,255,0.4)",
  D: "0 0 10px rgba(255,107,107,0.3)",
};

const GRADE_COLORS_MAP: Record<string, string> = {
  S: "#ffd700",
  A: "#3EB95F",
  B: "#73C98C",
  C: "#a882ff",
  D: "#ff6b6b",
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

function parseSubmissionError(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err);

  if (message.includes("New score must be higher")) {
    return "You already have a higher score for this block. Only improvements are recorded on-chain.";
  }
  if (message.includes("Score exceeds maximum")) {
    return "Score exceeds the maximum allowed value (1,000,000).";
  }
  if (
    message.includes("policy violation") ||
    message.includes("Status: Unset")
  ) {
    return "Session expired. Please try again to create a new session.";
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
  if (
    message.includes("Failed to initialize request") ||
    message.includes("Request Arguments") ||
    message.includes("UserOperationExecutionError")
  ) {
    return "Transaction failed. Please try again.";
  }
  if (/0x[a-fA-F0-9]{8,}/.test(message)) {
    return "Transaction failed. Please try again.";
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
  chart,
  onPlayAgain,
  isAgentRun = false,
}: GameOverScreenProps) {
  const router = useRouter();
  const { address } = useAccount();
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [canShareDaily, setCanShareDaily] = useState(false);
  const [dailyLeadText, setDailyLeadText] = useState<string | null>(null);
  const [personalBest, setPersonalBest] = useState<{
    score: number;
    isNew: boolean;
  } | null>(null);
  const autoShareAttemptedRef = useRef(false);

  const {
    submitScore,
    status: sessionStatus,
    txHash,
    reset: resetSession,
  } = useSessionScoreSubmit();

  const { data: receipt } = useWaitForTransactionReceipt({
    hash: txHash ?? undefined,
  });

  const isBusy =
    sessionStatus === "submitting" ||
    (txHash != null && !receipt);

  const shareDailyLead = useCallback(async () => {
    if (!dailyLeadText) return;
    const url = typeof window !== "undefined" ? window.location.origin : "https://abstrack.live";
    try {
      if (navigator.share) {
        await navigator.share({ text: dailyLeadText, url });
      } else {
        await navigator.clipboard.writeText(`${dailyLeadText} ${url}`);
      }
    } catch {
      // no-op
    }
  }, [dailyLeadText]);

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

  useEffect(() => {
    if (isAgentRun || !receipt || autoShareAttemptedRef.current) return;

    const checkDailyLeadAndShare = async () => {
      try {
        const latest = await getLatestBlockNumber();
        const dailyBlock = pickDailyChallengeBlock(latest);
        if (dailyBlock !== BigInt(finalScore.blockNumber)) return;

        const result = await publicClient.readContract({
          address: ABSTRACK_ADDRESS,
          abi: ABSTRACK_ABI,
          functionName: "getBlockScores",
          args: [dailyBlock],
        });

        const entries = [...(result as unknown as Array<{ player: string; score: bigint }>)
        ].sort((a, b) => Number(b.score - a.score));

        const top = entries[0];
        if (!top) return;
        const isLead = Number(top.score) <= finalScore.totalScore;
        if (!isLead) return;

        const leadText = `I just hit #1 on today’s ABSTRACK challenge (#${finalScore.blockNumber}) with ${finalScore.totalScore.toLocaleString()} points. Catch me if you can.`;
        setDailyLeadText(leadText);
        setCanShareDaily(true);

        autoShareAttemptedRef.current = true;
        if (navigator.share) {
          await navigator.share({
            text: leadText,
            url: typeof window !== "undefined" ? window.location.origin : "https://abstrack.live",
          });
        }
      } catch {
        // no-op
      }
    };

    checkDailyLeadAndShare();
  }, [receipt, finalScore.blockNumber, finalScore.totalScore, isAgentRun]);

  useEffect(() => {
    if (isAgentRun || typeof window === "undefined") return;

    const key = `abstrack-local-best:${finalScore.blockNumber}`;
    const stored = Number.parseInt(localStorage.getItem(key) ?? "", 10);
    const previous = Number.isFinite(stored) ? stored : null;
    const isNew = previous === null || finalScore.totalScore > previous;
    const best = isNew ? finalScore.totalScore : previous;

    if (isNew) {
      localStorage.setItem(key, String(finalScore.totalScore));
    }
    setPersonalBest({ score: best, isNew });
  }, [finalScore.blockNumber, finalScore.totalScore, isAgentRun]);

  const validation = useMemo(
    () => validateScore(finalScore.totalScore, finalScore.blockNumber),
    [finalScore.totalScore, finalScore.blockNumber]
  );

  const displayError = useMemo(() => {
    if (!validation.valid) return validation.error;
    if (submissionError) return submissionError;
    return null;
  }, [validation, submissionError]);

  const handleSubmitScore = async () => {
    if (isAgentRun || !address) return;
    if (!validation.valid) return;

    setSubmissionError(null);

    try {
      await submitScore(
        BigInt(finalScore.blockNumber),
        BigInt(finalScore.totalScore),
      );
    } catch (err) {
      setSubmissionError(parseSubmissionError(err));
    }
  };

  const accuracy = (finalScore.accuracy * 100).toFixed(1);
  const gradeColor = GRADE_COLORS_MAP[finalScore.letterGrade] ?? "#fff";
  const gradeGlow = GRADE_GLOW[finalScore.letterGrade] ?? "";
  const includedPackets =
    finalScore.gradeCounts.perfect +
    finalScore.gradeCounts.great +
    finalScore.gradeCounts.good;
  const filledCells = Math.round(finalScore.accuracy * 32);

  return (
    <div className="flex min-h-dvh flex-col items-center overflow-y-auto bg-[#020503] text-white safe-all">
      <div className="absolute inset-0 crt-scanlines z-10 pointer-events-none" />

      <div className="relative z-20 mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-4 py-6 sm:py-10">
        <div className="mb-4 flex items-center justify-between border-b border-[#3EB95F]/16 pb-3">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#3EB95F] shadow-[0_0_10px_rgba(62,185,95,0.7)]" />
            <p className="text-[9px] uppercase tracking-[0.26em] text-[#A0E7AB]/58 font-[family-name:var(--font-avenue-mono)]">
              Block processing complete
            </p>
          </div>
          <p className="text-[9px] text-white/28 font-[family-name:var(--font-avenue-mono)]">
            ABSTRACT / #{finalScore.blockNumber}
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-[1.05fr_0.95fr]">
          <section className="block-surface p-5 sm:p-6">
            <div className="flex items-start justify-between gap-5">
              <div>
                <p className="text-[9px] uppercase tracking-[0.2em] text-white/30 font-[family-name:var(--font-avenue-mono)]">
                  Finalized candidate
                </p>
                <h1 className="mt-2 text-3xl font-black font-[family-name:var(--font-roobert)]">
                  Block sealed.
                </h1>
                <p className="mt-2 text-xs text-white/36 font-[family-name:var(--font-avenue-mono)]">
                  {includedPackets}/{finalScore.totalNotes} packets included
                </p>
              </div>
              <div className="text-center">
                <p className="text-[8px] uppercase tracking-[0.18em] text-white/25 font-[family-name:var(--font-avenue-mono)]">
                  Rank
                </p>
                <p
                  className="text-6xl font-black leading-none font-[family-name:var(--font-roobert)]"
                  style={{ color: gradeColor, textShadow: gradeGlow }}
                >
                  {finalScore.letterGrade}
                </p>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-8 gap-1 rounded-md border border-white/8 bg-black/40 p-3">
              {Array.from({ length: 32 }, (_, i) => {
                const colors = ["#2f7f6a", "#3EB95F", "#f2c94c", "#ff6b5f"];
                const color = colors[(i + finalScore.blockNumber) % colors.length];
                return (
                  <span
                    key={i}
                    className="h-4 rounded-[2px] border"
                    style={{
                      borderColor:
                        i < filledCells ? `${color}99` : "rgba(255,255,255,0.07)",
                      background:
                        i < filledCells ? `${color}88` : "rgba(255,255,255,0.025)",
                      boxShadow:
                        i < filledCells ? `0 0 8px ${color}18` : undefined,
                    }}
                  />
                );
              })}
            </div>

            <div className="mt-4 grid grid-cols-3 gap-px overflow-hidden rounded-md border border-white/8 bg-white/8">
              {[
                { label: "Inclusion", value: `${accuracy}%` },
                { label: "Peak flow", value: finalScore.maxCombo.toString() },
                {
                  label: "Source tx",
                  value: (chart?.transactionCount ?? finalScore.totalNotes).toLocaleString(),
                },
              ].map((item) => (
                <div key={item.label} className="bg-[#050b08] px-2 py-3 text-center">
                  <p className="text-[8px] uppercase tracking-wider text-white/25 font-[family-name:var(--font-avenue-mono)]">
                    {item.label}
                  </p>
                  <p className="mt-1 text-sm font-bold text-white/76 font-[family-name:var(--font-avenue-mono)]">
                    {item.value}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-4 space-y-1 border-t border-white/8 pt-3 text-[9px] font-[family-name:var(--font-avenue-mono)]">
              <div className="flex justify-between gap-3">
                <span className="uppercase tracking-wider text-white/24">Block hash</span>
                <span className="truncate text-white/42">
                  {chart
                    ? `${chart.blockHash.slice(0, 12)}…${chart.blockHash.slice(-8)}`
                    : "source verified"}
                </span>
              </div>
              {chart && (
                <div className="flex justify-between gap-3">
                  <span className="uppercase tracking-wider text-white/24">Gas processed</span>
                  <span className="text-white/42">
                    {(chart.gasUsed / 1e6).toFixed(2)}M
                  </span>
                </div>
              )}
            </div>
          </section>

          <section className="block-surface flex flex-col p-5 sm:p-6">
            <div>
              <p className="text-[9px] uppercase tracking-[0.2em] text-white/30 font-[family-name:var(--font-avenue-mono)]">
                Sequencer score
              </p>
              <p className="mt-2 text-3xl sm:text-4xl font-bold tabular-nums font-[family-name:var(--font-avenue-mono)]">
                {finalScore.totalScore.toLocaleString()}
              </p>
              <p className="mt-1 text-[9px] text-white/24 font-[family-name:var(--font-avenue-mono)]">
                / {MAX_SCORE.toLocaleString()} MAX EFFICIENCY
              </p>
              {personalBest && (
                <p
                  className={`mt-2 text-[9px] uppercase tracking-[0.18em] font-[family-name:var(--font-avenue-mono)] ${
                    personalBest.isNew ? "text-[#A0E7AB]" : "text-white/28"
                  }`}
                >
                  {personalBest.isNew
                    ? "New personal best"
                    : `Personal best ${personalBest.score.toLocaleString()}`}
                </p>
              )}
            </div>

            <div className="my-5 grid grid-cols-4 gap-1.5">
              {(
                [
                  ["perfect", "sealed"],
                  ["great", "valid"],
                  ["good", "late"],
                  ["miss", "returned"],
                ] as const
              ).map(([grade, label]) => (
                <div
                  key={grade}
                  className="rounded-[4px] border px-1 py-2 text-center"
                  style={{
                    borderColor: GRADE_COLORS[grade] + "22",
                    background: GRADE_COLORS[grade] + "07",
                  }}
                >
                  <p
                    className="text-[7px] font-bold uppercase font-[family-name:var(--font-avenue-mono)]"
                    style={{ color: GRADE_COLORS[grade] }}
                  >
                    {label}
                  </p>
                  <p className="mt-1 text-base font-bold font-[family-name:var(--font-avenue-mono)]">
                    {finalScore.gradeCounts[grade]}
                  </p>
                </div>
              ))}
            </div>

            {displayError && (
              <div className="mb-3 rounded-md border border-red-500/20 bg-red-500/8 p-3">
                <p className="text-xs text-red-400">{displayError}</p>
              </div>
            )}

            <div className="mt-auto flex flex-col gap-2.5">
              {address && !isAgentRun && !receipt && (
                <button
                  onClick={handleSubmitScore}
                  disabled={isBusy || !validation.valid}
                  className="processing-btn h-12 w-full rounded-md bg-[#A0E7AB] text-sm font-bold text-[#031006] transition-all hover:bg-[#b9f2c2] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-45 font-[family-name:var(--font-roobert)]"
                >
                  {sessionStatus === "submitting"
                    ? "Publishing score..."
                    : txHash && !receipt
                      ? "Confirming..."
                      : !validation.valid
                        ? "Score invalid"
                        : "Publish score · gas-free"}
                </button>
              )}

              {isAgentRun && (
                <div className="w-full rounded-md border border-[#73C98C]/18 bg-[#73C98C]/5 px-3 py-2 text-center">
                  <p className="text-[9px] uppercase tracking-[0.16em] text-[#A0E7AB]/60 font-[family-name:var(--font-avenue-mono)]">
                    Autonomous run · not leaderboard eligible
                  </p>
                </div>
              )}

              {submissionError && !isBusy && (
                <button
                  onClick={() => {
                    resetSession();
                    setSubmissionError(null);
                  }}
                  className="h-11 w-full rounded-md border border-red-500/25 text-sm text-red-400 hover:bg-red-500/8 font-[family-name:var(--font-roobert)]"
                >
                  Retry publication
                </button>
              )}

              {receipt && (
                <div className="rounded-md border border-[#3EB95F]/20 bg-[#3EB95F]/5 p-3 text-center">
                  <p className="text-sm font-medium text-[#A0E7AB] font-[family-name:var(--font-roobert)]">
                    Score published onchain
                  </p>
                  <a
                    href={abscanTxUrl(receipt.transactionHash)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] text-[#73C98C]/70 underline hover:text-[#73C98C] font-[family-name:var(--font-avenue-mono)]"
                  >
                    View receipt on Abscan
                  </a>
                  {canShareDaily && (
                    <button
                      onClick={shareDailyLead}
                      className="mt-3 h-10 w-full rounded-md border border-[#3EB95F]/30 text-[10px] uppercase tracking-wider text-[#3EB95F] hover:bg-[#3EB95F]/10"
                    >
                      Share #1 daily run
                    </button>
                  )}
                </div>
              )}

              <button
                onClick={onPlayAgain}
                className="h-12 w-full rounded-md border border-[#3EB95F]/25 text-sm font-bold text-[#A0E7AB]/80 transition-all hover:border-[#3EB95F]/40 hover:bg-[#3EB95F]/6 active:scale-[0.99] font-[family-name:var(--font-roobert)]"
              >
                Rebuild this block
              </button>

              <button
                onClick={() => router.push("/")}
                className="h-10 w-full text-sm text-white/36 transition-colors hover:text-white/65 font-[family-name:var(--font-roobert)]"
              >
                Return to block explorer
              </button>
            </div>
          </section>
        </div>

        <div className="mt-3 hidden justify-center gap-4 text-[9px] text-white/18 sm:flex font-[family-name:var(--font-avenue-mono)]">
          <span><kbd>R</kbd> rebuild</span>
          <span><kbd>Esc</kbd> explorer</span>
        </div>
      </div>
    </div>
  );
}
