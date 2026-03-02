import type { BeatChart, Lane } from "./types";

export type BotProfile = "perfect" | "great" | "good" | "chaos";

interface BotControllerOptions {
  profile: BotProfile;
  chart: BeatChart;
  getCurrentTime: () => number;
  onPress: (lane: Lane) => void;
}

interface ScheduledHit {
  lane: Lane;
  targetTime: number;
  fired: boolean;
}

function jitterMs(profile: BotProfile): number {
  switch (profile) {
    case "perfect":
      return (Math.random() * 12 - 6);
    case "great":
      return (Math.random() * 70 - 35);
    case "good":
      return (Math.random() * 140 - 70);
    case "chaos":
      return (Math.random() * 240 - 120);
    default:
      return 0;
  }
}

export class BotController {
  private hits: ScheduledHit[] = [];
  private rafId: number | null = null;
  private running = false;
  private getCurrentTime: () => number;
  private onPress: (lane: Lane) => void;

  constructor(options: BotControllerOptions) {
    this.getCurrentTime = options.getCurrentTime;
    this.onPress = options.onPress;

    this.hits = options.chart.notes.map((note) => ({
      lane: note.lane,
      targetTime: note.time + jitterMs(options.profile) / 1000,
      fired: false,
    }));
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.tick();
  }

  stop(): void {
    this.running = false;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  private tick = (): void => {
    if (!this.running) return;

    const now = this.getCurrentTime();

    for (const hit of this.hits) {
      if (hit.fired) continue;
      if (now >= hit.targetTime) {
        hit.fired = true;
        this.onPress(hit.lane);
      }
    }

    this.rafId = requestAnimationFrame(this.tick);
  };
}
