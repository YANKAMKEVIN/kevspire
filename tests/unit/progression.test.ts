import { describe, expect, it } from 'vitest';
import { ENDLESS_ID } from '../../src/data/levels';
import { availableEclats, earnedEclats, isLevelUnlocked, recordResult, starsFor, totalStars } from '../../src/meta/progression';
import { NO_UPGRADES, UPGRADES, modifiersFrom, nextRankCost, spentEclats } from '../../src/meta/upgrades';
import { defaultSave } from '../../src/save/save';
import { createGame } from '../../src/sim/create';

describe('étoiles et déblocages', () => {
  it('barème des étoiles', () => {
    expect(starsFor(20, 20)).toBe(3);
    expect(starsFor(18, 20)).toBe(3);
    expect(starsFor(12, 20)).toBe(2);
    expect(starsFor(3, 20)).toBe(1);
    expect(starsFor(0, 20)).toBe(0);
  });
  it('le niveau suivant s’ouvre après une victoire', () => {
    const save = defaultSave();
    expect(isLevelUnlocked(save, 1)).toBe(true);
    expect(isLevelUnlocked(save, 2)).toBe(false);
    save.levels['1'] = { stars: 1, bestLives: 3 };
    expect(isLevelUnlocked(save, 2)).toBe(true);
    expect(isLevelUnlocked(save, ENDLESS_ID)).toBe(false);
    save.levels['3'] = { stars: 2, bestLives: 10 };
    expect(isLevelUnlocked(save, ENDLESS_ID)).toBe(true);
  });
  it('recordResult garde le meilleur score', () => {
    const save = defaultSave();
    const s = createGame(1, 1);
    s.phase = 'won';
    s.lives = 20;
    const first = recordResult(save, s);
    expect(first.stars).toBe(3);
    expect(first.eclatsGained).toBe(3);
    s.lives = 5;
    const second = recordResult(save, s);
    expect(second.stars).toBe(1);
    expect(second.newBest).toBe(false);
    expect(save.levels['1']?.stars).toBe(3);
    expect(totalStars(save)).toBe(3);
  });
  it('une défaite ne donne rien mais efface la partie en cours', () => {
    const save = defaultSave();
    const s = createGame(2, 1);
    save.run = s;
    s.phase = 'lost';
    expect(recordResult(save, s).stars).toBe(0);
    expect(save.run).toBeNull();
    expect(save.levels['2']).toBeUndefined();
  });
  it('l’Ascension infinie rapporte un éclat tous les 5 paliers', () => {
    const save = defaultSave();
    const s = createGame(ENDLESS_ID, 1);
    s.waveIndex = 11;
    s.phase = 'lost';
    const out = recordResult(save, s);
    expect(out.newBest).toBe(true);
    expect(save.bestEndlessWave).toBe(11);
    expect(earnedEclats(save)).toBe(2);
  });
});

describe('atelier', () => {
  it('sans amélioration, aucun modificateur', () => {
    expect(modifiersFrom(NO_UPGRADES)).toEqual({ startGold: 0, costMul: 1, rangeMul: 1, extraLives: 0, damageMul: 1, cooldownMul: 1 });
  });
  it('chaque rang a un effet et un coût', () => {
    const r = { ...NO_UPGRADES, fonds: 2, cristal: 3, charpente: 1 };
    const m = modifiersFrom(r);
    expect(m.startGold).toBe(60);
    expect(m.extraLives).toBe(6);
    expect(m.costMul).toBeCloseTo(0.95);
    const fonds = UPGRADES.find((u) => u.id === 'fonds')!;
    expect(spentEclats(r)).toBe(1 + 2 + 1 + 2 + 3 + 2);
    expect(nextRankCost(fonds, 3)).toBeNull();
  });
  it('éclats disponibles = gagnés - dépensés', () => {
    const save = defaultSave();
    save.levels['1'] = { stars: 3, bestLives: 20 };
    save.upgrades.fonds = 1;
    expect(availableEclats(save)).toBe(2);
  });
  it('les améliorations s’appliquent à la partie', () => {
    const m = modifiersFrom({ ...NO_UPGRADES, fonds: 1, cristal: 1 });
    const s = createGame(1, 1, m);
    expect(s.gold).toBe(170 + 30);
    expect(s.maxLives).toBe(22);
  });
});
