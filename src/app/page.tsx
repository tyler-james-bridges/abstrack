"use client";

import { useAccount } from "wagmi";
import { BackgroundEffects } from "@/components/ui/BackgroundEffects";
import { BlockPicker } from "@/components/home/BlockPicker";
import { RecentBlocks } from "@/components/home/RecentBlocks";
import { Leaderboard } from "@/components/home/Leaderboard";
import { DailyChallengeCard } from "@/components/home/DailyChallengeCard";
import { DailyLeaderboard } from "@/components/home/DailyLeaderboard";
import { PlayerBestScores } from "@/components/home/PlayerBestScores";
import { ContractLink } from "@/components/home/ContractLink";

export default function Home() {
  const { address } = useAccount();

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#020503]">
      <BackgroundEffects />

      <main className="relative z-10 mx-auto w-full max-w-6xl px-4 pb-10 pt-24 text-white safe-x safe-bottom sm:pt-20">
        <header className="mb-8 border-b border-white/8 pb-7 sm:mb-10 sm:pb-9">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#3EB95F] shadow-[0_0_10px_rgba(62,185,95,0.65)]" />
            <p className="text-[9px] uppercase tracking-[0.28em] text-[#A0E7AB]/48 font-[family-name:var(--font-avenue-mono)]">
              Abstract mainnet · block builder online
            </p>
          </div>

          <div className="mt-5 flex flex-col items-start justify-between gap-5 md:flex-row md:items-end">
            <div>
              <p className="text-sm font-black tracking-[-0.03em] text-[#3EB95F] font-[family-name:var(--font-roobert)]">
                ABSTRACK / SEQUENCER
              </p>
              <h1 className="mt-2 max-w-3xl text-5xl sm:text-7xl font-black tracking-[-0.065em] leading-[0.86] text-white font-[family-name:var(--font-roobert)]">
                BUILD THE BLOCK.
                <br />
                <span className="text-white/38">HIT THE BEAT.</span>
              </h1>
            </div>
            <div className="max-w-xs border-l border-[#3EB95F]/25 pl-4">
              <p className="text-xs leading-relaxed text-white/42 font-[family-name:var(--font-avenue-mono)]">
                A rhythm sequencer generated from real Abstract block activity.
                Confirm packets. Hold throughput. Publish the run.
              </p>
              {!address && (
                <p className="mt-2 text-[9px] uppercase tracking-wider text-[#A0E7AB]/38 font-[family-name:var(--font-avenue-mono)]">
                  Guest mode active · connect only to publish
                </p>
              )}
            </div>
          </div>
        </header>

        <div className="flex w-full flex-col gap-5 sm:gap-6">
          <BlockPicker />
          <RecentBlocks />

          <section className="mt-2">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-[8px] uppercase tracking-[0.22em] text-[#A0E7AB]/42 font-[family-name:var(--font-avenue-mono)]">
                  Network competition
                </p>
                <h2 className="mt-1 text-xl font-bold text-white/82 font-[family-name:var(--font-roobert)]">
                  Sequencer records
                </h2>
              </div>
              <p className="hidden text-[8px] uppercase tracking-wider text-white/20 sm:block font-[family-name:var(--font-avenue-mono)]">
                Scores settle on Abstract
              </p>
            </div>

            <div className="grid items-start gap-5 lg:grid-cols-2">
              <div className="flex flex-col gap-5">
                <DailyChallengeCard />
                <DailyLeaderboard />
              </div>
              <div className="flex flex-col gap-5">
                <PlayerBestScores />
                <Leaderboard />
              </div>
            </div>
          </section>

          <div className="mt-4 flex flex-col items-center gap-2 border-t border-white/6 pt-6">
            <ContractLink />
            <p className="text-[8px] uppercase tracking-[0.18em] text-white/16 font-[family-name:var(--font-avenue-mono)]">
              Deterministic block data · player-driven confirmation
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
