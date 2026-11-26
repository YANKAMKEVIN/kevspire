/** Générateur pseudo-aléatoire déterministe (mulberry32), à état sérialisable. */
export interface RngState {
  s: number;
}

export function createRng(seed: number): RngState {
  return { s: seed >>> 0 || 0x9e3779b9 };
}

/** Renvoie un flottant dans [0, 1). Fait avancer l'état. */
export function nextFloat(r: RngState): number {
  r.s = (r.s + 0x6d2b79f5) >>> 0;
  let t = r.s;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function range(r: RngState, min: number, max: number): number {
  return min + (max - min) * nextFloat(r);
}

export function intRange(r: RngState, min: number, maxInclusive: number): number {
  return min + Math.floor(nextFloat(r) * (maxInclusive - min + 1));
}

export function pick<T>(r: RngState, items: readonly T[]): T {
  if (items.length === 0) throw new Error('pick: liste vide');
  return items[Math.floor(nextFloat(r) * items.length)] as T;
}

/** Tire `n` éléments distincts (ou moins si la liste est plus courte). */
export function sample<T>(r: RngState, items: readonly T[], n: number): T[] {
  const pool = items.slice();
  const out: T[] = [];
  while (out.length < n && pool.length > 0) {
    const i = Math.floor(nextFloat(r) * pool.length);
    out.push(pool.splice(i, 1)[0] as T);
  }
  return out;
}
