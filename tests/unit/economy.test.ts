import { describe, expect, it } from 'vitest';
import { ENEMIES } from '../../src/data/enemies';
import { FLOORS } from '../../src/data/floors';
import { getLevel } from '../../src/data/levels';
import { SELL_REFUND, TOWERS } from '../../src/data/towers';
import { build, buildCost, callWave, sell, sellValue, upgrade, upgradeCost } from '../../src/sim/commands';
import { createGame } from '../../src/sim/create';
import { damageEnemy } from '../../src/sim/enemies';
import { WAVE_BONUS_BASE, WAVE_BONUS_STEP } from '../../src/sim/flow';
import { beginWaveSpawners, spawnersDone, updateSpawners, waveDef } from '../../src/sim/spawn';
import { step } from '../../src/sim/step';
import { arena, put } from './helpers';

describe('économie', () => {
  it('chaque Brumâme abattue rapporte sa prime et compte dans l’or gagné', () => {
    const s = arena(0);
    for (const kind of ['grignot', 'carapace', 'mereBrume'] as const) {
      const e = put(s, kind, 100, 300, { phase: 'climb' });
      const before = s.gold;
      const earned = s.stats.goldEarned;
      damageEnemy(s, e, 1e9, 'phys');
      expect(s.gold - before).toBe(ENEMIES[kind].bounty);
      expect(s.stats.goldEarned - earned).toBe(ENEMIES[kind].bounty);
    }
  });
  it('construire, améliorer puis revendre : l’or suit exactement les coûts', () => {
    const s = createGame(3, 1);
    s.gold = 1000;
    build(s, 0, 'mortier');
    upgrade(s, 0);
    upgrade(s, 0);
    const spent = TOWERS.mortier.levels.reduce((n, l) => n + l.cost, 0);
    expect(s.gold).toBe(1000 - spent);
    sell(s, 0);
    expect(s.gold).toBe(1000 - spent + Math.floor(spent * SELL_REFUND));
  });
  it('les réductions de l’atelier s’appliquent à la construction, aux améliorations et à la revente', () => {
    const s = createGame(3, 1, { startGold: 0, costMul: 0.9, rangeMul: 1, extraLives: 0, damageMul: 1, cooldownMul: 1 });
    s.gold = 1000;
    expect(buildCost(s, 'baliste')).toBe(Math.round(60 * 0.9));
    build(s, 0, 'baliste');
    const t = s.slots[0]!;
    expect(upgradeCost(s, t)).toBe(Math.round(70 * 0.9));
    upgrade(s, 0);
    expect(sellValue(s, t)).toBe(Math.floor(130 * 0.9 * SELL_REFUND));
  });
  it('bonus de fin de vague = base + palier, plus les Comptoirs', () => {
    const s = createGame(1, 1);
    s.floors = ['comptoir', null, null];
    s.waveIndex = 2;
    s.phase = 'wave';
    s.spawners = [];
    const gold = s.gold;
    step(s);
    expect(s.gold - gold).toBe(WAVE_BONUS_BASE + WAVE_BONUS_STEP * 2 + FLOORS.comptoir.goldPerWave);
  });
  it('l’or ne devient jamais négatif quand on enchaîne les achats', () => {
    const s = createGame(1, 1);
    for (let slot = 0; slot < s.slots.length; slot++) build(s, slot, 'baliste');
    for (let slot = 0; slot < s.slots.length; slot++) upgrade(s, slot);
    expect(s.gold).toBeGreaterThanOrEqual(0);
  });
});

describe('vagues', () => {
  it('chaque groupe respecte son délai et son intervalle', () => {
    const s = createGame(1, 1);
    callWave(s);
    const def = waveDef(s, 0)!;
    const g = def.groups[0]!;
    const sp = s.spawners[0]!;
    updateSpawners(s, g.delay - 0.01);
    expect(sp.spawned).toBe(0);
    updateSpawners(s, 0.02);
    expect(sp.spawned).toBe(1);
    if (g.count > 1) {
      updateSpawners(s, g.interval);
      expect(sp.spawned).toBe(2);
    }
  });
  it('les côtés L, R et « both » sont respectés', () => {
    const s = createGame(1, 1);
    s.phase = 'wave';
    s.spawners = [
      { group: { enemy: 'grignot', count: 2, interval: 0, delay: 0, side: 'L' }, spawned: 0, timer: 0 },
      { group: { enemy: 'grignot', count: 2, interval: 0, delay: 0, side: 'R' }, spawned: 0, timer: 0 },
      { group: { enemy: 'grignot', count: 4, interval: 0, delay: 0, side: 'both' }, spawned: 0, timer: 0 },
    ];
    updateSpawners(s, 0.001);
    const sides = s.enemies.map((e) => e.side);
    expect(sides.slice(0, 2)).toEqual([-1, -1]);
    expect(sides.slice(2, 4)).toEqual([1, 1]);
    expect(sides.slice(4)).toEqual([-1, 1, -1, 1]);
    expect(spawnersDone(s)).toBe(true);
  });
  it('chaque vague de chaque niveau fait apparaître exactement le nombre prévu de Brumâmes', () => {
    for (const id of [1, 5, 9]) {
      const level = getLevel(id);
      level.waves.forEach((w, i) => {
        const s = createGame(id, 1);
        s.waveIndex = i;
        s.phase = 'wave';
        beginWaveSpawners(s);
        for (let t = 0; t < 600 && !spawnersDone(s); t++) updateSpawners(s, 0.1);
        const expected = w.groups.reduce((n, g) => n + g.count, 0);
        expect(s.enemies.length).toBe(expected);
      });
    }
  });
});
