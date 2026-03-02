"use client";

import { useState, useCallback } from "react";
import { useAccount } from "wagmi";
import { useWriteContractSponsored } from "@abstract-foundation/agw-react";
import { getGeneralPaymasterInput } from "viem/zksync";
import {
  ABSTRACK_ABI,
  ABSTRACK_ADDRESS,
  PAYMASTER_ADDRESS,
} from "@/lib/chain/scoreContract";

export type SessionSubmitStatus =
  | "idle"
  | "creating_session"
  | "submitting"
  | "confirming"
  | "success"
  | "error";

interface UseSessionScoreSubmitReturn {
  hasSession: boolean;
  submitScore: (blockNumber: bigint, score: bigint) => Promise<`0x${string}`>;
  status: SessionSubmitStatus;
  error: string | null;
  txHash: `0x${string}` | null;
  reset: () => void;
}

/**
 * Hook for gas-sponsored score submission via the AGW paymaster.
 * Each submission goes through the Privy approval popup.
 */
export function useSessionScoreSubmit(): UseSessionScoreSubmitReturn {
  const { address } = useAccount();
  const { writeContractSponsoredAsync } = useWriteContractSponsored();

  const [status, setStatus] = useState<SessionSubmitStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null);

  const submitScore = useCallback(
    async (blockNumber: bigint, score: bigint): Promise<`0x${string}`> => {
      setError(null);
      setTxHash(null);

      if (!address) throw new Error("Wallet not connected");

      try {
        setStatus("submitting");

        const hash = await writeContractSponsoredAsync({
          abi: ABSTRACK_ABI,
          address: ABSTRACK_ADDRESS,
          functionName: "submitScore",
          args: [blockNumber, score],
          paymaster: PAYMASTER_ADDRESS,
          paymasterInput: getGeneralPaymasterInput({ innerInput: "0x" }),
        });

        setTxHash(hash);
        setStatus("success");
        return hash;
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Unknown error submitting score";

        if (message.includes("New score must be higher")) {
          setError(
            "You already have a higher score for this block. Only improvements are recorded on-chain."
          );
        } else if (message.includes("Score exceeds maximum")) {
          setError("Score exceeds the maximum allowed value (1,000,000).");
        } else if (
          message.includes("rejected") ||
          message.includes("denied") ||
          message.includes("User rejected")
        ) {
          setError("Transaction was rejected. Please try again.");
        } else if (message.includes("insufficient funds")) {
          setError(
            "Insufficient funds for gas. The paymaster may be out of funds."
          );
        } else if (
          message.includes("Failed to initialize request") ||
          message.includes("UserOperationExecutionError") ||
          /0x[a-fA-F0-9]{8,}/.test(message)
        ) {
          setError("Transaction failed. Please try again.");
        } else if (message.length > 150) {
          setError(message.slice(0, 147) + "...");
        } else {
          setError(message);
        }

        setStatus("error");
        throw err;
      }
    },
    [address, writeContractSponsoredAsync]
  );

  const reset = useCallback(() => {
    setStatus("idle");
    setError(null);
    setTxHash(null);
  }, []);

  return {
    hasSession: false,
    submitScore,
    status,
    error,
    txHash,
    reset,
  };
}
