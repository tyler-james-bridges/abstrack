"use client";

import { useAccount } from "wagmi";
import { BackgroundEffects } from "@/components/ui/BackgroundEffects";
import { SignInButton } from "@/components/wallet/SignInButton";
import { BlockPicker } from "@/components/home/BlockPicker";
import { RecentBlocks } from "@/components/home/RecentBlocks";
import { Leaderboard } from "@/components/home/Leaderboard";
import { PlayerBestScores } from "@/components/home/PlayerBestScores";
import { ContractLink } from "@/components/home/ContractLink";

export default function Home() {
  const { address } = useAccount();

  return (
    <div className="relative min-h-screen bg-black overflow-hidden">
      <BackgroundEffects />

      <main className="relative z-10 flex flex-col items-center px-4 pt-16 pb-8 sm:py-20 text-white safe-all">
        {/* Logo / Branding */}
        <div className="flex flex-col items-center gap-2 sm:gap-3 mb-6 sm:mb-10">
          <h1
            className="text-5xl sm:text-7xl font-black tracking-tighter font-[family-name:var(--font-roobert)]"
            style={{
              background: "linear-gradient(135deg, #4ecdc4, #45b7d1, #ffd700)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            TEMPO
          </h1>
          <p className="text-sm sm:text-base text-white/50 font-[family-name:var(--font-roobert)] text-center max-w-sm">
            A rhythm game powered by blockchain blocks. Every block is a unique beat.
          </p>
        </div>

        {/* Auth or Game */}
        {address ? (
          <>
            <BlockPicker />
            <RecentBlocks />
            <PlayerBestScores />
            <Leaderboard />

            {/* Contract link */}
            <div className="mt-8 flex flex-col items-center gap-2">
              <ContractLink />
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-6 mt-4">
            <SignInButton />
            <p className="text-xs text-white/30 max-w-xs text-center">
              Connect your Abstract Global Wallet to play and submit scores on-chain.
            </p>

            {/* Show leaderboard even when disconnected */}
            <Leaderboard />

            {/* Contract link for non-connected users too */}
            <ContractLink />
          </div>
        )}
      </main>
    </div>
  );
}
