import React from "react";
import Image from "next/image";
import { useLoginWithAbstract } from "@abstract-foundation/agw-react";
import { useAccount } from "wagmi";

export function SignInButton() {
  const { login } = useLoginWithAbstract();
  const { status } = useAccount();

  if (status === "connecting" || status === "reconnecting") {
    return (
      <div className="flex items-center justify-center w-10 h-10">
        <div className="animate-spin">
          <Image src="/abs.svg" alt="Loading" width={24} height={24} />
        </div>
      </div>
    );
  }

  return (
    <button
      className="neon-btn rounded-full border border-[#3EB95F]/30 transition-all flex items-center justify-center gap-2.5 bg-[#3EB95F]/10 text-[#3EB95F] hover:bg-[#3EB95F]/20 hover:border-[#3EB95F]/50 hover:cursor-pointer active:scale-95 text-sm sm:text-base h-12 sm:h-14 px-6 sm:px-8 font-[family-name:var(--font-roobert)] font-bold"
      style={{
        boxShadow: "0 0 15px rgba(182,255,0,0.15), inset 0 0 15px rgba(182,255,0,0.05)",
      }}
      onClick={login}
    >
      <Image
        src="/abs-green.svg"
        alt="Abstract logomark"
        width={20}
        height={20}
      />
      Sign in with Abstract
    </button>
  );
}
