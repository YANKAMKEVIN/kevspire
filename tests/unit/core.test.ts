import { describe, expect, it } from 'vitest';
import { clamp, dist, easeOutCubic, fnv1a, lerp } from '../../src/core/math';
import { createRng, intRange, nextFloat, pick, range, sample } from '../../src/core/rng';

describe('rng', () => {
  it('est déterministe pour une même graine', () => {
    const a = createRng(123);
    const b = createRng(123);
    for (let i = 0; i < 100; i++) expect(nextFloat(a)).toBe(nextFloat(b));
  });
  it('produit des valeurs différentes selon la graine', () => {
    expect(nextFloat(createRng(1))).not.toBe(nextFloat(createRng(2)));
  });
  it('reste dans [0, 1)', () => {
    const r = createRng(7);
    for (let i = 0; i < 5000; i++) {
      const v = nextFloat(r);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
  it('respecte les bornes de range et intRange', () => {
    const r = createRng(9);
    for (let i = 0; i < 1000; i++) {
      const f = range(r, 5, 6);
      expect(f >= 5 && f < 6).toBe(true);
      const n = intRange(r, 1, 3);
      expect([1, 2, 3]).toContain(n);
    }
  });
  it('sample tire des éléments distincts', () => {
    const r = createRng(3);
    const out = sample(r, [1, 2, 3, 4, 5], 3);
    expect(new Set(out).size).toBe(3);
    expect(sample(r, [1, 2], 5)).toHaveLength(2);
  });
  it('pick refuse une liste vide', () => {
    expect(() => pick(createRng(1), [])).toThrow();
  });
  it('a un état sérialisable', () => {
    const r = createRng(55);
    nextFloat(r);
    const copy = JSON.parse(JSON.stringify(r));
    expect(nextFloat(copy)).toBe(nextFloat(r));
  });
});

describe('math', () => {
  it('clamp, lerp, dist', () => {
    expect(clamp(5, 0, 3)).toBe(3);
    expect(clamp(-1, 0, 3)).toBe(0);
    expect(lerp(0, 10, 0.25)).toBe(2.5);
    expect(dist(0, 0, 3, 4)).toBe(5);
    expect(easeOutCubic(1)).toBe(1);
  });
  it('fnv1a est stable et sensible au moindre changement', () => {
    expect(fnv1a('kevspire')).toBe(fnv1a('kevspire'));
    expect(fnv1a('kevspire')).not.toBe(fnv1a('kevspirf'));
    expect(fnv1a('')).toHaveLength(8);
  });
});
