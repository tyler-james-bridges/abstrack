import { publicClient } from "./blockData";
import { ABSTRACK_ABI, ABSTRACK_ADDRESS } from "./scoreContract";
import type { Address } from "viem";

export interface BlockTopScore {
  player: Address;
  score: bigint;
  timestamp: bigint;
}

/**
 * The top submitted score for a block, if any. `submitScore` takes an
 * unproven number and there's no replay verification yet (HANDOFF §6), so
 * callers should label this "top submitted score" in the UI, not "holder",
 * until that lands.
 */
export async function getBlockTopScore(
  blockNumber: bigint
): Promise<BlockTopScore | null> {
  const result = await publicClient.readContract({
    address: ABSTRACK_ADDRESS,
    abi: ABSTRACK_ABI,
    functionName: "getBlockScores",
    args: [blockNumber],
  });

  const entries = result as unknown as BlockTopScore[];
  if (entries.length === 0) return null;

  return entries.reduce((top, entry) => (entry.score > top.score ? entry : top), entries[0]);
}
