import type { BeatChart, FinalScore, Lane } from "./types";
import { ScoreSystem } from "./ScoreSystem";
import type { BotProfile } from "./BotController";

interface SimOptions {
  chart: BeatChart;
  profile: BotProfile;
}

function jitterMs(profile: BotProfile): number {
  switch (profile) {
    case "perfect":
      return Math.random() * 12 - 6;
    case "great":
      return Math.random() * 70 - 35;
    case "good":
      return Math.random() * 140 - 70;
    case "chaos":
      return Math.random() * 240 - 120;
    default:
      return 0;
  }
}

export function simulateRun({ chart, profile }: SimOptions): FinalScore {
  const notes = chart.notes.map((n) => ({ ...n, hit: false as const }));
  const score = new ScoreSystem();

  for (const note of notes) {
    const t = note.time + jitterMs(profile) / 1000;
    const lane = note.lane as Lane;
    score.judge(t, lane, notes);
  }

  score.processMisses(Infinity, notes);
  return score.computeFinalScore(chart.blockNumber, notes.length);
}
