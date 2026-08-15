"use client";

import Link from "next/link";
import { Leaderboard } from "@/components/home/Leaderboard";
import { PlayerBestScores } from "@/components/home/PlayerBestScores";
import { ContractLink } from "@/components/home/ContractLink";

export default function RecordsPage() {
  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <main className="mx-auto w-full max-w-3xl px-4 pb-10 pt-24 safe-x safe-bottom sm:pt-20">
        <header className="mb-8 border-b border-[var(--abstrack-line)] pb-6">
          <Link
            href="/"
            className="text-[9px] uppercase tracking-[0.18em] text-[var(--abstrack-dim)] hover:text-[var(--foreground)] font-[family-name:var(--font-avenue-mono)]"
          >
            &larr; Instrument
          </Link>
          <h1 className="mt-3 text-3xl font-black tracking-[-0.03em] font-[family-name:var(--font-roobert)]">
            Records
          </h1>
          <p className="mt-1 text-xs text-[var(--abstrack-dim)] font-[family-name:var(--font-avenue-mono)]">
            Every published run, onchain.
          </p>
        </header>

        <div className="flex flex-col gap-5">
          <PlayerBestScores />
          <Leaderboard />
        </div>

        <div className="mt-8 flex flex-col items-center gap-2 border-t border-[var(--abstrack-line)] pt-6">
          <ContractLink />
        </div>
      </main>
    </div>
  );
}
