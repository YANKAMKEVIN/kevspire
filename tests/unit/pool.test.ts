import { beforeEach, describe, expect, it } from 'vitest';
import { botTick } from '../../src/bot/bot';
import { slotId, slotPos } from '../../src/data/geometry';
import { build } from '../../src/sim/commands';
import { createGame } from '../../src/sim/create';
import { poolStats, resetPools } from '../../src/sim/pool';
import type { GameState } from '../../src/sim/state';
import { step } from '../../src/sim/step';
import { towerStats } from '../../src/sim/towers';
import { arena, put, run } from './helpers';

/** Joue au bot en comptant les tirs et le maximum d'objets vivants en même temps. */
function playCounting(s: GameState, seconds: number) {
  let shots = 0;
  let spawns = 0;
  let peakProjectiles = 0;
  let peakEnemies = 0;
  const steps = Math.round(seconds * 60);
  for (let i = 0; i < steps && s.phase !== 'won' && s.phase !== 'lost'; i++) {
    if (i % 15 === 0) botTick(s);
    step(s);
    for (const ev of s.events) {
      if (ev.type === 'shot') shots++;
      if (ev.type === 'spawn') spawns++;
    }
    s.events.length = 0;
    peakProjectiles = Math.max(peakProjectiles, s.projectiles.length);
    peakEnemies = Math.max(peakEnemies, s.enemies.length);
  }
  return { shots, spawns, peakProjectiles, peakEnemies };
}

describe('réserves d’objets (perf mobile)', () => {
  beforeEach(() => resetPools());

  it('les projectiles sont recyclés : on n’alloue pas un objet par tir', () => {
    const s = createGame(5, 3);
    const r = playCounting(s, 400);
    expect(r.shots).toBeGreaterThan(300);
    // Pas plus d'objets créés que le pic de projectiles simultanés (+2 balistes doubles).
    expect(poolStats.projectilesCreated).toBeLessThanOrEqual(r.peakProjectiles + 2);
    expect(poolStats.projectilesCreated).toBeLessThan(r.shots / 5);
  });

  it('les Brumâmes sont recyclées d’une vague à l’autre', () => {
    const s = createGame(8, 3);
    const r = playCounting(s, 600);
    expect(r.spawns).toBeGreaterThan(100);
    expect(poolStats.enemiesCreated).toBeLessThanOrEqual(r.peakEnemies + 4);
  });

  it('le recyclage ne change pas la partie : deux parties identiques, réserve vide ou pleine', () => {
    const a = createGame(4, 9);
    playCounting(a, 200);
    const b = createGame(4, 9);
    playCounting(b, 200);
    expect(JSON.stringify({ ...b, events: [] })).toBe(JSON.stringify({ ...a, events: [] }));
  });

  it('une Brumâme réutilisée repart de zéro (aucun reste de l’ancienne vie)', () => {
    const s = arena();
    const old = put(s, 'carapace', 100, 300, { slowTimer: 5, slowAmount: 0.5, stunTimer: 3, targetSlot: 4 });
    old.hp = 0;
    run(s, 1 / 60);
    expect(s.enemies).not.toContain(old);
    const fresh = put(s, 'grignot', 400, 100);
    expect(fresh).toBe(old);
    expect(fresh.kind).toBe('grignot');
    expect(fresh.hp).toBeGreaterThan(0);
    expect(fresh.slowTimer).toBe(0);
    expect(fresh.stunTimer).toBe(0);
    expect(fresh.targetSlot).toBe(-1);
  });

  it('towerStats peut écrire dans un objet fourni sans changer le résultat', () => {
    const s = arena();
    const slot = slotId(1, -1);
    build(s, slot, 'mortier');
    const t = s.slots[slot]!;
    const out = towerStats(s, slot, t);
    const reused = towerStats(s, slot, t, { cost: 9, damage: 9, rate: 9, range: 9, radius: 9, slow: 9, targets: 9, x: 9, y: 9 });
    expect(reused).toEqual(out);
    expect(out.x).toBe(slotPos(slot, s.floors.length).x);
  });
});
