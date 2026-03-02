export function getTodayChallengeSeed(date = new Date()): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function hashString(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h >>> 0);
}

/**
 * Deterministically pick a challenge block from a recent window.
 */
export function pickDailyChallengeBlock(latestBlock: bigint, window = 5000n): bigint {
  const seed = getTodayChallengeSeed();
  const latest = latestBlock > 0n ? latestBlock : 1n;
  const range = latest > window ? window : latest;
  const n = BigInt(hashString(seed)) % range;
  return latest - n;
}
