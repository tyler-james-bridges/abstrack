import * as Tone from "tone";
import type { BeatChart } from "./types";
import type { TimingGrade } from "./types";
import { BEATS_PER_MEASURE, SUBDIVISIONS } from "./constants";
import { bjorklund, rotate, createPRNG } from "./rhythm";

// Volume offsets per grade (dB relative to normal)
const GRADE_VOLUME_OFFSET: Record<TimingGrade, number> = {
  perfect: 0,
  great: -1,
  good: -4,
  miss: 0,
};

export type MusicMode = "classic" | "musical";

const TEMPO_MIN = 0.7;
const TEMPO_MAX = 1.5;

/**
 * Build a note sequence for the arpeggiator based on the pattern type.
 */
function buildArpSequence(
  chordTones: string[],
  pattern: string,
  rand: () => number
): string[] {
  switch (pattern) {
    case "ascending":
      return chordTones;
    case "descending":
      return [...chordTones].reverse();
    case "pendulum":
      // up then down (minus duplicate at peak): [0,1,2,1]
      if (chordTones.length <= 1) return chordTones;
      return [...chordTones, ...chordTones.slice(1, -1).reverse()];
    case "random": {
      // Shuffle chord tones deterministically
      const shuffled = [...chordTones];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
    }
    default:
      return chordTones;
  }
}

export class AudioEngine {
  // Transport-scheduled synths (backing track + auto-play notes)
  private membraneSynth: Tone.MembraneSynth | null = null;
  private noiseSynth: Tone.NoiseSynth | null = null;
  private fmSynth: Tone.FMSynth | null = null;
  private hihatSynth: Tone.MetalSynth | null = null;
  private bassSynth: Tone.MonoSynth | null = null;
  private padSynth: Tone.PolySynth | null = null;

  // Dedicated synths for real-time interactive feedback (hit/miss/countdown).
  // Separate instances prevent timing conflicts with transport-scheduled events.
  private hitMembraneSynth: Tone.MembraneSynth | null = null;
  private hitNoiseSynth: Tone.NoiseSynth | null = null;
  private hitFmSynth: Tone.FMSynth | null = null;
  private hitHihatSynth: Tone.MetalSynth | null = null;
  private hitSparkleSynth: Tone.FMSynth | null = null;
  private hitMissSynth: Tone.NoiseSynth | null = null;

  // Effects
  private compressor: Tone.Compressor | null = null;
  private reverb: Tone.Reverb | null = null;
  private dryChannel: Tone.Channel | null = null;
  private wetChannel: Tone.Channel | null = null;

  private isInitialized = false;
  private scheduledEvents: number[] = [];
  private musicMode: MusicMode = "musical";
  private tempoMultiplier = 1;
  private chartBaseBpm = 120;
  private lastScheduledTrigger: Record<string, number> = {};

