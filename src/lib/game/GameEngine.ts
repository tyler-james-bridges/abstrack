import type {
  BeatChart,
  GameState,
  GamePhase,
  FinalScore,
  LaneInput,
  HitResult,
} from "./types";
import { AudioEngine } from "./AudioEngine";
import { InputHandler } from "./InputHandler";
import { ScoreSystem } from "./ScoreSystem";
import { COUNTDOWN_DURATION } from "./constants";

export type GameEventCallback = (event: GameEvent) => void;

export type GameEvent =
  | { type: "phaseChange"; phase: GamePhase }
  | { type: "scoreUpdate"; state: GameState }
  | { type: "hit"; result: HitResult }
  | { type: "miss"; results: HitResult[] }
  | { type: "countdown"; value: number }
  | { type: "finished"; finalScore: FinalScore };

export class GameEngine {
  private audioEngine: AudioEngine;
  private inputHandler: InputHandler;
  private scoreSystem: ScoreSystem;
  private chart: BeatChart | null = null;
  private phase: GamePhase = "loading";
  private animationId: number | null = null;
  private countdownStart = 0;
  private gameStartTime = 0;
  private lastCountdownValue = 0;
  private eventCallbacks: GameEventCallback[] = [];
  private touchElement: HTMLElement | null = null;
  private pauseEscapeHandler: ((e: KeyboardEvent) => void) | null = null;

  constructor() {
    this.audioEngine = new AudioEngine();
    this.inputHandler = new InputHandler();
    this.scoreSystem = new ScoreSystem();
  }

  on(callback: GameEventCallback): () => void {
    this.eventCallbacks.push(callback);
    return () => {
      this.eventCallbacks = this.eventCallbacks.filter((cb) => cb !== callback);
    };
  }

  private emit(event: GameEvent): void {
    for (const cb of this.eventCallbacks) {
      cb(event);
    }
  }

  async load(chart: BeatChart, touchElement?: HTMLElement): Promise<void> {
    this.chart = chart;
    this.touchElement = touchElement ?? null;
    this.scoreSystem.reset();
    this.setPhase("loading");

    await this.audioEngine.init();
    this.audioEngine.scheduleChart(chart);

    // Set up Escape key handler for pause/resume
    this.pauseEscapeHandler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        if (this.phase === "playing") {
          this.pause();
        } else if (this.phase === "paused") {
          this.resume();
        }
      }
    };
    window.addEventListener("keydown", this.pauseEscapeHandler);

    this.startCountdown();
  }

  private startCountdown(): void {
    this.setPhase("countdown");
    this.countdownStart = performance.now();
    this.lastCountdownValue = COUNTDOWN_DURATION + 1;
    this.runCountdownLoop();
  }

  private runCountdownLoop = (): void => {
    const elapsed = (performance.now() - this.countdownStart) / 1000;
    const remaining = Math.ceil(COUNTDOWN_DURATION - elapsed);

    if (remaining !== this.lastCountdownValue && remaining > 0) {
      this.lastCountdownValue = remaining;
      this.emit({ type: "countdown", value: remaining });
      // Play countdown tick sound
      this.audioEngine.playCountdownTick(remaining === 1);
    }

    if (elapsed >= COUNTDOWN_DURATION) {
      this.startPlaying();
      return;
    }

    this.animationId = requestAnimationFrame(this.runCountdownLoop);
  };

  private startPlaying(): void {
    this.setPhase("playing");
    this.gameStartTime = performance.now();

    // Start audio
    this.audioEngine.start();

    // Start input handling
    this.inputHandler.start(
      (input: LaneInput) => this.handleInput(input),
      this.touchElement ?? undefined
    );

    // Start game loop
    this.runGameLoop();
  }

  pause(): void {
    if (this.phase !== "playing") return;

    // Cancel the game loop
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }

    // Pause audio transport
    this.audioEngine.pause();

    // Stop input (but keep escape handler)
    this.inputHandler.stop();

    this.setPhase("paused");
  }

  resume(): void {
    if (this.phase !== "paused") return;

    this.setPhase("playing");

    // Resume audio
    this.audioEngine.resume();

    // Restart input handling
    this.inputHandler.start(
      (input: LaneInput) => this.handleInput(input),
      this.touchElement ?? undefined
    );

    // Restart game loop
    this.runGameLoop();
  }

  private handleInput = (input: LaneInput): void => {
    if (this.phase !== "playing" || !this.chart) return;
    if (input.type !== "press") return;

    const gameTime = this.audioEngine.getCurrentTime();
    const result = this.scoreSystem.judge(gameTime, input.lane, this.chart.notes);

    if (result) {
      this.audioEngine.playHitSound(input.lane, result.grade);
      this.emit({ type: "hit", result });
      this.emitScoreUpdate();
    }
  };

  private runGameLoop = (): void => {
    if (this.phase !== "playing" || !this.chart) return;

    const gameTime = this.audioEngine.getCurrentTime();

    // Check for misses
    const missResults = this.scoreSystem.processMisses(
      gameTime,
      this.chart.notes
    );
    if (missResults.length > 0) {
      this.audioEngine.playMissSound();
      this.emit({ type: "miss", results: missResults });
      this.emitScoreUpdate();
    }

    // Check if song is over
    if (gameTime >= this.chart.duration) {
      this.finishGame();
      return;
    }

    this.animationId = requestAnimationFrame(this.runGameLoop);
  };

  private finishGame(): void {
    if (!this.chart) return;

    // Process any remaining notes as misses
    this.scoreSystem.processMisses(Infinity, this.chart.notes);

    this.inputHandler.stop();
    this.audioEngine.stop();

    const finalScore = this.scoreSystem.computeFinalScore(
      this.chart.blockNumber,
      this.chart.notes.length
    );

    this.setPhase("finished");
    this.emit({ type: "finished", finalScore });
  }

  private setPhase(phase: GamePhase): void {
    this.phase = phase;
    this.emit({ type: "phaseChange", phase });
  }

  private emitScoreUpdate(): void {
    const scoreState = this.scoreSystem.getState();
    this.emit({
      type: "scoreUpdate",
      state: {
        phase: this.phase,
        chart: this.chart,
        elapsedTime: this.audioEngine.getCurrentTime(),
        countdown: 0,
        ...scoreState,
      },
    });
  }

  getState(): GameState {
    const scoreState = this.scoreSystem.getState();
    return {
      phase: this.phase,
      chart: this.chart,
      elapsedTime:
        this.phase === "playing" ? this.audioEngine.getCurrentTime() : 0,
      countdown: 0,
      ...scoreState,
    };
  }

  getCurrentTime(): number {
    return this.audioEngine.getCurrentTime();
  }

  /** Set master volume in dB (-60 to 0) */
  setVolume(db: number): void {
    this.audioEngine.setVolume(db);
  }

  destroy(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    if (this.pauseEscapeHandler) {
      window.removeEventListener("keydown", this.pauseEscapeHandler);
      this.pauseEscapeHandler = null;
    }
    this.inputHandler.stop();
    this.audioEngine.dispose();
    this.eventCallbacks = [];
  }
}
