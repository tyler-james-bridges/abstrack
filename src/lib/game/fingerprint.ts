import type { BeatChart, Note, Lane, TimingGrade } from "./types";

/**
 * FINGERPRINT — deterministic visual identity for a block.
 *
 * Design constraint discovered while reading the codebase: the beat chart is
 * NOT derived from per-transaction data. `getBlockForGame` fetches with
 * `includeTransactions: false`, so we hold tx *hashes* only — no per-tx gas,
 * no selectors, no receipts. Deriving art from real tx classes would cost one
 * receipt request per transaction (~184 per block).
 *
 * So the fingerprint is derived from the chart itself, which IS already
 * deterministic (Euclidean patterns seeded by block hash, densities from
 * gasUsed and tx count, packetWeight from tx-hash bytes). Same block ->
 * same chart -> same fingerprint, on every client, with zero extra RPC.
 *
 * Bump FINGERPRINT_VERSION whenever the mapping below changes: published run
 * cards are rendered from it, so old cards must keep rendering their old art.
 */
export const FINGERPRINT_VERSION = 1;

/** Default column count. 96 reads well from 240px wide up to 1200px (OG card). */
export const FINGERPRINT_COLUMNS = 96;

export interface FingerprintBar {
  /** Column index, 0..columns-1 */
  index: number;
  /** Normalised chart time at the column's centre, 0..1 */
  t: number;
  /** Dominant lane in this column — drives colour */
  lane: Lane;
  /** Bar height, 0..1 */
  height: number;
  /** How many chart notes fell into this column */
  noteCount: number;
  /** Best grade achieved in this column during a run, if any */
  grade?: TimingGrade;
  /** True once the player has cleared this column's notes */
  painted: boolean;
}

export interface Fingerprint {
  version: number;
  blockNumber: number;
  blockHash: string;
  columns: number;
  bpm: number;
  duration: number;
  noteCount: number;
  bars: FingerprintBar[];
  /** Fraction of columns painted, 0..1 */
  progress: number;
}

/**
 * Build the unplayed fingerprint for a chart. Pure and allocation-light —
 * safe to call during render, and cacheable by `${blockHash}:${columns}`.
 */
export function buildFingerprint(
  chart: BeatChart,
  columns: number = FINGERPRINT_COLUMNS
): Fingerprint {
  const cols = Math.max(8, Math.floor(columns));
  const span = chart.duration > 0 ? chart.duration : 1;

  const height = new Float32Array(cols);
  const counts = new Int32Array(cols);
  // Per-column lane weights, so the dominant lane wins ties by total weight.
  const laneWeight = new Float32Array(cols * 4);

  for (const note of chart.notes) {
    const col = clamp(Math.floor((note.time / span) * cols), 0, cols - 1);
    const weight = note.packetWeight > 0 ? note.packetWeight : 0.5;
    counts[col] += 1;
    laneWeight[col * 4 + note.lane] += weight;
    // A column's height is its heaviest packet, not the sum: dense columns
    // should read as busy (via colour + neighbours), not as a wall.
    if (weight > height[col]) height[col] = weight;
  }

  const bars: FingerprintBar[] = new Array(cols);
  for (let i = 0; i < cols; i++) {
    let lane: Lane = 0;
    let best = -1;
    for (let l = 0; l < 4; l++) {
      const w = laneWeight[i * 4 + l];
      if (w > best) {
        best = w;
        lane = l as Lane;
      }
    }
    // Empty columns still draw a floor tick — silence is part of the shape.
    const h = counts[i] === 0 ? 0.06 : 0.18 + height[i] * 0.82;
    bars[i] = {
      index: i,
      t: (i + 0.5) / cols,
      lane,
      height: h,
      noteCount: counts[i],
      painted: false,
    };
  }

  return {
    version: FINGERPRINT_VERSION,
    blockNumber: chart.blockNumber,
    blockHash: chart.blockHash,
    columns: cols,
    bpm: chart.bpm,
    duration: chart.duration,
    noteCount: chart.notes.length,
    bars,
    progress: 0,
  };
}

/**
 * Paint the fingerprint from judged notes. Call with the live `chart.notes`
 * during play (cheap enough for ~60fps at 96 columns) or once at game over.
 *
 * A column is painted when every note in it was judged and none was missed.
 */
export function paintFingerprint(
  fingerprint: Fingerprint,
  notes: readonly Note[],
  duration: number = fingerprint.duration
): Fingerprint {
  const cols = fingerprint.columns;
  const span = duration > 0 ? duration : 1;

  const total = new Int32Array(cols);
  const judged = new Int32Array(cols);
  const missed = new Int32Array(cols);
  const bestGrade: (TimingGrade | undefined)[] = new Array(cols);

  for (const note of notes) {
    const col = clamp(Math.floor((note.time / span) * cols), 0, cols - 1);
    total[col] += 1;
    if (!note.hit) continue;
    judged[col] += 1;
    if (note.grade === "miss") {
      missed[col] += 1;
    } else if (note.grade) {
      bestGrade[col] = betterGrade(bestGrade[col], note.grade);
    }
  }

  let painted = 0;
  const bars = fingerprint.bars.map((bar) => {
    const i = bar.index;
    const isPainted =
      total[i] > 0 && judged[i] === total[i] && missed[i] === 0;
    if (isPainted) painted++;
    return { ...bar, painted: isPainted, grade: bestGrade[i] };
  });

  const playable = countPlayable(total);
  return {
    ...fingerprint,
    bars,
    progress: playable > 0 ? painted / playable : 0,
  };
}

/**
 * Geometry for rendering, in a w x h box. Shared by the DOM component and the
 * OG image route so the share card is pixel-identical to the screen.
 */
export interface FingerprintRect {
  x: number;
  y: number;
  width: number;
  height: number;
  lane: Lane;
  painted: boolean;
  grade?: TimingGrade;
}

export function fingerprintRects(
  fingerprint: Fingerprint,
  width: number,
  height: number,
  gap = 2
): FingerprintRect[] {
  const cols = fingerprint.columns;
  const colWidth = width / cols;
  const barWidth = Math.max(1, colWidth - gap);

  return fingerprint.bars.map((bar) => {
    const h = Math.max(1, bar.height * height);
    return {
      x: bar.index * colWidth,
      y: height - h,
      width: barWidth,
      height: h,
      lane: bar.lane,
      painted: bar.painted,
      grade: bar.grade,
    };
  });
}

/** Column index of the furthest painted bar — the "best attempt died here" mark. */
export function furthestPainted(fingerprint: Fingerprint): number {
  let last = -1;
  for (const bar of fingerprint.bars) if (bar.painted) last = bar.index;
  return last;
}

/**
 * Stable short id for a fingerprint, for cache keys and share URLs.
 * Not a security primitive — just a deterministic label.
 */
export function fingerprintId(fingerprint: Fingerprint): string {
  return `${fingerprint.blockNumber}-v${fingerprint.version}-${fingerprint.columns}`;
}

// ---------------------------------------------------------------------------

const GRADE_RANK: Record<TimingGrade, number> = {
  miss: 0,
  good: 1,
  great: 2,
  perfect: 3,
};

function betterGrade(
  a: TimingGrade | undefined,
  b: TimingGrade
): TimingGrade {
  if (!a) return b;
  return GRADE_RANK[b] > GRADE_RANK[a] ? b : a;
}

function countPlayable(total: Int32Array): number {
  let n = 0;
  for (let i = 0; i < total.length; i++) if (total[i] > 0) n++;
  return n;
}

function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value;
}
