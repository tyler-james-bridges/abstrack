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
  private bassSynth: Tone.MonoSynth | null = null;
  private padSynth: Tone.PolySynth | null = null;
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

    this.bassSynth = new Tone.MonoSynth({
      oscillator: { type: "square" },
      filter: { Q: 1.4, type: "lowpass", rolloff: -24 },
      envelope: { attack: 0.005, decay: 0.22, sustain: 0.35, release: 0.4 },
      filterEnvelope: {
        attack: 0.01,
        decay: 0.2,
        sustain: 0.4,
        release: 0.6,
        baseFrequency: 80,
        octaves: 2,
      },
      volume: -18,
    }).toDestination();

    this.padSynth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: "triangle" },
      envelope: { attack: 0.08, decay: 0.3, sustain: 0.35, release: 1.0 },
      volume: -24,
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
      }, note.time + (chart.song.swing * ((note.id % 2) ? 1 : 0)));
      this.scheduledEvents.push(eventId);
    }

    this.scheduleBackingTrack(chart);

    // Schedule end
    Tone.getTransport().schedule(() => {
      this.stop();
    }, chart.duration + 0.5);
  }

  private scheduleBackingTrack(chart: BeatChart): void {
    const beatDur = 60 / chart.bpm;
    const root = chart.scale[0] ?? "C3";
    const fifth = chart.scale[Math.min(4, chart.scale.length - 1)] ?? root;
    const upper = chart.scale[Math.min(2, chart.scale.length - 1)] ?? root;

    let seed = parseInt(chart.blockHash.slice(2, 10), 16) || 1;
    const rand = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 0x100000000;
    };

    const bassStep = chart.song.bassDensity > 0.65 ? 0.5 : 1;
    for (let t = 0; t < chart.duration; t += bassStep * beatDur) {
      const id = Tone.getTransport().schedule((time) => {
        if (rand() <= chart.song.bassDensity) {
          this.bassSynth?.triggerAttackRelease(root.replace(/\d+$/, "2"), "8n", time);
        }
      }, t);
      this.scheduledEvents.push(id);
    }

    for (let m = 0; m < chart.measures; m++) {
      const t = m * 4 * beatDur;
      const id = Tone.getTransport().schedule((time) => {
        this.padSynth?.triggerAttackRelease([
          root.replace(/\d+$/, "4"),
          upper.replace(/\d+$/, "4"),
          fifth.replace(/\d+$/, "4"),
        ], "2m", time, 0.35 + chart.song.energy * 0.2);
      }, t);
      this.scheduledEvents.push(id);
    }

    const arpStep = chart.song.arpDensity > 0.6 ? 0.25 : 0.5;
    for (let t = 0; t < chart.duration; t += arpStep * beatDur) {
      const id = Tone.getTransport().schedule((time) => {
        if (rand() <= chart.song.arpDensity) {
          const n = chart.scale[Math.floor(rand() * chart.scale.length)] ?? root;
          this.fmSynth?.triggerAttackRelease(n.replace(/\d+$/, "5"), "16n", time, 0.25 + chart.song.energy * 0.15);
        }
      }, t);
      this.scheduledEvents.push(id);
    }
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
    // Keep backing textures a bit quieter than hit cues.
    if (this.padSynth) this.padSynth.volume.value = Math.min(-18, db - 24);
    if (this.bassSynth) this.bassSynth.volume.value = Math.min(-12, db - 16);
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
    this.bassSynth?.dispose();
    this.padSynth?.dispose();
    this.sparkleSynth?.dispose();
    this.missSynth?.dispose();
    this.membraneSynth = null;
    this.noiseSynth = null;
    this.hihatSynth = null;
    this.fmSynth = null;
    this.bassSynth = null;
    this.padSynth = null;
    this.sparkleSynth = null;
    this.missSynth = null;
    this.isInitialized = false;
  }
}
