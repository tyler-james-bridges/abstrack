"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getLatestBlockNumber } from "@/lib/chain/blockData";

function randomBigIntBetween(min: bigint, max: bigint): bigint {
  const range = max - min + 1n;
  if (range <= 0n) return min;

  const bits = range.toString(2).length;
  const bytes = Math.ceil(bits / 8);
  const randomBytes = new Uint8Array(bytes);

  while (true) {
    crypto.getRandomValues(randomBytes);
    let value = 0n;
    for (const byte of randomBytes) {
      value = (value << 8n) + BigInt(byte);
    }
    if (value < range) return min + value;
  }
}

interface BlockPickerProps {
  /** Sets the featured candidate block on the instrument screen without navigating. */
  onSelect: (blockNumber: bigint) => void;
}

/** "Pick another" — collapses block selection into a popover off the specs rail. */
export function BlockPicker({ onSelect }: BlockPickerProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [blockInput, setBlockInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const handleLoad = () => {
    setError(null);
    const num = parseInt(blockInput, 10);
    if (isNaN(num) || num <= 0) {
      setError("Enter a valid block number > 0");
      return;
    }
    onSelect(BigInt(num));
    setBlockInput("");
    setOpen(false);
  };

  const handleRandom = async () => {
    setError(null);
    setLoading(true);
    try {
      const latest = await getLatestBlockNumber();
      onSelect(randomBigIntBetween(1n, latest));
      setOpen(false);
    } catch {
      setError("Couldn't fetch a random block. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleWatchAutonomousRun = async () => {
    setError(null);
    setLoading(true);
    try {
      const latest = await getLatestBlockNumber();
      const random = randomBigIntBetween(1n, latest);
      router.push(`/play/${random}?bot=1&profile=great`);
    } catch {
      setLoading(false);
      setError("Couldn't launch the run. Try again.");
    }
  };

  return (
    <div className="relative" ref={popoverRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="text-[9px] uppercase tracking-[0.18em] text-[var(--abstrack-dim)] transition-colors hover:text-[var(--foreground)] font-[family-name:var(--font-avenue-mono)]"
      >
        Pick another block
      </button>

      {open && (
        <div className="absolute left-0 top-full z-30 mt-2 w-72 rounded-md border border-[var(--abstrack-line)] bg-[var(--abstrack-panel)] p-4 shadow-2xl">
          <label
            htmlFor="block-number"
            className="text-[8px] uppercase tracking-[0.2em] text-[var(--abstrack-faint)] font-[family-name:var(--font-avenue-mono)]"
          >
            Load a specific block
          </label>
          <div className="mt-2 flex gap-2">
            <input
              id="block-number"
              type="number"
              inputMode="numeric"
              min={1}
              value={blockInput}
              onChange={(e) => setBlockInput(e.target.value)}
              placeholder="Block number"
              className="retro-input h-10 min-w-0 flex-1 rounded-md border border-[var(--abstrack-line)] bg-black/30 px-3 text-sm text-[var(--foreground)] placeholder:text-[var(--abstrack-faint)] font-[family-name:var(--font-avenue-mono)]"
              onKeyDown={(e) => e.key === "Enter" && handleLoad()}
            />
            <button
              onClick={handleLoad}
              disabled={!blockInput}
              className="h-10 rounded-md border border-[var(--abstrack-lane-2)]/40 px-3 text-xs font-bold text-[var(--abstrack-lane-2)] transition-colors hover:bg-[var(--abstrack-lane-2)]/10 disabled:cursor-not-allowed disabled:opacity-30 font-[family-name:var(--font-roobert)]"
            >
              Load
            </button>
          </div>
          {error && (
            <p className="mt-2 text-[10px] text-[var(--abstrack-miss)] font-[family-name:var(--font-avenue-mono)]">
              {error}
            </p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={handleRandom}
              disabled={loading}
              className="h-9 rounded-md border border-[var(--abstrack-line)] px-3 text-[9px] uppercase tracking-wider text-[var(--abstrack-dim)] transition-colors hover:border-[var(--abstrack-rule)] hover:text-[var(--foreground)] disabled:opacity-40 font-[family-name:var(--font-avenue-mono)]"
            >
              Random block
            </button>
            <button
              onClick={handleWatchAutonomousRun}
              disabled={loading}
              className="h-9 rounded-md border border-[var(--abstrack-lane-2)]/30 px-3 text-[9px] uppercase tracking-wider text-[var(--abstrack-lane-2)] transition-colors hover:border-[var(--abstrack-lane-2)]/50 disabled:opacity-40 font-[family-name:var(--font-avenue-mono)]"
            >
              Watch autonomous run
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
