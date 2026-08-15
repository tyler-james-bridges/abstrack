"use client";

import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { useWaitForTransactionReceipt } from "wagmi";
import type { BeatChart, FinalScore } from "@/lib/game/types";
import { MAX_SCORE } from "@/lib/game/constants";
import { useSessionScoreSubmit } from "@/hooks/useSessionScoreSubmit";
import { abscanTxUrl, truncateAddress } from "@/lib/format";
import { getLatestBlockNumber } from "@/lib/chain/blockData";
import { getBlockTopScore, type BlockTopScore } from "@/lib/chain/holder";
import { pickDailyChallengeBlock } from "@/lib/game/dailyChallenge";
import {
  buildFingerprint,
  paintFingerprint,
  furthestPainted,
  FINGERPRINT_VERSION,
} from "@/lib/game/fingerprint";
import { recordFingerprintProgress } from "@/lib/game/fingerprintProgress";
import { Fingerprint } from "@/components/ui/Fingerprint";

interface GameOverScreenProps {
  finalScore: FinalScore;
  chart?: BeatChart;
  onPlayAgain: () => void;
  isAgentRun?: boolean;
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
  const [topScore, setTopScore] = useState<BlockTopScore | null | undefined>(undefined);
  const autoShareAttemptedRef = useRef(false);
  const progressRecordedRef = useRef(false);

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

  const paintedFingerprint = useMemo(() => {
    if (!chart) return null;
    const base = buildFingerprint(chart);
    return paintFingerprint(base, chart.notes, chart.duration);
  }, [chart]);

  const diedAtColumn = paintedFingerprint ? furthestPainted(paintedFingerprint) : -1;

  useEffect(() => {
    if (!paintedFingerprint || progressRecordedRef.current) return;
    progressRecordedRef.current = true;
    recordFingerprintProgress(
      finalScore.blockNumber,
      paintedFingerprint.columns,
      diedAtColumn,
      paintedFingerprint.progress
    );
  }, [paintedFingerprint, diedAtColumn, finalScore.blockNumber]);

  useEffect(() => {
    let active = true;
    getBlockTopScore(BigInt(finalScore.blockNumber))
      .then((top) => active && setTopScore(top))
      .catch(() => active && setTopScore(null));
    return () => {
      active = false;
    };
  }, [finalScore.blockNumber]);

  const shareUrl = useMemo(() => {
    if (typeof window === "undefined") return null;
    const params = new URLSearchParams({
      score: String(finalScore.totalScore),
      acc: finalScore.accuracy.toFixed(3),
      grade: finalScore.letterGrade,
      combo: String(finalScore.maxCombo),
      v: String(FINGERPRINT_VERSION),
    });
    if (address) params.set("by", address);
    return `${window.location.origin}/api/og/run/${finalScore.blockNumber}?${params.toString()}`;
  }, [finalScore, address]);

  const handleShareCard = useCallback(async () => {
    if (!shareUrl) return;
    const text = `I just processed block #${finalScore.blockNumber} on ABSTRACK — ${finalScore.totalScore.toLocaleString()} points, grade ${finalScore.letterGrade}.`;
    try {
      if (navigator.share) {
        await navigator.share({ text, url: shareUrl });
      } else {
        await navigator.clipboard.writeText(`${text} ${shareUrl}`);
      }
    } catch {
      // no-op
    }
  }, [shareUrl, finalScore]);

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

        const top = await getBlockTopScore(dailyBlock);
        if (!top) return;
        const isLead = Number(top.score) <= finalScore.totalScore;
        if (!isLead) return;

        const leadText = `I just hit #1 on today's ABSTRACK challenge (#${finalScore.blockNumber}) with ${finalScore.totalScore.toLocaleString()} points. Catch me if you can.`;
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
  const isHolder =
    !!address && !!topScore && topScore.player.toLowerCase() === address.toLowerCase();

  // "Top submitted score", not "holder" — submitScore takes an unproven
  // number and there's no replay verification yet (HANDOFF §6).
  const holderLine = (() => {
    if (topScore === undefined) return null;
    if (!topScore) return "First submitted score for this block.";
    if (isHolder) return "You already have the top submitted score here.";
    const diff = finalScore.totalScore - Number(topScore.score);
    if (diff > 0) {
      return `Beats the top submitted score (${truncateAddress(topScore.player)}) by ${diff.toLocaleString()}.`;
    }
    return `${truncateAddress(topScore.player)} still has the top submitted score, by ${Math.abs(diff).toLocaleString()}.`;
  })();

