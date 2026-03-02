"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useAccount } from "wagmi";
import { useLoginWithAbstract } from "@abstract-foundation/agw-react";
import { truncateAddress, abscanAddressUrl } from "@/lib/format";

export function WalletHeader() {
  const pathname = usePathname();
  const { address, status } = useAccount();
  const { login, logout } = useLoginWithAbstract();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Hide on game play pages -- the fullscreen game has its own HUD
  const isGamePage = pathname.startsWith("/play/");

  // Close dropdown on outside click
  useEffect(() => {
    if (!dropdownOpen) return;

    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setDropdownOpen(false);
      }
    }

    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setDropdownOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [dropdownOpen]);

  const handleCopyAddress = useCallback(async () => {
    if (!address) return;
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = address;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [address]);

  const handleDisconnect = useCallback(() => {
    setDropdownOpen(false);
    logout();
  }, [logout]);

  // Return null for game pages after all hooks have been called
  if (isGamePage) return null;

  // Loading / reconnecting state
  if (status === "connecting" || status === "reconnecting") {
    return (
      <div className="fixed top-0 right-0 z-50 p-4 sm:p-5 safe-top safe-right">
        <div className="flex items-center justify-center h-11 w-11 rounded-full bg-white/5 border border-white/10 backdrop-blur-md">
          <div className="animate-spin">
            <Image src="/abs.svg" alt="Loading" width={18} height={18} />
          </div>
        </div>
      </div>
    );
  }

  // Disconnected state: compact connect button
  if (!address) {
    return (
      <div className="fixed top-0 right-0 z-50 p-4 sm:p-5 safe-top safe-right">
        <button
          onClick={login}
          className="flex items-center gap-2 h-11 px-4 rounded-full bg-white/5 border border-white/10 backdrop-blur-md text-white/80 hover:bg-white/10 hover:text-white hover:border-white/20 active:scale-95 transition-all font-[family-name:var(--font-roobert)] text-sm cursor-pointer"
        >
          <Image
            src="/abs.svg"
            alt="Abstract"
            width={16}
            height={16}
            className="opacity-70"
          />
          Connect
        </button>
      </div>
    );
  }

  // Connected state: address pill with dropdown
  return (
    <div
      ref={dropdownRef}
      className="fixed top-0 right-0 z-50 p-4 sm:p-5 safe-top safe-right"
    >
      {/* Address pill button */}
      <button
        onClick={() => setDropdownOpen((prev) => !prev)}
        className={`flex items-center gap-2 h-11 px-3 sm:px-4 rounded-full backdrop-blur-md transition-all font-[family-name:var(--font-roobert)] text-sm cursor-pointer active:scale-95 ${
          dropdownOpen
            ? "bg-white/10 border border-white/25 text-white"
            : "bg-white/5 border border-white/10 text-white/80 hover:bg-white/10 hover:text-white hover:border-white/20"
        }`}
        aria-expanded={dropdownOpen}
        aria-haspopup="true"
      >
        {/* Green dot indicator */}
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#4ecdc4] opacity-50" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-[#4ecdc4]" />
        </span>

        <span className="font-mono text-xs sm:text-sm tracking-tight">
          {truncateAddress(address)}
        </span>

        {/* Chevron */}
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`opacity-50 transition-transform duration-200 ${
            dropdownOpen ? "rotate-180" : ""
          }`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* Dropdown menu */}
      {dropdownOpen && (
        <div className="absolute right-4 sm:right-5 top-full mt-1 w-64 rounded-xl bg-[#0a0a12]/95 border border-[#4ecdc4]/15 backdrop-blur-xl shadow-2xl shadow-black/50 overflow-hidden wallet-dropdown-enter">
          {/* Address section */}
          <div className="px-4 pt-4 pb-3 border-b border-white/5">
            <p className="text-[10px] uppercase tracking-wider text-white/30 font-[family-name:var(--font-roobert)] mb-2">
              Connected Wallet
            </p>
            <button
              onClick={handleCopyAddress}
              className="group flex items-center gap-2 w-full text-left cursor-pointer rounded-lg px-2 py-1.5 -mx-2 hover:bg-white/5 transition-colors"
              title="Copy address"
            >
              <span className="font-mono text-xs text-white/70 group-hover:text-white/90 transition-colors truncate">
                {address}
              </span>
              {copied ? (
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#4ecdc4"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="flex-shrink-0"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="flex-shrink-0 opacity-30 group-hover:opacity-60 transition-opacity"
                >
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
              )}
            </button>
          </div>

          {/* Actions */}
          <div className="p-2">
            {/* View on Abscan */}
            <a
              href={abscanAddressUrl(address)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 w-full h-11 px-3 rounded-lg text-sm text-white/60 hover:text-white hover:bg-white/5 transition-colors font-[family-name:var(--font-roobert)]"
              onClick={() => setDropdownOpen(false)}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
              View on Abscan
            </a>

            {/* Disconnect */}
            <button
              onClick={handleDisconnect}
              className="flex items-center gap-3 w-full h-11 px-3 rounded-lg text-sm text-red-400/70 hover:text-red-400 hover:bg-red-400/5 transition-colors font-[family-name:var(--font-roobert)] cursor-pointer"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              Disconnect
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
