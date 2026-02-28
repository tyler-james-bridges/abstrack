import { createPublicClient, http } from "viem";
import { abstractTestnet } from "viem/chains";

export const publicClient = createPublicClient({
  chain: abstractTestnet,
  transport: http(),
});

export interface BlockData {
  number: bigint;
  hash: string;
  gasUsed: bigint;
  timestamp: bigint;
  transactions: `0x${string}`[];
}

// ---------------------------------------------------------------------------
// Error types
// ---------------------------------------------------------------------------

export class RpcError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = "RpcError";
  }
}

// ---------------------------------------------------------------------------
// Retry logic for RPC calls
// ---------------------------------------------------------------------------

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 500;

async function withRetry<T>(
  fn: () => Promise<T>,
  context: string
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;

      // Don't retry on known non-transient errors
      const msg = err instanceof Error ? err.message : String(err);
      if (
        msg.includes("block not found") ||
        msg.includes("invalid block number")
      ) {
        throw new RpcError(`${context}: ${msg}`, err);
      }

      // Wait before retrying (exponential backoff)
      if (attempt < MAX_RETRIES) {
        await new Promise((resolve) =>
          setTimeout(resolve, RETRY_DELAY_MS * attempt)
        );
      }
    }
  }

  const msg =
    lastError instanceof Error ? lastError.message : String(lastError);
  throw new RpcError(
    `${context} failed after ${MAX_RETRIES} attempts: ${msg}`,
    lastError
  );
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function getBlockForGame(
  blockNumber: bigint
): Promise<BlockData> {
  const block = await withRetry(
    () =>
      publicClient.getBlock({
        blockNumber,
        includeTransactions: false,
      }),
    `getBlock(${blockNumber})`
  );

  if (!block.hash) {
    throw new RpcError(`Block ${blockNumber} has no hash`);
  }

  return {
    number: block.number,
    hash: block.hash,
    gasUsed: block.gasUsed,
    timestamp: block.timestamp,
    transactions: block.transactions as `0x${string}`[],
  };
}

export async function getLatestBlockNumber(): Promise<bigint> {
  return withRetry(
    () => publicClient.getBlockNumber(),
    "getBlockNumber"
  );
}

export async function getRecentBlocks(count = 10): Promise<BlockData[]> {
  const latest = await getLatestBlockNumber();
  const blocks: BlockData[] = [];

  // Fetch blocks in parallel for speed, but cap concurrent requests
  const blockNumbers: bigint[] = [];
  for (let i = 0; i < count; i++) {
    const num = latest - BigInt(i);
    if (num < 0n) break;
    blockNumbers.push(num);
  }

  const results = await Promise.allSettled(
    blockNumbers.map((num) => getBlockForGame(num))
  );

  for (const result of results) {
    if (result.status === "fulfilled") {
      blocks.push(result.value);
    }
    // Skip blocks that fail to fetch -- don't break the entire list
  }

  return blocks;
}
