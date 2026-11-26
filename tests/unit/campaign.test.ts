import { describe, expect, it } from 'vitest';
import { runLevelWithBot } from '../../src/bot/run';
import { ENDLESS_ID, LEVELS } from '../../src/data/levels';
import { recordResult, totalStars } from '../../src/meta/progression';
import { defaultSave } from '../../src/save/save';

/**
 * Parcours complet automatisé : le bot (qui n'utilise que les commandes du joueur)
 * doit terminer chacun des 9 niveaux. Garde-fou d'équilibrage et de non-régression.
 */
describe('campagne jouée par le bot', () => {
  const save = defaultSave();
  it.each(LEVELS.map((l) => [l.id, l.name] as const))('niveau %i (%s) gagné', (id) => {
    const r = runLevelWithBot(id, 1);
    expect(r.won).toBe(true);
    expect(r.lives).toBeGreaterThan(0);
    recordResult(save, r.state);
  });
  it('toute la campagne donne au moins 18 étoiles', () => {
    expect(totalStars(save)).toBeGreaterThanOrEqual(18);
  });
  it('l’Ascension infinie finit par tomber, après plusieurs paliers', () => {
    const r = runLevelWithBot(ENDLESS_ID, 1, undefined, 3000);
    expect(r.won).toBe(false);
    expect(r.waves).toBeGreaterThanOrEqual(10);
  });
  it('robuste sur plusieurs graines (niveaux 1 à 3)', () => {
    for (const id of [1, 2, 3]) for (const seed of [11, 22, 33]) expect(runLevelWithBot(id, seed).won).toBe(true);
  });
});
