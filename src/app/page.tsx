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
        <div className="flex flex-col items-center gap-3 sm:gap-4 mb-8 sm:mb-12 animate-fade-in-up">
          <h1
            className="text-6xl sm:text-8xl font-black tracking-tighter font-[family-name:var(--font-roobert)] neon-pulse"
            style={{
              color: "#4ecdc4",
              textShadow:
                "0 0 7px #4ecdc4, 0 0 10px #4ecdc4, 0 0 21px #4ecdc4, 0 0 42px rgba(78,205,196,0.3), 0 0 82px rgba(78,205,196,0.1)",
            }}
          >
            TEMPO
          </h1>
          <p className="text-xs sm:text-sm text-white/40 font-[family-name:var(--font-avenue-mono)] text-center max-w-sm tracking-wider uppercase">
            Blockchain rhythm &middot; Every block is a unique beat
          </p>
        </div>

        {/* Auth or Game */}
        {address ? (
          <div className="w-full max-w-5xl mx-auto">
            {/* Block Picker — full width on top */}
            <div className="animate-fade-in-up stagger-1 mb-6 max-w-md mx-auto">
              <BlockPicker />
            </div>

            {/* Two-column grid for content sections */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-5xl mx-auto">
              {/* Left column */}
              <div className="flex flex-col gap-6">
                <div className="animate-fade-in-up stagger-2">
                  <RecentBlocks />
                </div>
                <div className="animate-fade-in-up stagger-3">
                  <PlayerBestScores />
                </div>
              </div>

              {/* Right column */}
              <div className="flex flex-col gap-6">
                <div className="animate-fade-in-up stagger-3">
                  <Leaderboard />
                </div>
              </div>
            </div>

            {/* Contract link */}
            <div className="mt-8 flex flex-col items-center gap-2 animate-fade-in-up stagger-5">
              <ContractLink />
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-8 mt-4 w-full max-w-3xl mx-auto">
            {/* Sign in CTA */}
            <div className="animate-fade-in-up stagger-1">
              <SignInButton />
            </div>
            <p className="text-xs text-white/30 max-w-xs text-center font-[family-name:var(--font-avenue-mono)] tracking-wide animate-fade-in-up stagger-2">
              Connect your Abstract wallet to play and compete on-chain
            </p>

            {/* Feature highlights */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 w-full max-w-2xl animate-fade-in-up stagger-3">
              <div className="feature-card text-center">
                <div className="text-2xl mb-2" style={{ filter: "grayscale(0.2)" }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#4ecdc4" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-1">
                    <path d="M9 18V5l12-2v13" />
                    <circle cx="6" cy="18" r="3" />
                    <circle cx="18" cy="16" r="3" />
                  </svg>
                </div>
                <h3 className="text-sm font-bold text-white/80 font-[family-name:var(--font-roobert)] mb-1">
                  Unique Beats
                </h3>
                <p className="text-[11px] text-white/30 font-[family-name:var(--font-avenue-mono)] leading-relaxed">
                  Every block generates a unique rhythm and melody
                </p>
              </div>

              <div className="feature-card text-center">
                <div className="text-2xl mb-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ffd700" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-1">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                </div>
                <h3 className="text-sm font-bold text-white/80 font-[family-name:var(--font-roobert)] mb-1">
                  On-Chain Scores
                </h3>
                <p className="text-[11px] text-white/30 font-[family-name:var(--font-avenue-mono)] leading-relaxed">
                  Submit scores gas-free and compete globally
                </p>
              </div>

              <div className="feature-card text-center">
                <div className="text-2xl mb-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#45b7d1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-1">
                    <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                  </svg>
                </div>
                <h3 className="text-sm font-bold text-white/80 font-[family-name:var(--font-roobert)] mb-1">
                  Play Anywhere
                </h3>
                <p className="text-[11px] text-white/30 font-[family-name:var(--font-avenue-mono)] leading-relaxed">
                  Desktop keyboard or mobile touch controls
                </p>
              </div>
            </div>

            {/* Show leaderboard even when disconnected */}
            <div className="w-full max-w-md animate-fade-in-up stagger-4">
              <Leaderboard />
            </div>

            {/* Contract link for non-connected users too */}
            <div className="animate-fade-in-up stagger-5">
              <ContractLink />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
