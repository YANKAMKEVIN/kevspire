import { describe, expect, it } from 'vitest';
import { auditLevel, classify } from '../../src/bot/balance';
import { runLevelWith } from '../../src/bot/run';
import { idleStrategy, lazyStrategy } from '../../src/bot/strategies';
import { LEVELS } from '../../src/data/levels';

/**
 * Garde-fou d'équilibrage : chaque niveau doit être gagnable par le bot sur plusieurs
 * graines (pas impossible) et perdu par un joueur passif ou paresseux (pas trivial).
 */
describe('équilibrage des niveaux (bot headless)', () => {
  it.each(LEVELS.map((l) => [l.id, l.name] as const))('niveau %i (%s) : ni impossible ni trivial', (id) => {
    const a = auditLevel(id, [3, 17]);
    expect(a.verdict, JSON.stringify(a)).toBe('ok');
    expect(a.minLives).toBeGreaterThan(0);
  });

  it('les stratégies faibles perdent vraiment (ne construire rien, deux balistes sans amélioration)', () => {
    const idle = runLevelWith(idleStrategy, 1, 1);
    expect(idle.won).toBe(false);
    expect(idle.state.slots.every((t) => t === null)).toBe(true);
    const lazy = runLevelWith(lazyStrategy, 1, 1);
    expect(lazy.won).toBe(false);
    expect(lazy.state.slots.filter(Boolean)).toHaveLength(2);
    expect(lazy.state.slots.every((t) => !t || t.level === 1)).toBe(true);
  });

  it('le verdict signale un niveau impossible, fragile, trivial ou non déterministe', () => {
    const base = { botWins: 3, runs: 3, idleWon: false, lazyWon: false, replaysOk: true };
    expect(classify(base)).toBe('ok');
    expect(classify({ ...base, botWins: 0 })).toBe('impossible');
    expect(classify({ ...base, botWins: 2 })).toBe('fragile');
    expect(classify({ ...base, idleWon: true })).toBe('trivial');
    expect(classify({ ...base, lazyWon: true })).toBe('trivial');
    expect(classify({ ...base, botWins: 0, replaysOk: false })).toBe('non-déterministe');
  });
});
