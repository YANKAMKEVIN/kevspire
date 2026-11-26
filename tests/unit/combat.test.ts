import { describe, expect, it } from 'vitest';
import { slotId, slotPos } from '../../src/data/geometry';
import { build, upgrade } from '../../src/sim/commands';
import { damageEnemy } from '../../src/sim/enemies';
import { findTarget, towerStats } from '../../src/sim/towers';
import { arena, put, run } from './helpers';

const LEFT1 = slotId(1, -1);

describe('tourelles', () => {
  it('une Baliste abat un Grignot qui grimpe à portée', () => {
    const s = arena();
    build(s, LEFT1, 'baliste');
    const p = slotPos(LEFT1, s.floors.length);
    const e = put(s, 'grignot', p.x + 30, p.y - 60, { phase: 'climb' });
    run(s, 4);
    expect(e.hp).toBeLessThanOrEqual(0);
    expect(s.stats.kills).toBe(1);
  });
  it('le Mortier ignore les volants', () => {
    const s = arena();
    build(s, LEFT1, 'mortier');
    const p = slotPos(LEFT1, s.floors.length);
    put(s, 'papillombre', p.x + 120, p.y + 60);
    const tower = s.slots[LEFT1]!;
    expect(findTarget(s, tower, towerStats(s, LEFT1, tower))).toBeNull();
  });
  it('le Mortier inflige des dégâts de zone', () => {
    const s = arena();
    build(s, LEFT1, 'mortier');
    const p = slotPos(LEFT1, s.floors.length);
    const a = put(s, 'carapace', p.x + 70, p.y + 100, { phase: 'climb' });
    const b = put(s, 'carapace', p.x + 80, p.y + 110, { phase: 'climb' });
    a.hp = b.hp = 5000;
    a.maxHp = b.maxHp = 5000;
    run(s, 2.5);
    expect(a.hp).toBeLessThan(5000);
    expect(b.hp).toBeLessThan(5000);
  });
  it('la Cloche ralentit les ennemis proches', () => {
    const s = arena();
    build(s, LEFT1, 'cloche');
    const p = slotPos(LEFT1, s.floors.length);
    const e = put(s, 'grignot', p.x + 40, p.y, { phase: 'climb' });
    e.hp = e.maxHp = 9999;
    run(s, 0.6);
    expect(e.slowTimer).toBeGreaterThan(0);
    expect(e.slowAmount).toBeCloseTo(0.35);
  });
  it('le Phare chauffe : ses dégâts augmentent en restant sur la même cible', () => {
    const s = arena();
    build(s, LEFT1, 'phare');
    const p = slotPos(LEFT1, s.floors.length);
    const e = put(s, 'carapace', p.x + 60, p.y, { phase: 'climb' });
    e.hp = e.maxHp = 1e6;
    e.stunTimer = 999;
    run(s, 0.5);
    const early = 1e6 - e.hp;
    const mid = e.hp;
    run(s, 2.5);
    run(s, 0.5);
    const late = mid - e.hp;
    expect(late / 3).toBeGreaterThan(early);
  });
  it('la Bobine enchaîne plusieurs cibles', () => {
    const s = arena();
    build(s, LEFT1, 'bobine');
    const p = slotPos(LEFT1, s.floors.length);
    const es = [0, 1, 2].map((i) => put(s, 'carapace', p.x + 40 + i * 30, p.y + i * 10, { phase: 'climb', stunTimer: 99 }));
    for (const e of es) e.hp = e.maxHp = 1e5;
    run(s, 0.3);
    expect(es.filter((e) => e.hp < 1e5).length).toBe(3);
  });
  it('la Baliste niveau 3 tire deux carreaux', () => {
    const s = arena();
    build(s, LEFT1, 'baliste');
    upgrade(s, LEFT1);
    upgrade(s, LEFT1);
    const p = slotPos(LEFT1, s.floors.length);
    put(s, 'carapace', p.x + 40, p.y, { stunTimer: 99, phase: 'climb' });
    put(s, 'carapace', p.x + 60, p.y + 20, { stunTimer: 99, phase: 'climb' });
    for (let i = 0; i < 60 && !s.events.some((e) => e.type === 'shot'); i++) run(s, 1 / 60);
    expect(s.projectiles.filter((pr) => pr.kind === 'bolt').length).toBe(2);
  });
  it('vise la Brumâme la plus proche du Cœur', () => {
    const s = arena();
    build(s, LEFT1, 'baliste');
    const p = slotPos(LEFT1, s.floors.length);
    const low = put(s, 'grignot', p.x + 40, p.y - 80, { phase: 'climb' });
    const high = put(s, 'grignot', p.x + 40, p.y + 80, { phase: 'climb' });
    run(s, 1 / 60);
    const tower = s.slots[LEFT1]!;
    expect(findTarget(s, tower, towerStats(s, LEFT1, tower))?.id).toBe(high.id);
    expect(low.id).not.toBe(high.id);
  });
  it('les étages Atelier et Belvédère améliorent les tourelles', () => {
    const s = arena();
    s.floors[1] = 'atelier';
    s.floors[2] = 'belvedere';
    build(s, slotId(1, 1), 'baliste');
    build(s, slotId(2, 1), 'baliste');
    build(s, slotId(0, 1), 'baliste');
    const plain = towerStats(s, slotId(0, 1), s.slots[slotId(0, 1)]!);
    expect(towerStats(s, slotId(1, 1), s.slots[slotId(1, 1)]!).rate).toBeCloseTo(plain.rate * 1.25);
    expect(towerStats(s, slotId(2, 1), s.slots[slotId(2, 1)]!).range).toBeCloseTo(plain.range * 1.18);
  });
});

describe('résistances', () => {
  it('la Carapace encaisse moitié moins de dégâts physiques, plus de lumière', () => {
    const s = arena();
    const a = put(s, 'carapace', 100, 100);
    const b = put(s, 'carapace', 100, 100);
    a.hp = b.hp = 1000;
    damageEnemy(s, a, 100, 'phys');
    damageEnemy(s, b, 100, 'lumiere');
    expect(a.hp).toBe(950);
    expect(b.hp).toBe(875);
  });
  it('un Fouisseur enfoui est intouchable', () => {
    const s = arena();
    const e = put(s, 'fouisseur', 0, -36);
    expect(e.phase).toBe('burrow');
    expect(damageEnemy(s, e, 9999, 'phys')).toBe(false);
  });
  it('une mort rapporte la prime une seule fois', () => {
    const s = arena(0);
    const e = put(s, 'grignot', 100, 100);
    expect(damageEnemy(s, e, 9999, 'phys')).toBe(true);
    const gold = s.gold;
    expect(damageEnemy(s, e, 9999, 'phys')).toBe(false);
    expect(s.gold).toBe(gold);
  });
});
