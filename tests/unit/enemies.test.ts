import { describe, expect, it } from 'vitest';
import { ENEMIES } from '../../src/data/enemies';
import { FLOOR_H, heartPos, slotId, slotPos, towerTop } from '../../src/data/geometry';
import { build } from '../../src/sim/commands';
import { remainingDistance } from '../../src/sim/enemies';
import { spawnEnemy } from '../../src/sim/spawn';
import { arena, put, run } from './helpers';

describe('déplacements', () => {
  it('un grimpeur marche, escalade, atteint le Cœur et retire une vie', () => {
    const s = arena();
    const e = spawnEnemy(s, 'grignot', -1);
    e.hp = e.maxHp = 1e6;
    expect(e.phase).toBe('walk');
    run(s, 3);
    expect(['walk', 'climb']).toContain(e.phase);
    let seen = new Set<string>();
    for (let i = 0; i < 60 * 60 && s.enemies.length > 0; i++) {
      run(s, 1 / 60);
      seen.add(e.phase);
    }
    expect(seen.has('climb')).toBe(true);
    expect(seen.has('top')).toBe(true);
    expect(s.lives).toBe(s.maxLives - ENEMIES.grignot.leak);
    expect(s.stats.leaked).toBe(1);
    seen = new Set();
  });
  it('un volant fonce vers le Cœur', () => {
    const s = arena();
    const e = spawnEnemy(s, 'papillombre', 1);
    const h = heartPos(s.floors.length);
    const d0 = Math.hypot(e.x - h.x, e.y - h.y);
    run(s, 2);
    expect(Math.hypot(e.x - h.x, e.y - h.y)).toBeLessThan(d0);
    expect(e.y).toBeGreaterThan(0);
  });
  it('un volant n’apparaît jamais sous l’île', () => {
    const s = arena();
    for (let i = 0; i < 200; i++) expect(spawnEnemy(s, 'moucheron', 1).y).toBeGreaterThan(towerTop(s.floors.length) * 0.5);
  });
  it('un Fouisseur surgit à mi-hauteur puis grimpe', () => {
    const s = arena();
    const e = spawnEnemy(s, 'fouisseur', -1);
    e.hp = e.maxHp = 1e6;
    let emerged = false;
    for (let i = 0; i < 60 * 30 && !emerged; i++) {
      run(s, 1 / 60);
      emerged = s.events.some((ev) => ev.type === 'emerge');
    }
    expect(emerged).toBe(true);
    expect(e.phase).toBe('climb');
    expect(e.y).toBeGreaterThan(FLOOR_H * 0.3);
    expect(e.y).toBeLessThan(towerTop(s.floors.length));
  });
  it('un Planeur endort la tourelle qu’il frôle', () => {
    const s = arena();
    const slot = slotId(2, 1);
    build(s, slot, 'baliste');
    s.slots[slot]!.cooldown = 999;
    const p = slotPos(slot, s.floors.length);
    const e = put(s, 'planeur', p.x + 30, p.y + 40, { targetSlot: slot });
    e.hp = e.maxHp = 1e6;
    run(s, 2);
    expect(s.slots[slot]!.disabled).toBeGreaterThan(0);
    expect(s.events.some((ev) => ev.type === 'disable')).toBe(true);
    expect(e.targetSlot).toBe(-1);
  });
  it('la Mère-Brume relâche des Grignots en grimpant', () => {
    const s = arena();
    const boss = put(s, 'mereBrume', 100, 200, { phase: 'climb', timer: 0.1 });
    boss.hp = boss.maxHp = 1e7;
    run(s, 0.5);
    expect(s.enemies.filter((e) => e.kind === 'grignot').length).toBe(2);
  });
  it('le Rempart ralentit les grimpeurs sur son mur', () => {
    const plain = arena();
    const thorn = arena();
    thorn.floors[1] = 'rempart';
    const a = put(plain, 'grignot', 80, FLOOR_H * 1.1, { phase: 'climb' });
    const b = put(thorn, 'grignot', 80, FLOOR_H * 1.1, { phase: 'climb' });
    run(plain, 1);
    run(thorn, 1);
    expect(b.y - FLOOR_H * 1.1).toBeCloseTo((a.y - FLOOR_H * 1.1) * 0.65, 0);
  });
  it('la distance restante diminue en grimpant', () => {
    const s = arena();
    const e = put(s, 'grignot', 80, 100, { phase: 'climb' });
    const d0 = remainingDistance(s, e);
    run(s, 1);
    expect(remainingDistance(s, e)).toBeLessThan(d0);
  });
  it('un ennemi étourdi ne bouge plus', () => {
    const s = arena();
    const e = put(s, 'grignot', 80, 100, { phase: 'climb', stunTimer: 1 });
    run(s, 0.5);
    expect(e.y).toBe(100);
  });
});
