import { describe, expect, it } from 'vitest';
import { ENEMIES } from '../../src/data/enemies';
import { WALL_RIGHT, slotId, slotPos } from '../../src/data/geometry';
import { TOWERS, TOWER_ORDER } from '../../src/data/towers';
import { build, sell, upgrade } from '../../src/sim/commands';
import { damageEnemy } from '../../src/sim/enemies';
import { spawnEnemy } from '../../src/sim/spawn';
import { findTarget, towerStats } from '../../src/sim/towers';
import { arena, put, run } from './helpers';

const LEFT1 = slotId(1, -1);

describe('ciblage des tourelles', () => {
  it('ignore une Brumâme hors de portée, la prend dès qu’elle entre', () => {
    const s = arena();
    build(s, LEFT1, 'baliste');
    const t = s.slots[LEFT1]!;
    const st = towerStats(s, LEFT1, t);
    const e = put(s, 'grignot', st.x, st.y + st.range + 30, { phase: 'climb' });
    expect(findTarget(s, t, st)).toBeNull();
    e.y = st.y + st.range - 5;
    expect(findTarget(s, t, st)?.id).toBe(e.id);
  });
  it('le Mortier ne tire pas sous sa portée minimale', () => {
    const s = arena();
    build(s, LEFT1, 'mortier');
    const t = s.slots[LEFT1]!;
    const st = towerStats(s, LEFT1, t);
    put(s, 'grignot', st.x + 10, st.y + 10, { phase: 'climb' });
    expect(TOWERS.mortier.minRange).toBeGreaterThan(Math.hypot(10, 10));
    expect(findTarget(s, t, st)).toBeNull();
  });
  it('une tourelle endormie par un Planeur ne tire pas, puis se réveille', () => {
    const s = arena();
    build(s, LEFT1, 'baliste');
    const t = s.slots[LEFT1]!;
    t.disabled = 1;
    const p = slotPos(LEFT1, s.floors.length);
    const e = put(s, 'grignot', p.x + 30, p.y - 60, { phase: 'climb' });
    e.hp = e.maxHp = 1e6;
    run(s, 0.9);
    expect(e.hp).toBe(1e6);
    expect(s.projectiles).toHaveLength(0);
    run(s, 0.5);
    expect(e.hp).toBeLessThan(1e6);
  });
  it('un carreau dont la cible meurt en vol ne touche personne d’autre et ne paie pas deux fois', () => {
    const s = arena();
    build(s, LEFT1, 'baliste');
    const p = slotPos(LEFT1, s.floors.length);
    const target = put(s, 'grignot', p.x + 60, p.y + 150, { phase: 'climb' });
    target.hp = target.maxHp = 1e6;
    for (let i = 0; i < 120 && s.projectiles.length === 0; i++) run(s, 1 / 60);
    expect(s.projectiles.length).toBeGreaterThan(0);
    const gold = s.gold;
    damageEnemy(s, target, 1e7, 'phys');
    const bounty = ENEMIES.grignot.bounty;
    expect(s.gold).toBe(gold + bounty);
    s.slots[LEFT1] = null; // plus de nouveaux tirs
    s.phase = 'prep'; // pas de bonus de fin de vague dans ce test
    s.countdown = 999;
    run(s, 1);
    expect(s.projectiles).toHaveLength(0);
    expect(s.gold).toBe(gold + bounty);
    expect(s.stats.kills).toBe(1);
  });
  it('la Baliste touche les volants, pas le Mortier ; Cloche, Phare et Bobine touchent les deux', () => {
    for (const kind of TOWER_ORDER) {
      const def = TOWERS[kind];
      expect(def.hitsGround).toBe(true);
      expect(def.hitsAir).toBe(kind !== 'mortier');
    }
  });
  it('un Planeur qui visait une tourelle revendue repart vers le Cœur', () => {
    const s = arena();
    build(s, LEFT1, 'baliste');
    const e = spawnEnemy(s, 'planeur', -1);
    e.targetSlot = LEFT1;
    e.hp = e.maxHp = 1e6;
    sell(s, LEFT1);
    run(s, 1 / 60);
    expect(e.targetSlot).toBe(-1);
  });
  it('un grimpeur du côté droit escalade le mur droit', () => {
    const s = arena();
    const e = spawnEnemy(s, 'grignot', 1);
    e.hp = e.maxHp = 1e6;
    run(s, 6);
    expect(e.phase).toBe('climb');
    expect(e.x).toBeGreaterThan(WALL_RIGHT);
  });
});

describe('améliorations', () => {
  it('chaque niveau de chaque tourelle est au moins aussi fort que le précédent', () => {
    for (const kind of TOWER_ORDER) {
      const [a, b, c] = TOWERS[kind].levels;
      for (const [lo, hi] of [[a, b], [b, c]] as const) {
        expect(hi.damage).toBeGreaterThan(lo.damage);
        expect(hi.range).toBeGreaterThanOrEqual(lo.range);
        expect(hi.rate).toBeGreaterThanOrEqual(lo.rate);
        expect(hi.cost).toBeGreaterThan(0);
      }
    }
  });
  it('une Baliste améliorée fait plus de dégâts dans le même temps', () => {
    const dealt = (level: number) => {
      const s = arena();
      build(s, LEFT1, 'baliste');
      for (let l = 1; l < level; l++) upgrade(s, LEFT1);
      const p = slotPos(LEFT1, s.floors.length);
      const e = put(s, 'carapace', p.x + 40, p.y + 80, { phase: 'climb', stunTimer: 99 });
      e.hp = e.maxHp = 1e6;
      run(s, 5);
      return 1e6 - e.hp;
    };
    const d1 = dealt(1);
    const d2 = dealt(2);
    const d3 = dealt(3);
    expect(d2).toBeGreaterThan(d1);
    expect(d3).toBeGreaterThan(d2);
  });
  it('le bonus de dégâts de l’atelier s’applique aux dégâts infligés', () => {
    const s = arena();
    const e = put(s, 'grignot', 100, 300, { phase: 'climb' });
    e.hp = e.maxHp = 1000;
    s.modifiers.damageMul = 1.5;
    damageEnemy(s, e, 100, 'phys');
    expect(e.hp).toBe(850);
  });
});
