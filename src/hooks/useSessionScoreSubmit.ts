"use client";

import { useState, useCallback, useRef } from "react";
import { useAccount } from "wagmi";
import {
  useAbstractClient,
  useCreateSession,
} from "@abstract-foundation/agw-react";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { getGeneralPaymasterInput } from "viem/zksync";
import { abstractTestnet } from "viem/chains";
import type { SessionConfig } from "@abstract-foundation/agw-client/sessions";
import type { SessionClient } from "@abstract-foundation/agw-client/sessions";
import { buildTempoSessionConfig, SESSION_PAYMASTER } from "@/lib/chain/sessionSetup";
import {
  TEMPO_SCORE_REGISTRY_ABI,
  TEMPO_SCORE_REGISTRY_ADDRESS,
} from "@/lib/chain/scoreContract";

const SESSION_STORAGE_KEY = "tempo_session_key";

interface StoredSession {
  privateKey: `0x${string}`;
  expiresAt: number; // unix seconds
}

/**
 * Persist the session private key in sessionStorage so it survives soft navigations
 * but not browser restarts (security trade-off: short-lived key, scoped permissions).
 */
function loadStoredSession(): StoredSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredSession;
    // Check expiry with a 60-second buffer
    if (parsed.expiresAt < Math.floor(Date.now() / 1000) + 60) {
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function saveSession(privateKey: `0x${string}`, expiresAt: number): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(
    SESSION_STORAGE_KEY,
    JSON.stringify({ privateKey, expiresAt })
  );
}

function clearStoredSession(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(SESSION_STORAGE_KEY);
}

export type SessionSubmitStatus =
  | "idle"
  | "creating_session"
  | "submitting"
  | "confirming"
  | "success"
  | "error";

interface UseSessionScoreSubmitReturn {
  /** Whether a session is already active (no popup needed). */
  hasSession: boolean;
  /** Submit a score -- creates a session on first call if needed. */
  submitScore: (blockNumber: bigint, score: bigint) => Promise<`0x${string}`>;
  /** Current status for UI display. */
  status: SessionSubmitStatus;
  /** Error message if status is "error". */
  error: string | null;
  /** Transaction hash after successful submission. */
  txHash: `0x${string}` | null;
  /** Reset state for another submission. */
  reset: () => void;
}

/**
 * Hook that manages AGW session keys for popup-free score submission.
 *
 * Flow:
 * 1. First submission: creates a session key (one wallet popup for approval).
 * 2. Subsequent submissions: uses the session client directly (no popup).
 * 3. Session auto-expires after 1 hour; a new one is created as needed.
 */
export function useSessionScoreSubmit(): UseSessionScoreSubmitReturn {
  const { address } = useAccount();
  const { data: agwClient } = useAbstractClient();
  const { createSessionAsync } = useCreateSession();

  const [status, setStatus] = useState<SessionSubmitStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null);

  // Refs to hold the session client and config across renders without causing re-renders
  const sessionClientRef = useRef<SessionClient | null>(null);
  const sessionConfigRef = useRef<SessionConfig | null>(null);
  const signerRef = useRef<ReturnType<typeof privateKeyToAccount> | null>(null);

  const hasSession = sessionClientRef.current !== null;

  /**
   * Ensure we have a valid session client, creating one if necessary.
   * Returns the session client or throws on failure.
   */
  const ensureSession = useCallback(async (): Promise<SessionClient> => {
    // If we already have a client, check if it's still valid
    if (sessionClientRef.current && sessionConfigRef.current) {
      const now = BigInt(Math.floor(Date.now() / 1000));
      if (sessionConfigRef.current.expiresAt > now + 60n) {
        return sessionClientRef.current;
      }
      // Session expired or about to expire -- create a new one
      sessionClientRef.current = null;
      sessionConfigRef.current = null;
      signerRef.current = null;
      clearStoredSession();
    }

    if (!agwClient || !address) {
      throw new Error("Wallet not connected");
    }

    // Try to restore a persisted session
    const stored = loadStoredSession();
    let privateKey: `0x${string}`;

    if (stored) {
      privateKey = stored.privateKey;
    } else {
      privateKey = generatePrivateKey();
    }

    const signer = privateKeyToAccount(privateKey);
    const sessionConfig = buildTempoSessionConfig(signer.address);

    // If we don't have a stored session, we need to create one on-chain (this shows a popup)
    if (!stored) {
      setStatus("creating_session");
      await createSessionAsync({
        session: sessionConfig,
        paymaster: SESSION_PAYMASTER,
        paymasterInput: getGeneralPaymasterInput({ innerInput: "0x" }),
      });

      // Persist the private key for reuse
      saveSession(privateKey, Number(sessionConfig.expiresAt));
    }

    // Build the session client from the AGW client
    const sessionClient = agwClient.toSessionClient(signer, sessionConfig);

    sessionClientRef.current = sessionClient;
    sessionConfigRef.current = sessionConfig;
    signerRef.current = signer;

    return sessionClient;
  }, [agwClient, address, createSessionAsync]);

  const submitScore = useCallback(
    async (blockNumber: bigint, score: bigint): Promise<`0x${string}`> => {
      setError(null);
      setTxHash(null);

      try {
        const client = await ensureSession();

        setStatus("submitting");

        const hash = await client.writeContract({
          abi: TEMPO_SCORE_REGISTRY_ABI,
          address: TEMPO_SCORE_REGISTRY_ADDRESS,
          functionName: "submitScore",
          args: [blockNumber, score],
          // Session client handles the account internally
          account: client.account,
          chain: abstractTestnet,
        });

        setTxHash(hash);
        setStatus("success");
        return hash;
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Unknown error submitting score";

        // Handle "score must be higher" revert
        if (message.includes("New score must be higher")) {
          setError(
            "You already have a higher score for this block. Only improvements are recorded on-chain."
          );
        } else if (message.includes("Score exceeds maximum")) {
          setError("Score exceeds the maximum allowed value (1,000,000).");
        } else if (
          message.includes("rejected") ||
          message.includes("denied")
        ) {
          setError("Transaction was rejected. Please try again.");
          // Clear stored session if it was rejected during creation
          clearStoredSession();
          sessionClientRef.current = null;
          sessionConfigRef.current = null;
          signerRef.current = null;
        } else {
          setError(message);
        }

        setStatus("error");
        throw err;
      }
    },
    [ensureSession]
  );

  const reset = useCallback(() => {
    setStatus("idle");
    setError(null);
    setTxHash(null);
  }, []);

  return {
    hasSession,
    submitScore,
    status,
    error,
    txHash,
    reset,
  };
}
