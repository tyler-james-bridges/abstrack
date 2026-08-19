"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  getBlockForGame,
  getLatestBlockNumber,
  type BlockData,
} from "@/lib/chain/blockData";
import { generateBeatChart } from "@/lib/game/BlockBeatGenerator";
import {
  buildFingerprint,
  type Fingerprint as FingerprintData,
} from "@/lib/game/fingerprint";
import { getStoredFingerprintProgress } from "@/lib/game/fingerprintProgress";
import { getBlockTopScore, type BlockTopScore } from "@/lib/chain/holder";
import { Fingerprint } from "@/components/ui/Fingerprint";
import { RecentBlocks } from "@/components/home/RecentBlocks";
import { BlockPicker } from "@/components/home/BlockPicker";
import { DailyChallengeCard } from "@/components/home/DailyChallengeCard";
import { DailyLeaderboard } from "@/components/home/DailyLeaderboard";
import { ContractLink } from "@/components/home/ContractLink";
import { estimateDifficulty, truncateAddress } from "@/lib/format";
import { LANE_LABELS, LANE_NAMES, LANE_COLORS } from "@/lib/game/constants";

interface Candidate {
  block: BlockData;
  fingerprint: FingerprintData;
  bpm: number;
  duration: number;
  noteCount: number;
}