  async init(): Promise<void> {
    if (this.isInitialized) return;

    await Tone.start();

    // --- Effects chain ---
    // Master compressor
    this.compressor = new Tone.Compressor({
      threshold: -18,
      ratio: 3,
      attack: 0.01,
      release: 0.15,
    }).toDestination();

    // Reverb send
    this.reverb = new Tone.Reverb({ decay: 2.5, wet: 0.35 });
    await this.reverb.generate();
    this.reverb.connect(this.compressor);

    // Dry channel (drums, bass) → compressor
    this.dryChannel = new Tone.Channel({ volume: 0 }).connect(this.compressor);

    // Wet channel (pad, arp) → reverb → compressor
    this.wetChannel = new Tone.Channel({ volume: 0 }).connect(this.reverb);

    // --- Transport-scheduled synths ---

    // Kick drum (dry)
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
    }).connect(this.dryChannel);

    // Snare (dry)
    this.noiseSynth = new Tone.NoiseSynth({
      noise: { type: "white" },
      envelope: {
        attack: 0.001,
        decay: 0.15,
        sustain: 0,
        release: 0.05,
      },
      volume: -12,
    }).connect(this.dryChannel);

    // Hi-hat (dry)
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
    }).connect(this.dryChannel);

    // Melodic / arp synth (wet)
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
    }).connect(this.wetChannel);

    // Bass: sine oscillator for cleaner sub (dry)
    this.bassSynth = new Tone.MonoSynth({
      oscillator: { type: "sine" },
      filter: { Q: 1.4, type: "lowpass", rolloff: -24 },
      envelope: { attack: 0.005, decay: 0.22, sustain: 0.35, release: 0.4 },
      filterEnvelope: {
        attack: 0.01,
        decay: 0.2,
        sustain: 0.4,
        release: 0.6,
        baseFrequency: 60,
        octaves: 2,
      },
      volume: -18,
    }).connect(this.dryChannel);

    // Pad: sine oscillator, slower attack, longer release (wet)
    this.padSynth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: "sine" },
      envelope: { attack: 0.3, decay: 0.4, sustain: 0.4, release: 2.0 },
      volume: -18,
    }).connect(this.wetChannel);

    // --- Interactive hit synths (go straight to destination for lowest latency) ---
    this.hitMembraneSynth = new Tone.MembraneSynth({
      pitchDecay: 0.05, octaves: 6,
      oscillator: { type: "sine" },
      envelope: { attack: 0.001, decay: 0.4, sustain: 0.01, release: 1.4 },
      volume: -8,
    }).toDestination();

    this.hitNoiseSynth = new Tone.NoiseSynth({
      noise: { type: "white" },
      envelope: { attack: 0.001, decay: 0.15, sustain: 0, release: 0.05 },
      volume: -12,
    }).toDestination();

    this.hitHihatSynth = new Tone.MetalSynth({
      envelope: { attack: 0.001, decay: 0.05, release: 0.01 },
      harmonicity: 5.1, modulationIndex: 32, resonance: 4000, octaves: 1.5,
      volume: -18,
    }).toDestination();

    this.hitFmSynth = new Tone.FMSynth({
      harmonicity: 3, modulationIndex: 10,
      oscillator: { type: "sine" },
      envelope: { attack: 0.01, decay: 0.2, sustain: 0.2, release: 0.5 },
      modulation: { type: "square" },
      modulationEnvelope: { attack: 0.5, decay: 0, sustain: 1, release: 0.5 },
      volume: -14,
    }).toDestination();

    this.hitSparkleSynth = new Tone.FMSynth({
      harmonicity: 8, modulationIndex: 2,
      oscillator: { type: "sine" },
      envelope: { attack: 0.001, decay: 0.08, sustain: 0, release: 0.05 },
      modulation: { type: "sine" },
      modulationEnvelope: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.05 },
      volume: -20,
    }).toDestination();

    this.hitMissSynth = new Tone.NoiseSynth({
      noise: { type: "brown" },
      envelope: { attack: 0.001, decay: 0.06, sustain: 0, release: 0.03 },
      volume: -24,
    }).toDestination();

    this.isInitialized = true;
  }

  scheduleChart(chart: BeatChart): void {
    this.clearSchedule();
    this.lastScheduledTrigger = {};

    this.chartBaseBpm = chart.bpm;
    Tone.getTransport().bpm.value = this.chartBaseBpm * this.tempoMultiplier;

    const secondsPerBeat = 60 / chart.bpm;
    const subdivisionDur = secondsPerBeat / SUBDIVISIONS;

    for (const note of chart.notes) {
      // Fix swing: apply to off-beat 16th positions (1, 3, 5, 7, ...) not odd note IDs
      const subdivisionIndex = Math.round(note.time / subdivisionDur);
      const isOffBeat = subdivisionIndex % 2 === 1;
      const swingOffset = isOffBeat ? chart.song.swing : 0;

      const eventId = Tone.getTransport().schedule((time) => {
        this.playNoteSound(note.lane, chart.scale, time, note.id);
      }, note.time / this.tempoMultiplier + swingOffset);
      this.scheduledEvents.push(eventId);
    }

    if (this.musicMode === "musical") {
      this.scheduleBackingTrack(chart);
    }

    // Schedule end
    Tone.getTransport().schedule(() => {
      this.stop();
    }, chart.duration / this.tempoMultiplier + 0.5);
  }

  private scheduleBackingTrack(chart: BeatChart): void {
    const beatDur = 60 / (chart.bpm * this.tempoMultiplier);
    const subsPerMeasure = BEATS_PER_MEASURE * SUBDIVISIONS; // 16
    const subdivisionDur = beatDur / SUBDIVISIONS;
    const measureDur = BEATS_PER_MEASURE * beatDur;
    const scale = chart.scale;
    const song = chart.song;

    const seed = parseInt(chart.blockHash.slice(2, 10), 16) || 1;
    const rand = createPRNG(seed + 0xdead); // offset seed so backing differs from notes

    // --- Chord progression ---
    const prog = song.chordProgression;
    const chordsPerMeasure = song.chordsPerMeasure;

    /** Get the chord tones for a given measure index */
    const getChordTones = (measure: number): string[] => {
      const chordIndex = Math.floor(measure / chordsPerMeasure) % prog.length;
      const root = prog[chordIndex];
      // Build triad from scale: root, third (root+2), fifth (root+4)
      const r = scale[root % scale.length];
      const third = scale[(root + 2) % scale.length];
      const fifth = scale[(root + 4) % scale.length];
      return [r, third, fifth];
    };

    // --- Pad: play chord tones, change every chordsPerMeasure measures ---
    for (let m = 0; m < chart.measures; m++) {
      // Only re-trigger pad at chord change boundaries
      if (m % chordsPerMeasure !== 0) continue;

      const t = m * measureDur;
      const chordTones = getChordTones(m);
      const holdDur = chordsPerMeasure * measureDur;

      const id = Tone.getTransport().schedule((time) => {
        const padNotes = chordTones.map((n) => n.replace(/\d+$/, "4"));
        this.padSynth?.triggerAttackRelease(
          padNotes,
          holdDur * 0.9,
          this.nextSafeTime("pad", time),
          0.35 + song.energy * 0.2
        );
      }, t);
      this.scheduledEvents.push(id);
    }

    // --- Bass: Euclidean pattern following chord root, root-fifth alternation ---
    const bassHits = Math.max(2, Math.round(song.bassDensity * 6)); // 2-6 hits per measure
    for (let m = 0; m < chart.measures; m++) {
      const pattern = bjorklund(bassHits, subsPerMeasure);
      const bassRotation = Math.floor(rand() * subsPerMeasure);
      const rotated = rotate(pattern, bassRotation);
      const chordTones = getChordTones(m);
      const bassRoot = chordTones[0].replace(/\d+$/, "2");
      const bassFifth = chordTones[2].replace(/\d+$/, "2");

      let bassNoteCount = 0;
      for (let step = 0; step < subsPerMeasure; step++) {
        if (!rotated[step]) continue;

        const t = m * measureDur + step * subdivisionDur;
        // Alternate root and fifth
        const note = bassNoteCount % 2 === 0 ? bassRoot : bassFifth;
        bassNoteCount++;

        const id = Tone.getTransport().schedule((time) => {
          this.bassSynth?.triggerAttackRelease(
            note,
            "8n",
            this.nextSafeTime("bass", time)
          );
        }, t);
        this.scheduledEvents.push(id);
      }
    }

    // --- Arp: Euclidean rhythm, sequence through chord tones ---
    const arpHits = Math.max(3, Math.round(song.arpDensity * 8)); // 3-8 hits per measure
    for (let m = 0; m < chart.measures; m++) {
      const pattern = bjorklund(arpHits, subsPerMeasure);
      const arpRotation = Math.floor(rand() * subsPerMeasure);
      const rotated = rotate(pattern, arpRotation);
      const chordTones = getChordTones(m);

      // Build note sequence based on arp pattern
      const arpSequence = buildArpSequence(chordTones, song.arpPattern, rand);

      let arpNoteCount = 0;
      for (let step = 0; step < subsPerMeasure; step++) {
        if (!rotated[step]) continue;

        const t = m * measureDur + step * subdivisionDur;
        const noteStr =
          arpSequence[arpNoteCount % arpSequence.length].replace(/\d+$/, "5");
        arpNoteCount++;

        const id = Tone.getTransport().schedule((time) => {
          this.fmSynth?.triggerAttackRelease(
            noteStr,
            "16n",
            this.nextSafeTime("fm", time),
            0.25 + song.energy * 0.15
          );
        }, t);
        this.scheduledEvents.push(id);
      }
    }
  }

  private nextSafeTime(key: string, time: number): number {
    const prev = this.lastScheduledTrigger[key];
    if (prev == null || time > prev) {
      this.lastScheduledTrigger[key] = time;
      return time;
    }
    const bumped = prev + 0.0005;
    this.lastScheduledTrigger[key] = bumped;
    return bumped;
  }

  private playNoteSound(
    lane: number,
    scale: string[],
    time: number,
    noteId = 0
  ): void {
    switch (lane) {
      case 0: // Kick
        this.membraneSynth?.triggerAttackRelease("C1", "8n", this.nextSafeTime("membrane", time));
        break;
      case 1: // Snare
        this.noiseSynth?.triggerAttackRelease("8n", this.nextSafeTime("noise", time));
        break;
      case 2: // Hi-hat
        this.hihatSynth?.triggerAttackRelease("32n", this.nextSafeTime("hihat", time));
        break;
      case 3: { // Melodic
        const noteIndex = noteId % Math.max(1, scale.length);
        this.fmSynth?.triggerAttackRelease(
          scale[noteIndex],
          "16n",
          this.nextSafeTime("fm", time),
          this.musicMode === "musical" ? 0.16 : 0.28
        );
        break;
      }
    }
  }

  /** Play a hit sound for feedback with quality based on timing grade */
  playHitSound(lane: number, grade: TimingGrade = "perfect"): void {
    const now = Tone.now();
    const volOffset = GRADE_VOLUME_OFFSET[grade];

    switch (lane) {
      case 0:
        if (this.hitMembraneSynth) {
          this.hitMembraneSynth.volume.value = -8 + volOffset;
          this.hitMembraneSynth.triggerAttackRelease("C1", "16n", now);
        }
        break;
      case 1:
        if (this.hitNoiseSynth) {
          this.hitNoiseSynth.volume.value = -12 + volOffset;
          this.hitNoiseSynth.triggerAttackRelease("16n", now);
        }
        break;
      case 2:
        if (this.hitHihatSynth) {
          this.hitHihatSynth.volume.value = -18 + volOffset;
          this.hitHihatSynth.triggerAttackRelease("32n", now);
        }
        break;
      case 3:
        if (this.hitFmSynth) {
          this.hitFmSynth.volume.value = -14 + volOffset;
          this.hitFmSynth.triggerAttackRelease("C5", "16n", now);
        }
        break;
    }

    // Sparkle overlay on perfect hits
    if (grade === "perfect") {
      this.hitSparkleSynth?.triggerAttackRelease("C6", "32n", now);
    }
  }

  /** Play a short error buzz on miss */
  playMissSound(): void {
    this.hitMissSynth?.triggerAttackRelease("32n", Tone.now());
  }

  start(): void {
    Tone.getTransport().start();
  }

  stop(): void {
    Tone.getTransport().stop();
    Tone.getTransport().position = 0;
    this.lastScheduledTrigger = {};
  }

  pause(): void {
    Tone.getTransport().pause();
  }

  resume(): void {
    Tone.getTransport().start();
  }

  setMusicMode(mode: MusicMode): void {
    this.musicMode = mode;
  }

  getMusicMode(): MusicMode {
    return this.musicMode;
  }

  setTempoMultiplier(multiplier: number): void {
    this.tempoMultiplier = Math.max(TEMPO_MIN, Math.min(TEMPO_MAX, multiplier));
    Tone.getTransport().bpm.value = this.chartBaseBpm * this.tempoMultiplier;
  }

  getTempoMultiplier(): number {
    return this.tempoMultiplier;
  }

  /** Play a countdown tick sound */
  playCountdownTick(isFinal: boolean): void {
    const now = Tone.now();
    if (isFinal) {
      this.hitFmSynth?.triggerAttackRelease("C5", "8n", now);
    } else {
      this.hitMembraneSynth?.triggerAttackRelease("G2", "16n", now);
    }
  }

  /** Set the master volume (in dB, -60 to 0) */
  setVolume(db: number): void {
    Tone.getDestination().volume.value = db;
    if (this.padSynth) this.padSynth.volume.value = Math.min(-18, db - 24);
    if (this.bassSynth) this.bassSynth.volume.value = Math.min(-12, db - 16);
  }

  /** Get the current master volume in dB */
  getVolume(): number {
    return Tone.getDestination().volume.value;
  }

  getCurrentTime(): number {
    return Tone.getTransport().seconds * this.tempoMultiplier;
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
    this.hitMembraneSynth?.dispose();
    this.hitNoiseSynth?.dispose();
    this.hitHihatSynth?.dispose();
    this.hitFmSynth?.dispose();
    this.hitSparkleSynth?.dispose();
    this.hitMissSynth?.dispose();
    this.compressor?.dispose();
    this.reverb?.dispose();
    this.dryChannel?.dispose();
    this.wetChannel?.dispose();
    this.membraneSynth = null;
    this.noiseSynth = null;
    this.hihatSynth = null;
    this.fmSynth = null;
    this.bassSynth = null;
    this.padSynth = null;
    this.hitMembraneSynth = null;
    this.hitNoiseSynth = null;
    this.hitHihatSynth = null;
    this.hitFmSynth = null;
    this.hitSparkleSynth = null;
    this.hitMissSynth = null;
    this.compressor = null;
    this.reverb = null;
    this.dryChannel = null;
    this.wetChannel = null;
    this.isInitialized = false;
  }
}
