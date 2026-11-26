import type { BiomeId, TowerKind } from '../core/types';
import type { GameEvent } from '../sim/state';
import { Music } from './music';
import { midi, noise, noiseBuffer, tone } from './synth';

/** Moteur audio : démarre au premier geste du joueur (règle des navigateurs mobiles). */
export class AudioEngine {
  private ctx: AudioContext | null = null;
  private sfxBus: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private noiseBuf: AudioBuffer | null = null;
  private music: Music | null = null;
  private last = new Map<string, number>();
  private sfxVolume = 0.8;
  private musicVolume = 0.6;
  private pendingTheme: BiomeId | 'menu' = 'menu';

  unlock(): void {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    const ctx = new Ctor();
    this.ctx = ctx;
    const comp = ctx.createDynamicsCompressor();
    comp.connect(ctx.destination);
    this.sfxBus = ctx.createGain();
    this.musicBus = ctx.createGain();
    this.sfxBus.connect(comp);
    this.musicBus.connect(comp);
    this.noiseBuf = noiseBuffer(ctx, 2);
    this.music = new Music(ctx, this.musicBus, this.noiseBuf);
    this.applyVolumes();
    this.music.setTheme(this.pendingTheme);
    this.music.start();
  }

  setVolumes(sfx: number, music: number): void {
    this.sfxVolume = sfx;
    this.musicVolume = music;
    this.applyVolumes();
  }

  private applyVolumes(): void {
    if (!this.ctx || !this.sfxBus || !this.musicBus) return;
    this.sfxBus.gain.value = this.sfxVolume * 0.9;
    this.musicBus.gain.value = this.musicVolume * 0.7;
  }

  setTheme(id: BiomeId | 'menu'): void {
    this.pendingTheme = id;
    this.music?.setTheme(id);
  }

  setIntensity(v: number): void {
    if (this.music) this.music.intensity = v;
  }

  suspend(): void {
    void this.ctx?.suspend();
  }

  resume(): void {
    void this.ctx?.resume();
  }

  /** Limite le nombre de sons identiques simultanés (perf et confort). */
  private gate(key: string, minGap: number): boolean {
    if (!this.ctx) return false;
    const now = this.ctx.currentTime;
    if (now - (this.last.get(key) ?? -1) < minGap) return false;
    this.last.set(key, now);
    return true;
  }

  play(name: 'click' | 'open' | 'deny' | 'won' | 'lost' | 'star'): void {
    const ctx = this.ctx;
    const out = this.sfxBus;
    if (!ctx || !out || !this.gate(name, 0.03)) return;
    const t = ctx.currentTime;
    switch (name) {
      case 'click':
        tone(ctx, out, { type: 'triangle', freq: 880, freqEnd: 1320, start: t, dur: 0.07, gain: 0.12 });
        break;
      case 'open':
        tone(ctx, out, { type: 'sine', freq: 520, freqEnd: 780, start: t, dur: 0.12, gain: 0.12 });
        break;
      case 'deny':
        tone(ctx, out, { type: 'square', freq: 180, freqEnd: 120, start: t, dur: 0.14, gain: 0.06, filter: 900 });
        break;
      case 'star':
        tone(ctx, out, { type: 'triangle', freq: midi(84), start: t, dur: 0.5, gain: 0.15 });
        tone(ctx, out, { type: 'sine', freq: midi(91), start: t + 0.05, dur: 0.6, gain: 0.08 });
        break;
      case 'won':
        [72, 76, 79, 84].forEach((n, i) => tone(ctx, out, { type: 'triangle', freq: midi(n), start: t + i * 0.13, dur: 0.6, gain: 0.14 }));
        break;
      case 'lost':
        [64, 61, 57, 52].forEach((n, i) => tone(ctx, out, { type: 'sine', freq: midi(n), start: t + i * 0.2, dur: 0.7, gain: 0.13, filter: 1200 }));
        break;
    }
  }

