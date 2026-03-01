import type {
  Note,
  Lane,
  TimingGrade,
  HitResult,
  FinalScore,
  GameState,
} from "./types";
import {
  TIMING_WINDOWS,
  GRADE_SCORES,
  MAX_SCORE,
  COMBO_MULTIPLIER_TIERS,
  LETTER_GRADE_THRESHOLDS,
} from "./constants";

export class ScoreSystem {
  private combo = 0;
  private maxCombo = 0;
  private score = 0;
  private hits: HitResult[] = [];
  private gradeCounts: Record<TimingGrade, number> = {
    perfect: 0,
    great: 0,
    good: 0,
    miss: 0,
  };

  /**
   * Judge a player input against the nearest unjudged note in the lane.
   * @param inputTime - game time in seconds when player pressed
   * @param lane - which lane was pressed
   * @param notes - all notes in the chart (mutable — sets hit=true on matched note)
   * @returns HitResult or null if no note close enough
   */
  judge(inputTime: number, lane: Lane, notes: Note[]): HitResult | null {
    // Find the closest unjudged note in this lane within the good window
    const windowSec = TIMING_WINDOWS.good / 1000;
    let bestNote: Note | null = null;
    let bestOffset = Infinity;

    for (const note of notes) {
      if (note.hit) continue;
      if (note.lane !== lane) continue;

      const offset = (inputTime - note.time) * 1000; // ms
      const absOffset = Math.abs(offset);

      // Skip notes too far in the future
      if (note.time - inputTime > windowSec) break;

      if (absOffset < Math.abs(bestOffset) && absOffset <= TIMING_WINDOWS.good) {
        bestNote = note;
        bestOffset = offset;
      }
    }

    if (!bestNote) return null;

    bestNote.hit = true;
    bestNote.hitTime = performance.now();
    const absOffset = Math.abs(bestOffset);

    let grade: TimingGrade;
    if (absOffset <= TIMING_WINDOWS.perfect) {
      grade = "perfect";
    } else if (absOffset <= TIMING_WINDOWS.great) {
      grade = "great";
    } else {
      grade = "good";
    }

    bestNote.grade = grade;

    // Update combo
    this.combo++;
    if (this.combo > this.maxCombo) {
      this.maxCombo = this.combo;
    }

    // Calculate points with combo multiplier
    const basePoints = GRADE_SCORES[grade];
    const multiplier = this.getComboMultiplier();
    const points = basePoints * multiplier;
    this.score += points;

    // Track grade
    this.gradeCounts[grade]++;

    const result: HitResult = {
      noteId: bestNote.id,
      lane,
      grade,
      offset: bestOffset,
      points,
      combo: this.combo,
    };

    this.hits.push(result);
    return result;
  }

  /**
   * Mark notes that have passed the hit zone without being hit as misses.
   */
  processMisses(currentTime: number, notes: Note[]): HitResult[] {
    const missResults: HitResult[] = [];
    const windowSec = TIMING_WINDOWS.good / 1000;

    for (const note of notes) {
      if (note.hit) continue;
      if (currentTime - note.time > windowSec) {
        note.hit = true;
        note.grade = "miss";
        note.hitTime = performance.now();
        this.combo = 0;
        this.gradeCounts.miss++;

        const result: HitResult = {
          noteId: note.id,
          lane: note.lane,
          grade: "miss",
          offset: Infinity,
          points: 0,
          combo: 0,
        };
        this.hits.push(result);
        missResults.push(result);
      }
    }

    return missResults;
  }

  private getComboMultiplier(): number {
    for (const tier of COMBO_MULTIPLIER_TIERS) {
      if (this.combo >= tier.threshold) {
        return tier.multiplier;
      }
    }
    return 1;
  }

  getState(): Pick<GameState, "score" | "combo" | "maxCombo" | "hits" | "gradeCounts"> {
    return {
      score: this.score,
      combo: this.combo,
      maxCombo: this.maxCombo,
      hits: [...this.hits],
      gradeCounts: { ...this.gradeCounts },
    };
  }

  computeFinalScore(blockNumber: number, totalNotes: number): FinalScore {
    // Normalize score to 0-1,000,000
    const maxPossible = this.computeMaxPossibleScore(totalNotes);
    const normalizedScore =
      maxPossible > 0
        ? Math.round((this.score / maxPossible) * MAX_SCORE)
        : 0;

    const hitNotes =
      this.gradeCounts.perfect + this.gradeCounts.great + this.gradeCounts.good;
    const accuracy = totalNotes > 0 ? hitNotes / totalNotes : 0;

    const ratio = normalizedScore / MAX_SCORE;
    let letterGrade = LETTER_GRADE_THRESHOLDS[LETTER_GRADE_THRESHOLDS.length - 1].grade;
    for (const threshold of LETTER_GRADE_THRESHOLDS) {
      if (ratio >= threshold.min) {
        letterGrade = threshold.grade;
        break;
      }
    }

    return {
      blockNumber,
      totalScore: normalizedScore,
      maxCombo: this.maxCombo,
      gradeCounts: { ...this.gradeCounts },
      totalNotes,
      accuracy,
      letterGrade,
    };
  }

  private computeMaxPossibleScore(totalNotes: number): number {
    // Simulate a perfect play: all perfects with growing combo
    let maxScore = 0;
    for (let i = 0; i < totalNotes; i++) {
      const combo = i + 1;
      let multiplier = 1;
      for (const tier of COMBO_MULTIPLIER_TIERS) {
        if (combo >= tier.threshold) {
          multiplier = tier.multiplier;
          break;
        }
      }
      maxScore += GRADE_SCORES.perfect * multiplier;
    }
    return maxScore;
  }

  reset(): void {
    this.combo = 0;
    this.maxCombo = 0;
    this.score = 0;
    this.hits = [];
    this.gradeCounts = { perfect: 0, great: 0, good: 0, miss: 0 };
  }
}
