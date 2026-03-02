import { parseAbiItem, type Address } from "viem";
import { publicClient } from "./blockData";
import {
  TEMPO_SCORE_REGISTRY_ADDRESS,
  TEMPO_SCORE_REGISTRY_ABI,
} from "./scoreContract";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ScoreEvent {
  player: Address;
  blockNumber: bigint;
  score: bigint;
  /** The block number of the chain block containing this event (not the game block). */
  txBlockNumber: bigint;
  transactionHash: `0x${string}`;
}

// ---------------------------------------------------------------------------
// Event ABI (parsed for viem event filtering)
// ---------------------------------------------------------------------------

const SCORE_SUBMITTED_EVENT = parseAbiItem(
  "event ScoreSubmitted(address indexed player, uint256 indexed blockNumber, uint256 score)"
);

// ---------------------------------------------------------------------------
// Fetch recent ScoreSubmitted events from on-chain logs
// ---------------------------------------------------------------------------

/**
 * Fetch the most recent `count` ScoreSubmitted events.
 * Scans backwards from the latest block.  The search window is capped at
 * 10,000 blocks to avoid overly broad queries on the RPC.
 *
 * @param count  Maximum number of events to return (default 20).
 * @returns      Array of ScoreEvent objects, most recent first.
 */
export async function getRecentScores(count = 20): Promise<ScoreEvent[]> {
  const latestBlock = await publicClient.getBlockNumber();

  // Search the last 10k blocks (Abstract Testnet has fast blocks)
  const fromBlock = latestBlock > 10_000n ? latestBlock - 10_000n : 0n;

  const logs = await publicClient.getLogs({
    address: TEMPO_SCORE_REGISTRY_ADDRESS,
    event: SCORE_SUBMITTED_EVENT,
    fromBlock,
    toBlock: latestBlock,
  });

  // Most recent first, limited to `count`
  const recent = logs.reverse().slice(0, count);

  return recent.map((log) => ({
    player: log.args.player as Address,
    blockNumber: log.args.blockNumber as bigint,
    score: log.args.score as bigint,
    txBlockNumber: log.blockNumber ?? 0n,
    transactionHash: log.transactionHash ?? ("0x" as `0x${string}`),
  }));
}

/**
 * Fetch ScoreSubmitted events for a specific player.
 *
 * @param player  The player address to filter by.
 * @param count   Maximum number of events to return.
 */
export async function getPlayerScoreEvents(
  player: Address,
  count = 50
): Promise<ScoreEvent[]> {
  const latestBlock = await publicClient.getBlockNumber();
  const fromBlock = latestBlock > 10_000n ? latestBlock - 10_000n : 0n;

  const logs = await publicClient.getLogs({
    address: TEMPO_SCORE_REGISTRY_ADDRESS,
    event: SCORE_SUBMITTED_EVENT,
    args: {
      player,
    },
    fromBlock,
    toBlock: latestBlock,
  });

  return logs
    .reverse()
    .slice(0, count)
    .map((log) => ({
      player: log.args.player as Address,
      blockNumber: log.args.blockNumber as bigint,
      score: log.args.score as bigint,
      txBlockNumber: log.blockNumber ?? 0n,
      transactionHash: log.transactionHash ?? ("0x" as `0x${string}`),
    }));
}

// ---------------------------------------------------------------------------
// Real-time event watching
// ---------------------------------------------------------------------------

export type ScoreEventCallback = (event: ScoreEvent) => void;

/**
 * Watch for new ScoreSubmitted events in real time.
 * Returns an unsubscribe function.
 *
 * @param onScore  Callback invoked for every new ScoreSubmitted event.
 * @returns        Function to stop watching.
 */
export function watchScoreSubmitted(onScore: ScoreEventCallback): () => void {
  const unwatch = publicClient.watchEvent({
    address: TEMPO_SCORE_REGISTRY_ADDRESS,
    event: SCORE_SUBMITTED_EVENT,
    pollingInterval: 30_000,
    onLogs: (logs) => {
      for (const log of logs) {
        onScore({
          player: log.args.player as Address,
          blockNumber: log.args.blockNumber as bigint,
          score: log.args.score as bigint,
          txBlockNumber: log.blockNumber ?? 0n,
          transactionHash: log.transactionHash ?? ("0x" as `0x${string}`),
        });
      }
    },
  });

  return unwatch;
}

// ---------------------------------------------------------------------------
// Contract read helpers (convenience wrappers)
// ---------------------------------------------------------------------------

export interface OnChainScoreEntry {
  player: Address;
  blockNumber: bigint;
  score: bigint;
  timestamp: bigint;
}

/**
 * Read the global top scores from the contract.
 */
export async function getGlobalTopScores(
  count = 10
): Promise<OnChainScoreEntry[]> {
  const result = await publicClient.readContract({
    address: TEMPO_SCORE_REGISTRY_ADDRESS,
    abi: TEMPO_SCORE_REGISTRY_ABI,
    functionName: "getGlobalTopScores",
    args: [BigInt(count)],
  });

  return result as unknown as OnChainScoreEntry[];
}

/**
 * Read all scores for a specific player from the contract.
 */
export async function getPlayerScores(
  player: Address
): Promise<OnChainScoreEntry[]> {
  const result = await publicClient.readContract({
    address: TEMPO_SCORE_REGISTRY_ADDRESS,
    abi: TEMPO_SCORE_REGISTRY_ABI,
    functionName: "getPlayerScores",
    args: [player],
  });

  return result as unknown as OnChainScoreEntry[];
}
