import { FINGERPRINT_VERSION } from "./fingerprint";

interface StoredProgress {
  version: number;
  columns: number;
  furthestColumn: number;
  progress: number;
}

function storageKey(blockNumber: number): string {
  return `abstrack-fingerprint-progress:${blockNumber}`;
}

/** Best recorded run progress for a block, or null if never attempted. */
export function getStoredFingerprintProgress(
  blockNumber: number
): StoredProgress | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(storageKey(blockNumber));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredProgress;
    if (parsed.version !== FINGERPRINT_VERSION) return null;
    return parsed;
  } catch {
    return null;
  }
}

/** Record run progress if it's better than what's stored (furthest column reached). */
export function recordFingerprintProgress(
  blockNumber: number,
  columns: number,
  furthestColumn: number,
  progress: number
): void {
  if (typeof window === "undefined") return;
  const existing = getStoredFingerprintProgress(blockNumber);
  if (existing && existing.furthestColumn >= furthestColumn) return;
  try {
    localStorage.setItem(
      storageKey(blockNumber),
      JSON.stringify({
        version: FINGERPRINT_VERSION,
        columns,
        furthestColumn,
        progress,
      } satisfies StoredProgress)
    );
  } catch {
    // storage full or unavailable — not critical
  }
}
