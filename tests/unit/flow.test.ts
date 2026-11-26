import { describe, expect, it } from 'vitest';
import { getLevel } from '../../src/data/levels';
import { callWave, chooseFloor } from '../../src/sim/commands';
import { createGame } from '../../src/sim/create';
import { endlessHpScale, endlessWave } from '../../src/sim/endless';
import { WAVE_BONUS_BASE } from '../../src/sim/flow';
import { enemyHp, spawnersDone } from '../../src/sim/spawn';
import { advance, step } from '../../src/sim/step';

function killAll(s: ReturnType<typeof createGame>): void {
  for (const e of s.enemies) e.hp = 0;
}

describe('déroulé des vagues', () => {
  it('fait apparaître tout le contenu d’une vague', () => {
    const s = createGame(1, 1);
    callWave(s);
    const expected = getLevel(1).waves[0]!.groups.reduce((n, g) => n + g.count, 0);
    let spawned = 0;
    for (let i = 0; i < 60 * 30; i++) {
      step(s);
      spawned += s.events.filter((e) => e.type === 'spawn').length;
      s.events.length = 0;
      for (const e of s.enemies) e.hp = Math.max(e.hp, 1);
      if (spawnersDone(s)) break;
    }
    expect(spawned).toBe(expected);
  });
  it('fin de vague : bonus d’or puis choix d’étage', () => {
    const s = createGame(1, 1);
    callWave(s);
    advance(s, 20);
    killAll(s);
    const gold = s.gold;
    while (!spawnersDone(s)) {
      step(s);
      killAll(s);
    }
    step(s);
    expect(s.phase).toBe('choose');
    expect(s.gold).toBeGreaterThanOrEqual(gold + WAVE_BONUS_BASE);
    expect(s.floorChoices).toHaveLength(3);
    expect(new Set(s.floorChoices).size).toBe(3);
    const floors = s.floors.length;
    chooseFloor(s, 0);
    expect(s.floors.length).toBe(floors + 1);
  });
  it('la vague suivante démarre seule à la fin du compte à rebours', () => {
    const s = createGame(1, 1);
    s.waveIndex = 1;
    s.countdown = 2;
    advance(s, 2.1);
    expect(s.phase).toBe('wave');
  });
  it('victoire après la dernière vague', () => {
    const s = createGame(1, 1);
    s.waveIndex = getLevel(1).waves.length - 1;
    callWave(s);
    for (let i = 0; i < 60 * 60 && s.phase === 'wave'; i++) {
      step(s);
      killAll(s);
    }
    expect(s.phase).toBe('won');
  });
  it('défaite quand le Cœur n’a plus de vies', () => {
    const s = createGame(1, 1);
    callWave(s);
    s.lives = 1;
    advance(s, 120);
    expect(s.phase).toBe('lost');
    expect(s.lives).toBe(0);
  });
  it('la simulation s’arrête pendant le choix d’étage', () => {
    const s = createGame(1, 1);
    s.phase = 'choose';
    const t = s.time;
    advance(s, 3);
    expect(s.time).toBe(t);
  });
  it('les Sanctuaires soignent et les Comptoirs rapportent en fin de vague', () => {
    const s = createGame(1, 1);
    s.floors.push('sanctuaire', 'comptoir');
    s.lives = 10;
    callWave(s);
    s.spawners = [];
    const gold = s.gold;
    step(s);
    expect(s.lives).toBe(11);
    expect(s.gold).toBe(gold + WAVE_BONUS_BASE + 20);
  });
  it('les PV montent avec les vagues', () => {
    const s = createGame(5, 1);
    const a = enemyHp(s, 'grignot');
    s.waveIndex = 5;
    expect(enemyHp(s, 'grignot')).toBeGreaterThan(a);
  });
});

describe('Ascension infinie', () => {
  it('les vagues grossissent et les PV augmentent', () => {
    const count = (i: number) => endlessWave(i).groups.reduce((n, g) => n + g.count, 0);
    expect(count(10)).toBeGreaterThan(count(1));
    expect(endlessHpScale(10)).toBeGreaterThan(endlessHpScale(1));
    expect(endlessWave(4).groups.some((g) => g.enemy === 'mereBrume')).toBe(true);
  });
  it('ne se termine jamais par une victoire', () => {
    const s = createGame(100, 1);
    expect(s.endless).toBe(true);
    expect(s.totalWaves).toBe(Number.POSITIVE_INFINITY);
  });
});
