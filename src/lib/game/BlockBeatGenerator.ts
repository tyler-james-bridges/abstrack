import type { BeatChart, Note, Lane } from "./types";
import type { BlockData } from "../chain/blockData";
import {
  MIN_BPM,
  MAX_BPM,
  MEASURES,
  BEATS_PER_MEASURE,
  SUBDIVISIONS,
  LANE_COUNT,
  SCALES,
  SCALE_NAMES,
} from "./constants";

/**
 * Simple seeded PRNG (mulberry32).
 * Deterministic: same seed always produces the same sequence.
 */
function createPRNG(seed: number): () => number {
  let state = seed | 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Extract a 32-bit seed from block hash.
 */
function hashToSeed(hash: string): number {
  // Use first 8 hex chars (4 bytes) of hash after '0x'
  const hex = hash.slice(2, 10);
  return parseInt(hex, 16);
}

/**
 * Map gasUsed to BPM. Higher gas = faster tempo.
 */
function gasUsedToBPM(gasUsed: bigint): number {
  // Abstract testnet gas ranges roughly 21000 to ~30M per block
  // Normalize to 0-1 range using log scale for better distribution
  const gasNum = Number(gasUsed);
  const logGas = Math.log10(Math.max(gasNum, 1));
  const logMin = Math.log10(21000);
  const logMax = Math.log10(30_000_000);
  const normalized = Math.max(0, Math.min(1, (logGas - logMin) / (logMax - logMin)));
  return Math.round(MIN_BPM + normalized * (MAX_BPM - MIN_BPM));
}

/**
 * Map tx count to note density (0.1 to 0.8).
 * More transactions = more notes per subdivision slot.
 */
function txCountToDensity(txCount: number): number {
  // 0 txs = sparse, 100+ txs = dense
  const normalized = Math.min(txCount / 100, 1);
  return 0.1 + normalized * 0.7;
}

/**
 * Generate a deterministic beat chart from block data.
 * Same block will always produce the same chart.
 */
export function generateBeatChart(block: BlockData): BeatChart {
  const seed = hashToSeed(block.hash);
  const rand = createPRNG(seed);

  const bpm = gasUsedToBPM(block.gasUsed);
  const density = txCountToDensity(block.transactions.length);

  // Pick scale from hash bytes
  const scaleIndex = parseInt(block.hash.slice(10, 12), 16) % SCALE_NAMES.length;
  const scaleName = SCALE_NAMES[scaleIndex];
  const scale = SCALES[scaleName];

  const secondsPerBeat = 60 / bpm;
  const subdivisionDuration = secondsPerBeat / SUBDIVISIONS;
  const totalSubdivisions = MEASURES * BEATS_PER_MEASURE * SUBDIVISIONS;
  const duration = MEASURES * BEATS_PER_MEASURE * secondsPerBeat;

  const notes: Note[] = [];
  let noteId = 0;

  // Generate rhythm pattern using hash bytes for variation
  const hashBytes = block.hash.slice(2);

  for (let i = 0; i < totalSubdivisions; i++) {
    // Decide if this subdivision gets a note
    const shouldPlace = rand() < density;
    if (!shouldPlace) continue;

    // Determine lane distribution from hash
    const byteIndex = (i * 2) % (hashBytes.length - 2);
    const hashByte = parseInt(hashBytes.slice(byteIndex, byteIndex + 2), 16);

    // Primary lane from hash byte
    const lane = (hashByte % LANE_COUNT) as Lane;

    // Time for this note
    const time = i * subdivisionDuration;

    notes.push({
      id: noteId++,
      lane,
      time,
      duration: 0,
      hit: false,
    });

    // Occasionally add chords (two simultaneous notes) for higher density
    if (density > 0.4 && rand() < 0.15) {
      const secondLane = ((lane + 1 + Math.floor(rand() * 3)) % LANE_COUNT) as Lane;
      if (secondLane !== lane) {
        notes.push({
          id: noteId++,
          lane: secondLane,
          time,
          duration: 0,
          hit: false,
        });
      }
    }
  }

  // Sort notes by time, then by lane
  notes.sort((a, b) => a.time - b.time || a.lane - b.lane);

  return {
    blockNumber: Number(block.number),
    blockHash: block.hash,
    bpm,
    duration,
    notes,
    scale,
    measures: MEASURES,
  };
}
