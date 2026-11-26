import { describe, expect, it } from 'vitest';
import { slotId } from '../../src/data/geometry';
import { TOWERS } from '../../src/data/towers';
import { build, buildCost, callWave, chooseFloor, sell, sellValue, slotAvailable, upgrade, upgradeCost } from '../../src/sim/commands';
import { createGame } from '../../src/sim/create';
import { arena } from './helpers';

describe('construction', () => {
  it('construit une tourelle et débite l’or', () => {
    const s = createGame(1, 1);
    const before = s.gold;
    expect(build(s, 0, 'baliste').ok).toBe(true);
    expect(s.gold).toBe(before - TOWERS.baliste.levels[0].cost);
    expect(s.slots[0]?.kind).toBe('baliste');
    expect(s.events.some((e) => e.type === 'build')).toBe(true);
  });
  it('refuse sans or, sur un emplacement occupé ou inexistant', () => {
    const s = createGame(1, 1);
    s.gold = 10;
    expect(build(s, 0, 'baliste')).toEqual({ ok: false, reason: 'or' });
    s.gold = 1000;
    build(s, 0, 'baliste');
    expect(build(s, 0, 'cloche')).toEqual({ ok: false, reason: 'occupé' });
    expect(build(s, slotId(4, -1), 'cloche')).toEqual({ ok: false, reason: 'emplacement' });
    expect(build(s, -3, 'cloche').ok).toBe(false);
  });
  it('les balcons n’existent que sur les étages construits', () => {
    const s = createGame(1, 1);
    expect(s.floors).toHaveLength(2);
    expect(slotAvailable(s, slotId(1, 1))).toBe(true);
    expect(slotAvailable(s, slotId(2, -1))).toBe(false);
    expect(slotAvailable(s, 0)).toBe(true);
  });
  it('améliore jusqu’au niveau 3 puis refuse', () => {
    const s = arena();
    build(s, 0, 'mortier');
    expect(upgrade(s, 0).ok).toBe(true);
    expect(upgrade(s, 0).ok).toBe(true);
    expect(s.slots[0]?.level).toBe(3);
    expect(upgrade(s, 0)).toEqual({ ok: false, reason: 'max' });
    expect(upgradeCost(s, s.slots[0]!)).toBeNull();
  });
  it('la revente rend 70 % de l’investissement', () => {
    const s = arena();
    build(s, 0, 'baliste');
    upgrade(s, 0);
    const value = sellValue(s, s.slots[0]!);
    const invested = TOWERS.baliste.levels[0].cost + TOWERS.baliste.levels[1].cost;
    expect(value).toBe(Math.floor(invested * 0.7));
    const gold = s.gold;
    expect(sell(s, 0).ok).toBe(true);
    expect(s.gold).toBe(gold + value);
    expect(s.slots[0]).toBeNull();
    expect(sell(s, 0).ok).toBe(false);
  });
  it('applique la réduction de coût de l’atelier', () => {
    const s = createGame(1, 1, { startGold: 0, costMul: 0.9, rangeMul: 1, extraLives: 0, damageMul: 1, cooldownMul: 1 });
    expect(buildCost(s, 'baliste')).toBe(Math.round(60 * 0.9));
  });
  it('aucune commande de construction pendant le choix d’étage ou après la partie', () => {
    const s = arena();
    s.phase = 'choose';
    expect(build(s, 0, 'baliste').ok).toBe(false);
    s.phase = 'won';
    expect(upgrade(s, 0).ok).toBe(false);
    expect(sell(s, 0).ok).toBe(false);
  });
});

describe('appel de vague et choix d’étage', () => {
  it('la première vague se lance sans bonus', () => {
    const s = createGame(1, 1);
    const gold = s.gold;
    expect(callWave(s).ok).toBe(true);
    expect(s.phase).toBe('wave');
    expect(s.gold).toBe(gold);
    expect(callWave(s).ok).toBe(false);
  });
  it('appeler une vague en avance rapporte de l’or (plafonné)', () => {
    const s = createGame(1, 1);
    s.waveIndex = 2;
    s.countdown = 10;
    const gold = s.gold;
    callWave(s);
    expect(s.gold).toBe(gold + 20);
    const t = createGame(1, 1);
    t.waveIndex = 1;
    t.countdown = 500;
    const g2 = t.gold;
    callWave(t);
    expect(t.gold - g2).toBe(40);
  });
  it('chooseFloor ajoute l’étage choisi', () => {
    const s = createGame(1, 1);
    s.phase = 'choose';
    s.floorChoices = ['atelier', 'rempart', 'comptoir'];
    expect(chooseFloor(s, 1).ok).toBe(true);
    expect(s.floors[s.floors.length - 1]).toBe('rempart');
    expect(s.phase).toBe('prep');
    expect(chooseFloor(s, 0).ok).toBe(false);
  });
});
