/**
 * Shared formatting utilities for the Abstrack UI.
 */

/**
 * Truncate an Ethereum address to 0x1234...abcd format.
 */
export function truncateAddress(address: string, prefixLen = 6, suffixLen = 4): string {
  if (address.length <= prefixLen + suffixLen + 2) return address;
  return `${address.slice(0, prefixLen)}...${address.slice(-suffixLen)}`;
}

/**
 * Format a Unix timestamp (seconds) into a relative time string.
 * e.g. "just now", "2 min ago", "1 hr ago", "3 days ago"
 */
export function timeAgo(timestampSeconds: number | bigint): string {
  const now = Math.floor(Date.now() / 1000);
  const ts = typeof timestampSeconds === "bigint" ? Number(timestampSeconds) : timestampSeconds;
  const diff = now - ts;

  if (diff < 0) return "just now";
  if (diff < 60) return "just now";
  if (diff < 3600) {
    const mins = Math.floor(diff / 60);
    return `${mins} min${mins !== 1 ? "s" : ""} ago`;
  }
  if (diff < 86400) {
    const hrs = Math.floor(diff / 3600);
    return `${hrs} hr${hrs !== 1 ? "s" : ""} ago`;
  }
  const days = Math.floor(diff / 86400);
  return `${days} day${days !== 1 ? "s" : ""} ago`;
}

/**
 * Estimate game difficulty from block gas usage and transaction count.
 * Returns a label and corresponding color class.
 */
export function estimateDifficulty(
  gasUsed: bigint,
  txCount: number
): { label: string; color: string } {
  // Heuristic: more transactions and higher gas = harder charts
  // (more varied data to generate notes from)
  const gas = Number(gasUsed);

  if (txCount >= 100 || gas >= 15_000_000) {
    return { label: "Hard", color: "text-red-400" };
  }
  if (txCount >= 30 || gas >= 5_000_000) {
    return { label: "Medium", color: "text-yellow-400" };
  }
  return { label: "Easy", color: "text-green-400" };
}

/**
 * Abscan URLs for Abstract Testnet.
 */
export const ABSCAN_BASE_URL = "https://sepolia.abscan.org";

export function abscanTxUrl(hash: string): string {
  return `${ABSCAN_BASE_URL}/tx/${hash}`;
}

export function abscanAddressUrl(address: string): string {
  return `${ABSCAN_BASE_URL}/address/${address}`;
}

export function abscanBlockUrl(blockNumber: number | bigint): string {
  return `${ABSCAN_BASE_URL}/block/${blockNumber.toString()}`;
}
