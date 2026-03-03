import type { BeatChart, Note, Lane, ArpPattern } from "./types";
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
  CHORD_PROGRESSIONS,
  ARP_PATTERNS,
} from "./constants";
import { bjorklund, rotate, createPRNG } from "./rhythm";

/**
 * Extract a 32-bit seed from block hash.
 */
function hashToSeed(hash: string): number {
  const hex = hash.slice(2, 10);
  return parseInt(hex, 16);
}

/**
 * Map gasUsed to BPM. Higher gas = faster tempo.
 */
function gasUsedToBPM(gasUsed: bigint): number {
  const gasNum = Number(gasUsed);
  const logGas = Math.log10(Math.max(gasNum, 1));
  const logMin = Math.log10(21000);
  const logMax = Math.log10(30_000_000);
  const normalized = Math.max(0, Math.min(1, (logGas - logMin) / (logMax - logMin)));
  return Math.round(MIN_BPM + normalized * (MAX_BPM - MIN_BPM));
}

/**
 * Map tx count to total hits per measure for Euclidean rhythms.
 * Returns [minHits, maxHits] for a 16-slot measure — this is the TOTAL
 * across all lanes, not per-lane.
 */
function txCountToHitRange(txCount: number): [number, number] {
  const normalized = Math.min(txCount / 100, 1);
  const minHits = Math.round(3 + normalized * 2); // 3-5
  const maxHits = Math.round(5 + normalized * 3); // 5-8
  return [minHits, maxHits];
}

// Lane weights — higher = more likely to receive a hit.
// Kick and snare anchor the groove; hihat fills; melodic adds color.
const LANE_WEIGHTS = [3, 2, 3, 2]; // kick, snare, hihat, melodic
const LANE_WEIGHT_SUM = LANE_WEIGHTS.reduce((a, b) => a + b, 0);

/**
 * Generate a deterministic beat chart from block data using Euclidean rhythms.
 * Same block will always produce the same chart.
 */
export function generateBeatChart(block: BlockData): BeatChart {
  const seed = hashToSeed(block.hash);
  const rand = createPRNG(seed);

  const bpm = gasUsedToBPM(block.gasUsed);
  const txCount = block.transactions.length;
  const [globalMin, globalMax] = txCountToHitRange(txCount);

  // Pick scale from hash bytes
  const scaleIndex = parseInt(block.hash.slice(10, 12), 16) % SCALE_NAMES.length;
  const scaleName = SCALE_NAMES[scaleIndex];
  const scale = SCALES[scaleName];

  const secondsPerBeat = 60 / bpm;
  const subdivisionDuration = secondsPerBeat / SUBDIVISIONS;
  const subsPerMeasure = BEATS_PER_MEASURE * SUBDIVISIONS; // 16
  const duration = MEASURES * BEATS_PER_MEASURE * secondsPerBeat;

  // Extract rotation offsets from hash bytes
  const hashBytes = block.hash.slice(2);
  const rotationBytes = [
    parseInt(hashBytes.slice(12, 14), 16),
    parseInt(hashBytes.slice(14, 16), 16),
    parseInt(hashBytes.slice(16, 18), 16),
    parseInt(hashBytes.slice(18, 20), 16),
  ];

  const notes: Note[] = [];
  let noteId = 0;

  for (let measure = 0; measure < MEASURES; measure++) {
    const measureOffset = measure * subsPerMeasure;

    // Total hits this measure (slight PRNG variation)
    const hits = globalMin + Math.floor(rand() * (globalMax - globalMin + 1));

    // One Euclidean pattern for the whole measure
    const pattern = bjorklund(hits, subsPerMeasure);
    const rotation = (rotationBytes[measure % rotationBytes.length] + measure) % subsPerMeasure;
    const rotated = rotate(pattern, rotation);

    // Pick a "lead" lane that gets priority this measure (rotates with hash)
    const leadLane = (rotationBytes[0] + measure) % LANE_COUNT;

    for (let step = 0; step < subsPerMeasure; step++) {
      if (!rotated[step]) continue;

      const globalStep = measureOffset + step;
      const time = globalStep * subdivisionDuration;

      // Assign to a lane: lead lane gets ~40% of hits, rest weighted
      let lane: number;
      const roll = rand();
      if (roll < 0.4) {
        lane = leadLane;
      } else {
        // Weighted pick from remaining lanes
        const r = rand() * LANE_WEIGHT_SUM;
        let acc = 0;
        lane = 0;
        for (let l = 0; l < LANE_COUNT; l++) {
          acc += LANE_WEIGHTS[l];
          if (r < acc) { lane = l; break; }
        }
      }

      notes.push({
        id: noteId++,
        lane: lane as Lane,
        time,
        duration: 0,
        hit: false,
      });

      // Occasional 2-note chord at higher density (max 15% chance)
      if (hits >= 6 && rand() < 0.15) {
        const chordLane = ((lane + 1 + Math.floor(rand() * 3)) % LANE_COUNT) as Lane;
        if (chordLane !== lane) {
          notes.push({
            id: noteId++,
            lane: chordLane,
            time,
            duration: 0,
            hit: false,
          });
        }
      }
    }
  }

  // Sort notes by time, then by lane
  notes.sort((a, b) => a.time - b.time || a.lane - b.lane);

  const gasNorm = Math.min(Number(block.gasUsed) / 20_000_000, 1);

  // Pick chord progression deterministically
  const scaleProgs = CHORD_PROGRESSIONS[scaleName] ?? CHORD_PROGRESSIONS["minor"];
  const progIndex = Math.floor(rand() * scaleProgs.length);
  const chordProgression = scaleProgs[progIndex];

  // Chords change every 2 or 4 measures based on energy
  const chordsPerMeasure = gasNorm > 0.5 ? 2 : 4;

  // Arp pattern from PRNG
  const arpPattern = ARP_PATTERNS[Math.floor(rand() * ARP_PATTERNS.length)] as ArpPattern;

  return {
    blockNumber: Number(block.number),
    blockHash: block.hash,
    bpm,
    duration,
    notes,
    scale,
    measures: MEASURES,
    song: {
      energy: 0.35 + gasNorm * 0.65,
      swing: (((seed >>> 8) & 0xff) / 255) * 0.08,
      bassDensity: Math.min(0.25 + txCount / 220, 0.9),
      arpDensity: Math.min(0.2 + txCount / 260, 0.85),
      chordProgression,
      chordsPerMeasure,
      arpPattern,
    },
  };
}
