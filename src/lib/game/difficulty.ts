export interface DifficultyParams {
  /** 0-1 interpolation for note density within [min, max] hit range */
  densityT: number;
  /** Note scroll speed in px/s */
  noteSpeed: number;
  /** Probability of spawning a 2-note chord */
  chordChance: number;
  /** Probability that a hit lands on the lead lane */
  leadLaneBias: number;
}

/**
 * Compute difficulty parameters for a given measure.
 * Uses an ease-in curve (progress^1.6) so early measures feel gentle
 * and the final third ramps up sharply.
 */
export function getDifficulty(
  measureIndex: number,
  totalMeasures: number,
): DifficultyParams {
  const progress = totalMeasures <= 1 ? 0 : measureIndex / (totalMeasures - 1);
  const t = Math.pow(progress, 1.6);

  return {
    densityT: t,
    noteSpeed: 320 + t * (480 - 320),
    chordChance: 0.05 + t * (0.20 - 0.05),
    leadLaneBias: 0.40 + t * (0.15 - 0.40),
  };
}
