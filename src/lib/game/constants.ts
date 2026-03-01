import type { Lane, TimingGrade, LetterGrade } from "./types";

// Timing windows (in milliseconds)
// Widened from 25/50/100 to account for browser input latency (~8-16ms jitter)
export const TIMING_WINDOWS: Record<TimingGrade, number> = {
  perfect: 45,
  great: 90,
  good: 150,
  miss: Infinity,
};

// Scoring
export const GRADE_SCORES: Record<TimingGrade, number> = {
  perfect: 1000,
  great: 600,
  good: 300,
  miss: 0,
};

export const MAX_SCORE = 1_000_000;

// Combo multiplier tiers
export const COMBO_MULTIPLIER_TIERS = [
  { threshold: 50, multiplier: 4 },
  { threshold: 25, multiplier: 3 },
  { threshold: 10, multiplier: 2 },
  { threshold: 0, multiplier: 1 },
];

// Letter grade thresholds (percentage of max score)
export const LETTER_GRADE_THRESHOLDS: { min: number; grade: LetterGrade }[] = [
  { min: 0.95, grade: "S" },
  { min: 0.85, grade: "A" },
  { min: 0.7, grade: "B" },
  { min: 0.5, grade: "C" },
  { min: 0, grade: "D" },
];

// BPM
export const MIN_BPM = 80;
export const MAX_BPM = 180;

// Chart
export const MEASURES = 32;
export const BEATS_PER_MEASURE = 4;
export const SUBDIVISIONS = 4; // 16th notes

// Lanes
export const LANE_COUNT = 4;
export const LANE_KEYS: Record<string, Lane> = {
  d: 0,
  f: 1,
  j: 2,
  k: 3,
  ArrowLeft: 0,
  ArrowDown: 1,
  ArrowUp: 2,
  ArrowRight: 3,
};

export const LANE_LABELS = ["D", "F", "J", "K"] as const;

export const LANE_COLORS = [
  "#ff6b6b", // red
  "#4ecdc4", // teal
  "#45b7d1", // blue
  "#f9ca24", // yellow
] as const;

// Grade colors
export const GRADE_COLORS: Record<TimingGrade, string> = {
  perfect: "#ffd700", // gold
  great: "#4ecdc4", // green
  good: "#45b7d1", // blue
  miss: "#ff6b6b", // red
};

// Visual
export const NOTE_SPEED = 400; // pixels per second
export const HIT_ZONE_Y = 0.85; // 85% from top
export const NOTE_SIZE = 48;
export const CANVAS_PADDING = 40;
export const CANVAS_PADDING_MOBILE = 12;

/** Returns the correct canvas padding for the given viewport width. */
export function getCanvasPadding(viewportWidth: number): number {
  return viewportWidth < 500 ? CANVAS_PADDING_MOBILE : CANVAS_PADDING;
}

/** Returns the pixel-width of a single lane given viewport width. */
export function getLaneWidth(viewportWidth: number): number {
  const padding = getCanvasPadding(viewportWidth);
  return (viewportWidth - padding * 2) / LANE_COUNT;
}

/** Returns the note size appropriate for the viewport width. */
export function getNoteSize(viewportWidth: number): number {
  return viewportWidth < 500 ? 36 : NOTE_SIZE;
}

// Countdown
export const COUNTDOWN_DURATION = 3; // seconds

// Musical scales (MIDI note names)
export const SCALES: Record<string, string[]> = {
  major: ["C4", "D4", "E4", "F4", "G4", "A4", "B4", "C5"],
  minor: ["C4", "D4", "Eb4", "F4", "G4", "Ab4", "Bb4", "C5"],
  pentatonic: ["C4", "D4", "E4", "G4", "A4", "C5", "D5", "E5"],
  blues: ["C4", "Eb4", "F4", "Gb4", "G4", "Bb4", "C5", "Eb5"],
  dorian: ["C4", "D4", "Eb4", "F4", "G4", "A4", "Bb4", "C5"],
};

export const SCALE_NAMES = Object.keys(SCALES);

// Synth types for notes
export const SYNTH_TYPES = ["kick", "snare", "hihat", "melodic"] as const;
export type SynthType = (typeof SYNTH_TYPES)[number];
