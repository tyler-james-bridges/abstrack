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

      <main className="relative z-10 flex flex-col items-center px-4 pt-20 pb-8 sm:py-20 text-white safe-x safe-bottom">
        {/* Logo / Branding */}
        <div className="flex flex-col items-center gap-3 sm:gap-4 mb-8 sm:mb-12">
          <h1
            className="text-6xl sm:text-8xl font-black tracking-tighter font-[family-name:var(--font-roobert)] neon-pulse"
            style={{
              color: "#4ecdc4",
              textShadow:
                "0 0 7px #4ecdc4, 0 0 10px #4ecdc4, 0 0 21px #4ecdc4, 0 0 42px rgba(78,205,196,0.3), 0 0 82px rgba(78,205,196,0.1)",
            }}
          >
            ABSTRACK
          </h1>
          <p className="text-xs sm:text-sm text-white/40 font-[family-name:var(--font-avenue-mono)] text-center max-w-sm tracking-wider uppercase">
            Blockchain rhythm &middot; Every block is a unique beat
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
            <p className="text-xs text-white/30 max-w-xs text-center font-[family-name:var(--font-avenue-mono)] tracking-wide">
              Connect your Abstract wallet to play and compete on-chain
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
