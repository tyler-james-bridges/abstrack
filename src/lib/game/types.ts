export type Lane = 0 | 1 | 2 | 3;

export type TimingGrade = "perfect" | "great" | "good" | "miss";

export type GamePhase = "loading" | "countdown" | "playing" | "paused" | "finished";

export interface Note {
  id: number;
  lane: Lane;
  /** Time in seconds relative to song start */
  time: number;
  /** Duration in seconds (for hold notes — v2) */
  duration: number;
  /** Whether this note has been judged */
  hit: boolean;
  /** The grade assigned after judgment */
  grade?: TimingGrade;
  /** performance.now() timestamp when the note was judged (for hit animations) */
  hitTime?: number;
}

export type ArpPattern = "ascending" | "descending" | "pendulum" | "random";

export interface SongParams {
  energy: number;
  swing: number;
  bassDensity: number;
  arpDensity: number;
  /** Scale degrees for chord progression (e.g. [0, 5, 3, 4] for i-vi-iv-v) */
  chordProgression: number[];
  /** How many measures per chord change */
  chordsPerMeasure: number;
  /** Arpeggio note-ordering pattern */
  arpPattern: ArpPattern;
}

export interface BeatChart {
  blockNumber: number;
  blockHash: string;
  bpm: number;
  /** Total duration in seconds */
  duration: number;
  notes: Note[];
  /** Musical scale used for melodic synth */
  scale: string[];
  /** Number of measures */
  measures: number;
  /** Derived song shaping params from on-chain activity */
  song: SongParams;
}

export interface HitResult {
  noteId: number;
  lane: Lane;
  grade: TimingGrade;
  /** Timing offset in ms (negative = early, positive = late) */
  offset: number;
  /** Score awarded for this hit */
  points: number;
  /** Current combo after this hit */
  combo: number;
}

export interface GameState {
  phase: GamePhase;
  chart: BeatChart | null;
  score: number;
  combo: number;
  maxCombo: number;
  hits: HitResult[];
  /** Counts per grade */
  gradeCounts: Record<TimingGrade, number>;
  /** Elapsed game time in seconds */
  elapsedTime: number;
  /** Countdown value (3, 2, 1) */
  countdown: number;
}

export interface FinalScore {
  blockNumber: number;
  totalScore: number;
  maxCombo: number;
  gradeCounts: Record<TimingGrade, number>;
  totalNotes: number;
  accuracy: number;
  letterGrade: LetterGrade;
}

export type LetterGrade = "S" | "A" | "B" | "C" | "D";

export interface LaneInput {
  lane: Lane;
  timestamp: number;
  type: "press" | "release";
}
