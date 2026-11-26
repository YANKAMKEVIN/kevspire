/** Briques de synthèse WebAudio (aucun fichier son : tout est généré). */
export function noiseBuffer(ctx: BaseAudioContext, seconds = 1): AudioBuffer {
  const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * seconds), ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return buf;
}

export interface ToneOpts {
  type?: OscillatorType;
  freq: number;
  freqEnd?: number;
  start: number;
  dur: number;
  gain: number;
  attack?: number;
  filter?: number;
  detune?: number;
}

export function tone(ctx: AudioContext, out: AudioNode, o: ToneOpts): void {
  const osc = ctx.createOscillator();
  const amp = ctx.createGain();
  osc.type = o.type ?? 'sine';
  osc.frequency.setValueAtTime(o.freq, o.start);
  if (o.freqEnd) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.freqEnd), o.start + o.dur);
  if (o.detune) osc.detune.value = o.detune;
  const a = o.attack ?? 0.005;
  amp.gain.setValueAtTime(0.0001, o.start);
  amp.gain.exponentialRampToValueAtTime(o.gain, o.start + a);
  amp.gain.exponentialRampToValueAtTime(0.0001, o.start + o.dur);
  let node: AudioNode = osc;
  if (o.filter) {
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = o.filter;
    osc.connect(f);
    node = f;
  }
  node.connect(amp).connect(out);
  osc.start(o.start);
  osc.stop(o.start + o.dur + 0.05);
}

export function noise(ctx: AudioContext, out: AudioNode, buf: AudioBuffer, start: number, dur: number, gain: number, freq: number, q = 1, type: BiquadFilterType = 'bandpass'): void {
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q;
  const amp = ctx.createGain();
  amp.gain.setValueAtTime(gain, start);
  amp.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  src.connect(f).connect(amp).connect(out);
  src.start(start, Math.random() * 0.5);
  src.stop(start + dur + 0.05);
}

export const midi = (n: number): number => 440 * Math.pow(2, (n - 69) / 12);
