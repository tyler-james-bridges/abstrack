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

export async function getBlockForGame(
  blockNumber: bigint
): Promise<BlockData> {
  const block = await publicClient.getBlock({
    blockNumber,
    includeTransactions: false,
  });

  if (!block.hash) {
    throw new Error(`Block ${blockNumber} has no hash`);
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
  return publicClient.getBlockNumber();
}

export async function getRecentBlocks(count = 10): Promise<BlockData[]> {
  const latest = await getLatestBlockNumber();
  const blocks: BlockData[] = [];

  for (let i = 0; i < count; i++) {
    const num = latest - BigInt(i);
    if (num < 0n) break;
    try {
      blocks.push(await getBlockForGame(num));
    } catch {
      // Skip blocks that fail to fetch
    }
  }

  return blocks;
}
