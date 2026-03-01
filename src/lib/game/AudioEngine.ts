import * as Tone from "tone";
import type { BeatChart } from "./types";
import type { TimingGrade } from "./types";

// Volume offsets per grade (dB relative to normal)
const GRADE_VOLUME_OFFSET: Record<TimingGrade, number> = {
  perfect: 0,
  great: -1,
  good: -4,
  miss: 0,
};

export class AudioEngine {
  private membraneSynth: Tone.MembraneSynth | null = null;
  private noiseSynth: Tone.NoiseSynth | null = null;
  private fmSynth: Tone.FMSynth | null = null;
  private hihatSynth: Tone.MetalSynth | null = null;
  private sparkleSynth: Tone.FMSynth | null = null;
  private missSynth: Tone.NoiseSynth | null = null;
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

    // Sparkle synth for perfect hits
    this.sparkleSynth = new Tone.FMSynth({
      harmonicity: 8,
      modulationIndex: 2,
      oscillator: { type: "sine" },
      envelope: {
        attack: 0.001,
        decay: 0.08,
        sustain: 0,
        release: 0.05,
      },
      modulation: { type: "sine" },
      modulationEnvelope: {
        attack: 0.001,
        decay: 0.05,
        sustain: 0,
        release: 0.05,
      },
      volume: -20,
    }).toDestination();

    // Miss buzz sound
    this.missSynth = new Tone.NoiseSynth({
      noise: { type: "brown" },
      envelope: {
        attack: 0.001,
        decay: 0.06,
        sustain: 0,
        release: 0.03,
      },
      volume: -24,
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

  /** Play a hit sound for feedback with quality based on timing grade */
  playHitSound(lane: number, grade: TimingGrade = "perfect"): void {
    const now = Tone.now();
    const volOffset = GRADE_VOLUME_OFFSET[grade];

    switch (lane) {
      case 0:
        if (this.membraneSynth) {
          this.membraneSynth.volume.value = -8 + volOffset;
          this.membraneSynth.triggerAttackRelease("C1", "16n", now);
        }
        break;
      case 1:
        if (this.noiseSynth) {
          this.noiseSynth.volume.value = -12 + volOffset;
          this.noiseSynth.triggerAttackRelease("16n", now);
        }
        break;
      case 2:
        if (this.hihatSynth) {
          this.hihatSynth.volume.value = -18 + volOffset;
          this.hihatSynth.triggerAttackRelease("32n", now);
        }
        break;
      case 3:
        if (this.fmSynth) {
          this.fmSynth.volume.value = -14 + volOffset;
          this.fmSynth.triggerAttackRelease("C5", "16n", now);
        }
        break;
    }

    // Sparkle overlay on perfect hits
    if (grade === "perfect") {
      this.sparkleSynth?.triggerAttackRelease("C6", "32n", now);
    }
  }

  /** Play a short error buzz on miss */
  playMissSound(): void {
    this.missSynth?.triggerAttackRelease("32n", Tone.now());
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
    this.sparkleSynth?.dispose();
    this.missSynth?.dispose();
    this.membraneSynth = null;
    this.noiseSynth = null;
    this.hihatSynth = null;
    this.fmSynth = null;
    this.sparkleSynth = null;
    this.missSynth = null;
    this.isInitialized = false;
  }
}
