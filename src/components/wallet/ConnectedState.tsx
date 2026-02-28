import React from "react";
import { useAccount } from "wagmi";
import { useLoginWithAbstract } from "@abstract-foundation/agw-react";

export function ConnectedState() {
  const { address } = useAccount();
  const { logout } = useLoginWithAbstract();

  if (!address) return null;

  return (
    <div className="flex items-center gap-3">
      <p className="text-xs text-white/50 font-mono">
        {address.slice(0, 6)}...{address.slice(-4)}
      </p>
      <button
        className="text-xs text-white/40 hover:text-white/70 transition-colors font-[family-name:var(--font-roobert)]"
        onClick={logout}
      >
        Disconnect
      </button>
    </div>
  );
}