export default function Home() {
  const router = useRouter();
  const [blockNumber, setBlockNumber] = useState<bigint | null>(null);
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [ghostColumn, setGhostColumn] = useState<number | null>(null);
  const [topScore, setTopScore] = useState<BlockTopScore | null | undefined>(
    undefined
  );

  // Default candidate: latest confirmed block.
  useEffect(() => {
    let active = true;
    getLatestBlockNumber()
      .then((latest) => active && setBlockNumber(latest))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const loadCandidate = useCallback(async (num: bigint) => {
    setCandidate(null);
    setTopScore(undefined);
    try {
      const block = await getBlockForGame(num);
      const chart = generateBeatChart(block);
      const fingerprint = buildFingerprint(chart);
      setCandidate({
        block,
        fingerprint,
        bpm: chart.bpm,
        duration: chart.duration,
        noteCount: chart.notes.length,
      });

      const stored = getStoredFingerprintProgress(Number(num));
      setGhostColumn(stored ? stored.furthestColumn : null);
    } catch {
      setCandidate(null);
    }

    try {
      const top = await getBlockTopScore(num);
      setTopScore(top);
    } catch {
      setTopScore(null);
    }
  }, []);

  useEffect(() => {
    if (blockNumber !== null) loadCandidate(blockNumber);
  }, [blockNumber, loadCandidate]);

  const handleSelect = (num: bigint) => setBlockNumber(num);

  const difficulty = candidate
    ? estimateDifficulty(candidate.block.gasUsed, candidate.block.transactions.length)
    : null;

  const playedColumns = ghostColumn !== null ? ghostColumn + 1 : 0;
  const unpaintedColumns = candidate
    ? candidate.fingerprint.columns - playedColumns
    : 0;

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <main className="mx-auto w-full max-w-6xl px-4 pb-10 pt-24 safe-x safe-bottom sm:pt-20">
        {/* Top rail */}
        <header className="mb-8 flex flex-col gap-4 border-b border-[var(--abstrack-line)] pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <p className="shrink-0 text-sm font-black tracking-[-0.03em] font-[family-name:var(--font-roobert)]">
              ABSTRACK
            </p>
            <RecentBlocks />
          </div>
          <p className="shrink-0 text-[8px] uppercase tracking-[0.2em] text-[var(--abstrack-faint)] font-[family-name:var(--font-avenue-mono)]">
            8 recent blocks &middot; live
          </p>
        </header>

        {/* Instrument body */}
        <div className="grid gap-6 lg:grid-cols-[190px_1fr_260px]">
          {/* Specs rail */}
          <aside className="order-2 flex flex-col gap-4 lg:order-1">
            {[
              { label: "TEMPO", value: candidate ? `${candidate.bpm} BPM` : "—" },
              {
                label: "PACKETS",
                value: candidate ? candidate.noteCount.toLocaleString() : "—",
              },
              {
                label: "GAS",
                value: candidate
                  ? `${(Number(candidate.block.gasUsed) / 1e6).toFixed(2)}M`
                  : "—",
              },
              {
                label: "DIFFICULTY",
                value: difficulty ? difficulty.label.toUpperCase() : "—",
              },
            ].map((spec) => (
              <div key={spec.label}>
                <p className="text-[8px] uppercase tracking-[0.2em] text-[var(--abstrack-faint)] font-[family-name:var(--font-avenue-mono)]">
                  {spec.label}
                </p>
                <p className="mt-0.5 text-sm text-[var(--foreground)] font-[family-name:var(--font-avenue-mono)]">
                  {spec.value}
                </p>
              </div>
            ))}

            <div className="mt-2 border-t border-[var(--abstrack-line)] pt-4">
              <p className="text-[8px] uppercase tracking-[0.2em] text-[var(--abstrack-faint)] font-[family-name:var(--font-avenue-mono)]">
                CLASSES
              </p>
              <div className="mt-2 flex flex-col gap-1.5">
                {LANE_NAMES.map((name, i) => (
                  <div key={name} className="flex items-center gap-2">
                    <span
                      className="h-2 w-2 rounded-[1px]"
                      style={{ background: LANE_COLORS[i] }}
                    />
                    <span className="text-[9px] text-[var(--abstrack-dim)] font-[family-name:var(--font-avenue-mono)]">
                      {name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </aside>

          {/* Center: the fingerprint */}
          <section className="order-1 lg:order-2">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div className="flex items-baseline gap-3">
                <h1 className="text-4xl font-black tracking-[-0.045em] font-[family-name:var(--font-avenue-mono)] sm:text-5xl">
                  {candidate ? candidate.block.number.toString() : "—"}
                </h1>
                <span
                  className="rounded-[3px] border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider font-[family-name:var(--font-avenue-mono)]"
                  style={{
                    borderColor: topScore
                      ? "var(--abstrack-lane-2)"
                      : "var(--abstrack-rule)",
                    color: topScore ? "var(--abstrack-lane-2)" : "var(--abstrack-dim)",
                  }}
                >
                  {topScore === undefined
                    ? "checking…"
                    : topScore
                      ? "cleared"
                      : "not yet cleared"}
                </span>
              </div>
              {candidate && (
                <p className="text-xs text-[var(--abstrack-faint)] font-[family-name:var(--font-avenue-mono)]">
                  {candidate.block.hash.slice(0, 10)}&hellip;
                  {candidate.block.hash.slice(-6)}
                </p>
              )}
            </div>
            <div className="mt-1">
              <BlockPicker onSelect={handleSelect} />
            </div>

            <div className="mt-5 rounded-md border border-[var(--abstrack-line)] bg-[var(--abstrack-panel)] p-3">
              <Fingerprint
                fingerprint={candidate ? candidate.fingerprint : null}
                height={260}
                gap={2}
                ghostUnpainted={ghostColumn !== null}
                playheadColumn={ghostColumn ?? undefined}
              />
            </div>

            <div className="mt-2 flex flex-wrap items-center justify-between gap-1 text-[9px] uppercase tracking-[0.14em] font-[family-name:var(--font-avenue-mono)]">
              {ghostColumn !== null ? (
                <span className="text-[var(--abstrack-dim)]">
                  Best attempt died here &middot;{" "}
                  {candidate
                    ? Math.round((playedColumns / candidate.fingerprint.columns) * 100)
                    : 0}
                  %
                </span>
              ) : (
                <span className="text-[var(--abstrack-faint)]">Not yet attempted</span>
              )}
              {candidate && ghostColumn !== null && (
                <span className="text-[var(--abstrack-faint)]">
                  UNPAINTED &middot; {unpaintedColumns} COLUMNS
                </span>
              )}
              {topScore && (
                <span className="text-[var(--abstrack-lane-2)]">
                  Top submitted: {truncateAddress(topScore.player)} &middot;{" "}
                  {Number(topScore.score).toLocaleString()}
                </span>
              )}
            </div>

            {/* How it plays band */}
            <div className="mt-6 rounded-md border border-[var(--abstrack-line)] bg-black/15 p-4">
              <div className="flex gap-2">
                {LANE_LABELS.map((label, i) => (
                  <span
                    key={label}
                    className="flex h-9 w-9 items-center justify-center rounded-[4px] border text-xs font-bold font-[family-name:var(--font-avenue-mono)]"
                    style={{ borderColor: LANE_COLORS[i], color: LANE_COLORS[i] }}
                  >
                    {label}
                  </span>
                ))}
              </div>
              <p className="mt-3 text-xs leading-relaxed text-[var(--abstrack-dim)] font-[family-name:var(--font-avenue-mono)]">
                Every bar is a transaction. It falls down its class&rsquo;s lane —
                hit it on the beat, or it stays grey.
              </p>
            </div>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <button
                onClick={() => candidate && router.push(`/play/${candidate.block.number}`)}
                disabled={!candidate}
                className="processing-btn h-12 flex-1 rounded-md bg-[var(--abstrack-lane-2)] text-sm font-bold text-black transition-all hover:brightness-110 active:scale-[0.99] disabled:opacity-40 font-[family-name:var(--font-roobert)]"
              >
                Play this block
              </button>
              <button
                onClick={() =>
                  candidate &&
                  router.push(`/play/${candidate.block.number}?bot=1&profile=great`)
                }
                disabled={!candidate}
                className="h-12 flex-1 rounded-md border border-[var(--abstrack-line)] text-sm font-bold text-[var(--abstrack-dim)] transition-all hover:border-[var(--abstrack-rule)] hover:text-[var(--foreground)] disabled:opacity-40 font-[family-name:var(--font-roobert)]"
              >
                Watch an autonomous run
              </button>
            </div>
            <p className="mt-3 text-[10px] leading-relaxed text-[var(--abstrack-faint)] font-[family-name:var(--font-avenue-mono)]">
              No wallet, no purchase. Clear every packet and the block is
              listed under your name until someone plays it better.
            </p>
          </section>

          {/* Right rail: cleared today */}
          <aside className="order-3 flex flex-col gap-5">
            <DailyChallengeCard />
            <DailyLeaderboard maxRows={4} />
          </aside>
        </div>

        <div className="mt-8 flex flex-col items-center gap-2 border-t border-[var(--abstrack-line)] pt-6">
          <ContractLink />
          <Link
            href="/records"
            className="text-[8px] uppercase tracking-[0.18em] text-[var(--abstrack-faint)] hover:text-[var(--abstrack-dim)] font-[family-name:var(--font-avenue-mono)]"
          >
            All records &rarr;
          </Link>
        </div>
      </main>
    </div>
  );
}
