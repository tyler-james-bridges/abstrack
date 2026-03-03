/**
 * Euclidean rhythm generation and utilities.
 *
 * Bjorklund's algorithm distributes N hits across M slots as evenly as
 * possible, producing classic world-music rhythms:
 *   bjorklund(3, 8) → tresillo [1,0,0,1,0,0,1,0]
 *   bjorklund(5, 8) → cinquillo [1,0,1,1,0,1,1,0]
 */

/**
 * Bjorklund's algorithm: distribute `hits` onsets across `slots` steps.
 * Returns a boolean array of length `slots`.
 */
export function bjorklund(hits: number, slots: number): boolean[] {
  if (hits >= slots) return Array(slots).fill(true);
  if (hits <= 0) return Array(slots).fill(false);

  // Build groups: `hits` groups of [true] and `slots - hits` groups of [false]
  let groups: boolean[][] = [];
  for (let i = 0; i < hits; i++) groups.push([true]);
  for (let i = 0; i < slots - hits; i++) groups.push([false]);

  // Iteratively distribute remainder groups onto the front groups
  while (true) {
    const frontCount = hits;
    const backCount = groups.length - frontCount;
    if (backCount <= 1) break;

    const take = Math.min(frontCount, backCount);
    const newGroups: boolean[][] = [];
    for (let i = 0; i < take; i++) {
      newGroups.push([...groups[i], ...groups[groups.length - 1 - i]]);
    }
    // Keep any remaining un-paired front groups
    for (let i = take; i < frontCount; i++) {
      newGroups.push(groups[i]);
    }
    groups = newGroups;
    hits = take;
    if (backCount <= frontCount) break;
  }

  return groups.flat();
}

/**
 * Rotate an array by `offset` positions (positive = shift right / rotate left).
 */
export function rotate<T>(arr: T[], offset: number): T[] {
  if (arr.length === 0) return arr;
  const n = ((offset % arr.length) + arr.length) % arr.length;
  return [...arr.slice(n), ...arr.slice(0, n)];
}

/**
 * Seeded PRNG (mulberry32). Deterministic: same seed → same sequence.
 * Unified implementation — use this instead of ad-hoc PRNGs elsewhere.
 */
export function createPRNG(seed: number): () => number {
  let state = seed | 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
