import * as Tone from "tone";
import type { BeatChart } from "./types";

export class AudioEngine {
  private membraneSynth: Tone.MembraneSynth | null = null;
  private noiseSynth: Tone.NoiseSynth | null = null;
  private fmSynth: Tone.FMSynth | null = null;
  private hihatSynth: Tone.MetalSynth | null = null;
  private isInitialized = false;
  private scheduledEvents: number[] = [];

  async init(): Promise<void> {
    if (this.isInitialized) return;

    await Tone.start();

    // Kick drum
    this.membraneSynth = new Tone.MembraneSynth({
      pitchDecay: 0.05,
      octaves: 6,
      oscillator: { type: "sine" },
      envelope: {
        attack: 0.001,
        decay: 0.4,
        sustain: 0.01,
        release: 1.4,
      },
      volume: -8,
    }).toDestination();

    // Snare
    this.noiseSynth = new Tone.NoiseSynth({
      noise: { type: "white" },
      envelope: {
        attack: 0.001,
        decay: 0.15,
        sustain: 0,
        release: 0.05,
      },
      volume: -12,
    }).toDestination();

    // Hi-hat
    this.hihatSynth = new Tone.MetalSynth({
      envelope: {
        attack: 0.001,
        decay: 0.05,
        release: 0.01,
      },
      harmonicity: 5.1,
      modulationIndex: 32,
      resonance: 4000,
      octaves: 1.5,
      volume: -18,
    }).toDestination();

    // Melodic synth
    this.fmSynth = new Tone.FMSynth({
      harmonicity: 3,
      modulationIndex: 10,
      oscillator: { type: "sine" },
      envelope: {
        attack: 0.01,
        decay: 0.2,
        sustain: 0.2,
        release: 0.5,
      },
      modulation: { type: "square" },
      modulationEnvelope: {
        attack: 0.5,
        decay: 0,
        sustain: 1,
        release: 0.5,
      },
      volume: -14,
    }).toDestination();

    this.isInitialized = true;
  }

  scheduleChart(chart: BeatChart): void {
    this.clearSchedule();

    Tone.getTransport().bpm.value = chart.bpm;

    for (const note of chart.notes) {
      const eventId = Tone.getTransport().schedule((time) => {
        this.playNoteSound(note.lane, chart.scale, time);
      }, note.time);
      this.scheduledEvents.push(eventId);
    }

    // Schedule end
    Tone.getTransport().schedule(() => {
      this.stop();
    }, chart.duration + 0.5);
  }

  private playNoteSound(
    lane: number,
    scale: string[],
    time: number
  ): void {
    switch (lane) {
      case 0: // Kick
        this.membraneSynth?.triggerAttackRelease("C1", "8n", time);
        break;
      case 1: // Snare
        this.noiseSynth?.triggerAttackRelease("8n", time);
        break;
      case 2: // Hi-hat
        this.hihatSynth?.triggerAttackRelease("32n", time);
        break;
      case 3: // Melodic
        const noteIndex = Math.floor(Math.random() * scale.length);
        this.fmSynth?.triggerAttackRelease(
          scale[noteIndex],
          "16n",
          time
        );
        break;
    }
  }

  /** Play a hit sound for feedback when player presses a key */
  playHitSound(lane: number): void {
    const now = Tone.now();
    switch (lane) {
      case 0:
        this.membraneSynth?.triggerAttackRelease("C1", "16n", now);
        break;
      case 1:
        this.noiseSynth?.triggerAttackRelease("16n", now);
        break;
      case 2:
        this.hihatSynth?.triggerAttackRelease("32n", now);
        break;
      case 3:
        this.fmSynth?.triggerAttackRelease("C5", "16n", now);
        break;
    }
  }

  start(): void {
    Tone.getTransport().start();
  }

  stop(): void {
    Tone.getTransport().stop();
    Tone.getTransport().position = 0;
  }

  pause(): void {
    Tone.getTransport().pause();
  }

  resume(): void {
    Tone.getTransport().start();
  }

  /** Play a countdown tick sound */
  playCountdownTick(isFinal: boolean): void {
    const now = Tone.now();
    if (isFinal) {
      // Higher pitch for "GO"
      this.fmSynth?.triggerAttackRelease("C5", "8n", now);
    } else {
      this.membraneSynth?.triggerAttackRelease("G2", "16n", now);
    }
  }

  /** Set the master volume (in dB, -60 to 0) */
  setVolume(db: number): void {
    Tone.getDestination().volume.value = db;
  }

  /** Get the current master volume in dB */
  getVolume(): number {
    return Tone.getDestination().volume.value;
  }

  getCurrentTime(): number {
    return Tone.getTransport().seconds;
  }

  private clearSchedule(): void {
    for (const id of this.scheduledEvents) {
      Tone.getTransport().clear(id);
    }
    this.scheduledEvents = [];
  }

  dispose(): void {
    this.clearSchedule();
    this.stop();
    this.membraneSynth?.dispose();
    this.noiseSynth?.dispose();
    this.hihatSynth?.dispose();
    this.fmSynth?.dispose();
    this.membraneSynth = null;
    this.noiseSynth = null;
    this.hihatSynth = null;
    this.fmSynth = null;
    this.isInitialized = false;
  }
}