  private shot(kind: TowerKind): void {
    const ctx = this.ctx as AudioContext;
    const out = this.sfxBus as GainNode;
    const buf = this.noiseBuf as AudioBuffer;
    const t = ctx.currentTime;
    if (kind === 'baliste' && this.gate('baliste', 0.05)) {
      tone(ctx, out, { type: 'triangle', freq: 300, freqEnd: 120, start: t, dur: 0.09, gain: 0.08 });
      noise(ctx, out, buf, t, 0.06, 0.06, 2500, 2);
    } else if (kind === 'mortier' && this.gate('mortier', 0.08)) {
      tone(ctx, out, { type: 'sine', freq: 140, freqEnd: 50, start: t, dur: 0.25, gain: 0.25 });
      noise(ctx, out, buf, t, 0.18, 0.1, 400, 1, 'lowpass');
    } else if (kind === 'bobine' && this.gate('bobine', 0.06)) {
      noise(ctx, out, buf, t, 0.16, 0.12, 3200, 4);
      tone(ctx, out, { type: 'sawtooth', freq: 900, freqEnd: 200, start: t, dur: 0.12, gain: 0.04, filter: 3000 });
    }
  }

  onEvent(ev: GameEvent): void {
    const ctx = this.ctx;
    const out = this.sfxBus;
    const buf = this.noiseBuf;
    if (!ctx || !out || !buf) return;
    const t = ctx.currentTime;
    switch (ev.type) {
      case 'shot':
        this.shot(ev.kind);
        break;
      case 'explosion':
        if (this.gate('boom', 0.06)) noise(ctx, out, buf, t, 0.4, 0.22, 300, 0.7, 'lowpass');
        break;
      case 'pulse':
        if (this.gate('pulse', 0.1)) {
          tone(ctx, out, { type: 'sine', freq: midi(88), start: t, dur: 0.9, gain: 0.06 });
          tone(ctx, out, { type: 'sine', freq: midi(95), start: t, dur: 0.7, gain: 0.03 });
        }
        break;
      case 'kill':
        if (this.gate('kill', 0.04)) tone(ctx, out, { type: 'triangle', freq: midi(76 + Math.floor(Math.random() * 3) * 2), start: t, dur: 0.16, gain: 0.07 });
        break;
      case 'leak':
        if (this.gate('leak', 0.1)) {
          tone(ctx, out, { type: 'sawtooth', freq: 220, freqEnd: 90, start: t, dur: 0.35, gain: 0.1, filter: 1400 });
          noise(ctx, out, buf, t, 0.3, 0.12, 900, 1);
        }
        break;
      case 'build':
        [0, 4, 7].forEach((d, i) => tone(ctx, out, { type: 'triangle', freq: midi(72 + d + (ev.level - 1) * 2), start: t + i * 0.05, dur: 0.22, gain: 0.09 }));
        break;
      case 'sell':
        tone(ctx, out, { type: 'triangle', freq: midi(79), freqEnd: midi(67), start: t, dur: 0.2, gain: 0.08 });
        break;
      case 'waveStart':
        tone(ctx, out, { type: 'sawtooth', freq: midi(50), start: t, dur: 0.9, gain: 0.09, attack: 0.08, filter: 800 });
        tone(ctx, out, { type: 'sawtooth', freq: midi(57), start: t + 0.12, dur: 0.9, gain: 0.07, attack: 0.08, filter: 800 });
        break;
      case 'waveEnd':
        [79, 83, 86].forEach((n, i) => tone(ctx, out, { type: 'sine', freq: midi(n), start: t + i * 0.09, dur: 0.5, gain: 0.08 }));
        break;
      case 'grow':
        [60, 67, 72, 79].forEach((n, i) => tone(ctx, out, { type: 'triangle', freq: midi(n), start: t + i * 0.08, dur: 0.6, gain: 0.08 }));
        break;
      case 'emerge':
        if (this.gate('emerge', 0.1)) noise(ctx, out, buf, t, 0.35, 0.12, 200, 1, 'lowpass');
        break;
      case 'disable':
        tone(ctx, out, { type: 'sine', freq: 600, freqEnd: 200, start: t, dur: 0.5, gain: 0.07 });
        break;
      case 'ability':
        if (ev.kind === 'eclat') {
          tone(ctx, out, { type: 'triangle', freq: midi(84), freqEnd: midi(96), start: t, dur: 0.5, gain: 0.14 });
          noise(ctx, out, buf, t, 0.6, 0.12, 5000, 0.8);
        } else noise(ctx, out, buf, t, 1.0, 0.2, 700, 0.5);
        break;
      case 'won':
        this.play('won');
        break;
      case 'lost':
        this.play('lost');
        break;
      default:
        break;
    }
  }
}
