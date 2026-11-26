import type { BiomeId } from '../core/types';
import { midi, noise, tone } from './synth';

interface Theme {
  root: number;
  /** Degrés (demi-tons) de la gamme pentatonique utilisée pour l'arpège. */
  scale: number[];
  /** Progression d'accords (décalages depuis la tonique). */
  chords: number[][];
  bpm: number;
}

const THEMES: Record<BiomeId | 'menu', Theme> = {
  menu: { root: 57, scale: [0, 2, 4, 7, 9, 12, 14], chords: [[0, 4, 7], [-3, 0, 4], [5, 9, 12], [7, 11, 14]], bpm: 76 },
  crepuscule: { root: 60, scale: [0, 2, 4, 7, 9, 12, 16], chords: [[0, 4, 7], [9, 12, 16], [5, 9, 12], [7, 11, 14]], bpm: 88 },
  nuit: { root: 57, scale: [0, 3, 5, 7, 10, 12, 15], chords: [[0, 3, 7], [-4, 0, 3], [-2, 2, 5], [-5, -1, 2]], bpm: 84 },
  orage: { root: 55, scale: [0, 3, 5, 6, 7, 10, 12], chords: [[0, 3, 7], [1, 5, 8], [-2, 2, 5], [0, 3, 7]], bpm: 100 },
};

/** Musique générative : nappe d'accords, arpège pincé, basse, et percussions en combat. */
export class Music {
  private theme: Theme = THEMES.menu;
  private nextTime = 0;
  private stepIndex = 0;
  private timer: ReturnType<typeof setInterval> | null = null;
  intensity = 0;

  constructor(private ctx: AudioContext, private out: AudioNode, private noiseBuf: AudioBuffer) {}

  setTheme(id: BiomeId | 'menu'): void {
    this.theme = THEMES[id];
  }

  start(): void {
    if (this.timer) return;
    this.nextTime = this.ctx.currentTime + 0.1;
    this.timer = setInterval(() => this.schedule(), 90);
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  private schedule(): void {
    const ctx = this.ctx;
    const th = this.theme;
    const stepDur = 60 / th.bpm / 2; // croches
    while (this.nextTime < ctx.currentTime + 0.3) {
      const t = this.nextTime;
      const s = this.stepIndex;
      const bar = Math.floor(s / 8) % th.chords.length;
      const chord = th.chords[bar] as number[];
      if (s % 8 === 0) {
        for (const n of chord) {
          tone(ctx, this.out, { type: 'triangle', freq: midi(th.root - 12 + n), start: t, dur: stepDur * 8.2, gain: 0.045, attack: 0.6, filter: 900, detune: (Math.random() - 0.5) * 10 });
        }
        tone(ctx, this.out, { type: 'sine', freq: midi(th.root - 24 + (chord[0] as number)), start: t, dur: stepDur * 3.5, gain: 0.12, attack: 0.02 });
      }
      if (s % 8 === 4 && this.intensity > 0.3) {
        tone(ctx, this.out, { type: 'sine', freq: midi(th.root - 24 + (chord[0] as number)), start: t, dur: stepDur * 2, gain: 0.09 });
      }
      // Arpège : plus dense quand l'action monte.
      const density = 0.45 + this.intensity * 0.45;
      if ((s % 2 === 0 || this.intensity > 0.5) && Math.random() < density) {
        const deg = th.scale[(s * 3 + bar * 2 + Math.floor(Math.random() * 2)) % th.scale.length] as number;
        tone(ctx, this.out, { type: 'triangle', freq: midi(th.root + 12 + deg), start: t, dur: stepDur * 1.6, gain: 0.03 + 0.02 * this.intensity, filter: 2600 });
      }
      if (this.intensity > 0.3) {
        if (s % 4 === 0) noise(ctx, this.out, this.noiseBuf, t, 0.12, 0.08 * this.intensity, 120, 1, 'lowpass');
        if (s % 2 === 1) noise(ctx, this.out, this.noiseBuf, t, 0.04, 0.025 * this.intensity, 8000, 1, 'highpass');
      }
      this.nextTime += stepDur;
      this.stepIndex++;
    }
  }
}
