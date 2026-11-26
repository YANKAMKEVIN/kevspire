import { describe, expect, it } from 'vitest';
import { FLOOR_H, heartPos } from '../../src/data/geometry';
import { ECLAT_RADIUS, useAbility } from '../../src/sim/commands';
import { createGame } from '../../src/sim/create';
import { arena, put, run } from './helpers';

describe('pouvoirs', () => {
  it('l’Éclat étourdit et blesse dans son rayon seulement', () => {
    const s = arena();
    const near = put(s, 'carapace', 100, 300, { phase: 'climb' });
    const far = put(s, 'carapace', 100, 300 + ECLAT_RADIUS * 2, { phase: 'climb' });
    near.hp = far.hp = near.maxHp = far.maxHp = 5000;
    expect(useAbility(s, 'eclat', 100, 300).ok).toBe(true);
    expect(near.stunTimer).toBeGreaterThan(0);
    expect(near.hp).toBeLessThan(5000);
    expect(far.stunTimer).toBe(0);
    expect(far.hp).toBe(5000);
  });
  it('le boss est moins longtemps étourdi', () => {
    const s = arena();
    const boss = put(s, 'mereBrume', 100, 300, { phase: 'climb' });
    const small = put(s, 'grignot', 110, 300, { phase: 'climb' });
    useAbility(s, 'eclat', 100, 300);
    expect(boss.stunTimer).toBeLessThan(small.stunTimer);
  });
  it('un pouvoir se recharge', () => {
    const s = arena();
    put(s, 'carapace', 0, 50, { phase: 'climb', stunTimer: 999 });
    useAbility(s, 'eclat', 0, 0);
    expect(useAbility(s, 'eclat', 0, 0)).toEqual({ ok: false, reason: 'recharge' });
    run(s, s.abilities.eclat.maxCooldown + 0.1);
    expect(useAbility(s, 'eclat', 0, 0).ok).toBe(true);
  });
  it('la Rafale fait redescendre les grimpeurs et repousse les volants', () => {
    const s = arena();
    const climber = put(s, 'grignot', 80, FLOOR_H * 2.5, { phase: 'climb' });
    const h = heartPos(s.floors.length);
    const flier = put(s, 'papillombre', h.x + 100, h.y + 100);
    const d0 = Math.hypot(flier.x - h.x, flier.y - h.y);
    useAbility(s, 'rafale');
    expect(climber.y).toBeCloseTo(FLOOR_H * 1.5);
    expect(Math.hypot(flier.x - h.x, flier.y - h.y)).toBeGreaterThan(d0 + 100);
  });
  it('les pouvoirs ne servent qu’en pleine vague', () => {
    const s = createGame(1, 1);
    expect(useAbility(s, 'rafale').ok).toBe(false);
  });
  it('« Vents complices » raccourcit la recharge', () => {
    const s = createGame(1, 1, { startGold: 0, costMul: 1, rangeMul: 1, extraLives: 0, damageMul: 1, cooldownMul: 0.7 });
    const t = createGame(1, 1);
    expect(s.abilities.rafale.maxCooldown).toBeCloseTo(t.abilities.rafale.maxCooldown * 0.7);
  });
});