  return (
    <div className="flex min-h-dvh flex-col items-center overflow-y-auto bg-[var(--background)] text-[var(--foreground)] safe-all">
      <div className="relative z-20 mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center px-4 py-6 sm:py-10">
        <div className="mb-4 flex items-center justify-between border-b border-[var(--abstrack-line)] pb-3">
          <p className="text-[9px] uppercase tracking-[0.26em] text-[var(--abstrack-dim)] font-[family-name:var(--font-avenue-mono)]">
            Run complete
          </p>
          <p className="text-[9px] text-[var(--abstrack-faint)] font-[family-name:var(--font-avenue-mono)]">
            #{finalScore.blockNumber}
          </p>
        </div>

        <h1 className="text-5xl font-black tracking-[-0.045em] font-[family-name:var(--font-avenue-mono)]">
          {finalScore.blockNumber}
        </h1>

        <div className="mt-4 rounded-md border border-[var(--abstrack-line)] bg-[var(--abstrack-panel)] p-3">
          <Fingerprint
            fingerprint={paintedFingerprint}
            height={140}
            gap={2}
            ghostUnpainted
            playheadColumn={diedAtColumn}
          />
        </div>

        <div className="mt-4 grid grid-cols-3 gap-px overflow-hidden rounded-md border border-[var(--abstrack-line)] bg-[var(--abstrack-line)]">
          {[
            { label: "Score", value: finalScore.totalScore.toLocaleString() },
            { label: "Accuracy", value: `${accuracy}%` },
            { label: "Grade", value: finalScore.letterGrade },
          ].map((item) => (
            <div key={item.label} className="bg-[var(--abstrack-panel)] px-2 py-3 text-center">
              <p className="text-[8px] uppercase tracking-wider text-[var(--abstrack-faint)] font-[family-name:var(--font-avenue-mono)]">
                {item.label}
              </p>
              <p className="mt-1 text-lg font-bold text-[var(--foreground)] font-[family-name:var(--font-avenue-mono)]">
                {item.value}
              </p>
            </div>
          ))}
        </div>

        {holderLine && (
          <p className="mt-3 text-center text-[10px] uppercase tracking-[0.12em] text-[var(--abstrack-dim)] font-[family-name:var(--font-avenue-mono)]">
            {holderLine}
          </p>
        )}

        {displayError && (
          <div
            className="mt-3 rounded-md border p-3"
            style={{
              borderColor: "var(--abstrack-miss)",
              background: "rgba(226,90,73,0.08)",
            }}
          >
            <p className="text-xs" style={{ color: "var(--abstrack-miss)" }}>
              {displayError}
            </p>
          </div>
        )}

        <div className="mt-5 flex flex-col gap-2.5">
          {address && !isAgentRun && !receipt && (
            <button
              onClick={handleSubmitScore}
              disabled={isBusy || !validation.valid}
              className="processing-btn h-12 w-full rounded-md bg-[var(--abstrack-lane-2)] text-sm font-bold text-black transition-all hover:brightness-110 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-45 font-[family-name:var(--font-roobert)]"
            >
              {sessionStatus === "submitting"
                ? "Publishing run..."
                : txHash && !receipt
                  ? "Confirming..."
                  : !validation.valid
                    ? "Score invalid"
                    : "Publish run · gas-free"}
            </button>
          )}

          {isAgentRun && (
            <div className="w-full rounded-md border border-[var(--abstrack-line)] px-3 py-2 text-center">
              <p className="text-[9px] uppercase tracking-[0.16em] text-[var(--abstrack-dim)] font-[family-name:var(--font-avenue-mono)]">
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
              className="h-11 w-full rounded-md border font-[family-name:var(--font-roobert)] text-sm"
              style={{ borderColor: "var(--abstrack-miss)", color: "var(--abstrack-miss)" }}
            >
              Retry publication
            </button>
          )}

          {receipt && (
            <div className="rounded-md border border-[var(--abstrack-line)] p-3 text-center">
              <p className="text-sm font-medium text-[var(--foreground)] font-[family-name:var(--font-roobert)]">
                Run published onchain
              </p>
              <a
                href={abscanTxUrl(receipt.transactionHash)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] text-[var(--abstrack-dim)] underline hover:text-[var(--foreground)] font-[family-name:var(--font-avenue-mono)]"
              >
                View receipt on Abscan
              </a>
              {canShareDaily && (
                <button
                  onClick={shareDailyLead}
                  className="mt-3 h-10 w-full rounded-md border border-[var(--abstrack-lane-2)]/40 text-[10px] uppercase tracking-wider text-[var(--abstrack-lane-2)] hover:bg-[var(--abstrack-lane-2)]/10"
                >
                  Share #1 daily run
                </button>
              )}
            </div>
          )}

          <button
            onClick={handleShareCard}
            className="h-11 w-full rounded-md border border-[var(--abstrack-line)] text-sm text-[var(--abstrack-dim)] transition-all hover:border-[var(--abstrack-rule)] hover:text-[var(--foreground)] font-[family-name:var(--font-roobert)]"
          >
            Share card
          </button>

          <button
            onClick={onPlayAgain}
            className="h-12 w-full rounded-md border border-[var(--abstrack-line)] text-sm font-bold text-[var(--abstrack-dim)] transition-all hover:border-[var(--abstrack-rule)] hover:text-[var(--foreground)] active:scale-[0.99] font-[family-name:var(--font-roobert)]"
          >
            Retry
          </button>

          <button
            onClick={() => router.push("/")}
            className="h-10 w-full text-sm text-[var(--abstrack-faint)] transition-colors hover:text-[var(--abstrack-dim)] font-[family-name:var(--font-roobert)]"
          >
            Return to the instrument
          </button>
        </div>

        <div className="mt-3 hidden justify-center gap-4 text-[9px] text-[var(--abstrack-faint)] sm:flex font-[family-name:var(--font-avenue-mono)]">
          <span><kbd>R</kbd> retry</span>
          <span><kbd>Esc</kbd> instrument</span>
        </div>
      </div>
    </div>
  );
}
