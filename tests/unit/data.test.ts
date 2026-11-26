import { describe, expect, it } from 'vitest';
import { ENEMIES, ENEMY_ORDER } from '../../src/data/enemies';
import { FLOORS, FLOOR_ORDER } from '../../src/data/floors';
import { CENTER_X, FLOOR_H, slotCount, slotFromId, slotId, slotPos, towerTop } from '../../src/data/geometry';
import { LEVELS, getLevel } from '../../src/data/levels';
import { TOWERS, TOWER_ORDER, totalInvested } from '../../src/data/towers';
import { UPGRADES } from '../../src/meta/upgrades';

describe('données des tourelles', () => {
  it.each(TOWER_ORDER)('%s a 3 niveaux croissants', (kind) => {
    const lv = TOWERS[kind].levels;
    expect(lv).toHaveLength(3);
    for (let i = 1; i < 3; i++) {
      expect(lv[i]!.damage).toBeGreaterThan(lv[i - 1]!.damage);
      expect(lv[i]!.range).toBeGreaterThanOrEqual(lv[i - 1]!.range);
      expect(lv[i]!.cost).toBeGreaterThan(0);
    }
  });
  it('le mortier ne touche pas les volants, la baliste si', () => {
    expect(TOWERS.mortier.hitsAir).toBe(false);
    expect(TOWERS.baliste.hitsAir).toBe(true);
  });
  it('totalInvested additionne les niveaux', () => {
    const l = TOWERS.baliste.levels;
    expect(totalInvested('baliste', 2)).toBe(l[0].cost + l[1].cost);
  });
  it('au moins une tourelle est disponible dès le niveau 1', () => {
    expect(TOWER_ORDER.filter((k) => TOWERS[k].unlockLevel === 1).length).toBeGreaterThanOrEqual(2);
  });
});

describe('données des Brumâmes', () => {
  it.each(ENEMY_ORDER)('%s a des valeurs cohérentes', (kind) => {
    const d = ENEMIES[kind];
    expect(d.hp).toBeGreaterThan(0);
    expect(d.speed).toBeGreaterThan(0);
    expect(d.leak).toBeGreaterThan(0);
    expect(d.bounty).toBeGreaterThan(0);
    expect(d.name.length).toBeGreaterThan(2);
    for (const mul of Object.values(d.resist)) expect(mul).toBeGreaterThan(0);
  });
  it('un seul boss', () => {
    expect(ENEMY_ORDER.filter((k) => ENEMIES[k].boss)).toEqual(['mereBrume']);
  });
});

describe('niveaux', () => {
  it('9 niveaux numérotés de 1 à 9', () => {
    expect(LEVELS.map((l) => l.id)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });
  it.each(LEVELS.map((l) => [l.id, l] as const))('niveau %i valide', (_id, l) => {
    expect(l.waves.length).toBeGreaterThanOrEqual(6);
    expect(l.maxFloors).toBeGreaterThan(l.startFloors);
    expect(l.startGold).toBeGreaterThanOrEqual(150);
    for (const w of l.waves) {
      expect(w.groups.length).toBeGreaterThan(0);
      for (const g of w.groups) {
        expect(ENEMIES[g.enemy]).toBeDefined();
        expect(g.count).toBeGreaterThan(0);
        expect(g.interval).toBeGreaterThan(0);
      }
    }
  });
  it('une Brumâme n’apparaît pas avant son niveau d’introduction', () => {
    for (const l of LEVELS) for (const w of l.waves) for (const g of w.groups) expect(ENEMIES[g.enemy].introLevel).toBeLessThanOrEqual(l.id);
  });
  it('la difficulté (PV) ne baisse jamais beaucoup d’un niveau à l’autre', () => {
    for (let i = 1; i < LEVELS.length; i++) expect(LEVELS[i]!.hpScale).toBeGreaterThanOrEqual(LEVELS[i - 1]!.hpScale - 0.1);
  });
  it('getLevel refuse un niveau inconnu', () => {
    expect(() => getLevel(42)).toThrow();
  });
});

describe('étages et améliorations', () => {
  it('chaque étage a exactement un effet', () => {
    for (const k of FLOOR_ORDER) {
      const f = FLOORS[k];
      const effects = [f.rateBonus, f.rangeBonus, f.wallSlow, f.goldPerWave, f.healPerWave].filter((v) => v > 0);
      expect(effects).toHaveLength(1);
    }
  });
  it('les améliorations ont des coûts positifs', () => {
    for (const u of UPGRADES) for (const c of u.costs) expect(c).toBeGreaterThan(0);
  });
});

describe('géométrie', () => {
  it('slotId et slotFromId sont réciproques', () => {
    for (let floor = -1; floor < 10; floor++) for (const side of [-1, 1] as const) expect(slotFromId(slotId(floor, side))).toEqual({ floor, side });
  });
  it('les postes du sommet suivent la hauteur de la tour', () => {
    expect(slotPos(0, 5).y - slotPos(0, 4).y).toBe(FLOOR_H);
    expect(slotPos(0, 3).x).toBeLessThan(CENTER_X);
    expect(slotPos(1, 3).x).toBeGreaterThan(CENTER_X);
  });
  it('les balcons sont à l’extérieur des murs, symétriques', () => {
    const l = slotPos(slotId(2, -1), 4);
    const r = slotPos(slotId(2, 1), 4);
    expect(CENTER_X - l.x).toBeCloseTo(r.x - CENTER_X);
    expect(l.y).toBeGreaterThan(2 * FLOOR_H);
    expect(l.y).toBeLessThan(3 * FLOOR_H);
  });
  it('slotCount et towerTop', () => {
    expect(slotCount(5)).toBe(12);
    expect(towerTop(3)).toBe(3 * FLOOR_H);
  });
});
