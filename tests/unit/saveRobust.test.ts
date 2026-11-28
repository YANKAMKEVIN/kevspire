import { describe, expect, it } from 'vitest';
import { botTick } from '../../src/bot/bot';
import { BACKUP_KEY, QUARANTINE_KEY, SAVE_KEY, defaultSave, encode, loadSave, memoryStore, writeSave } from '../../src/save/save';
import type { KeyValueStore } from '../../src/save/save';
import { sanitizeRun } from '../../src/save/runCheck';
import { SAVE_VERSION } from '../../src/save/schema';
import { createGame } from '../../src/sim/create';
import type { GameState } from '../../src/sim/state';
import { advance } from '../../src/sim/step';

function midGame(levelId = 4): GameState {
  const s = createGame(levelId, 6);
  for (let t = 0; t < 50; t += 0.25) {
    botTick(s);
    advance(s, 0.25);
  }
  return JSON.parse(JSON.stringify(s)) as GameState;
}

/** Stockage limité en taille (simule le quota de localStorage). */
function tinyStore(limit: number): KeyValueStore & { map: Map<string, string> } {
  const map = new Map<string, string>();
  const used = () => [...map.values()].reduce((n, v) => n + v.length, 0);
  return {
    map,
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => {
      if (used() - (map.get(k)?.length ?? 0) + v.length > limit) throw new Error('QuotaExceededError');
      map.set(k, v);
    },
    removeItem: (k) => void map.delete(k),
  };
}

describe('sauvegarde robuste', () => {
  it('une partie en cours réelle (ennemis, projectiles, vagues) passe la validation', () => {
    const run = midGame();
    expect(run.enemies.length + run.projectiles.length).toBeGreaterThan(0);
    const back = sanitizeRun(run);
    expect(back).not.toBeNull();
    expect(JSON.stringify({ ...back, events: [] })).toBe(JSON.stringify({ ...run, events: [] }));
  });

  it.each([
    ['niveau inconnu', (r: Record<string, unknown>) => { r.levelId = 42; }],
    ['or non numérique', (r: Record<string, unknown>) => { r.gold = 'beaucoup'; }],
    ['ennemis absents', (r: Record<string, unknown>) => { delete r.enemies; }],
    ['ennemi d’une espèce inconnue', (r: Record<string, unknown>) => { (r.enemies as unknown[]).push({ kind: 'dragon' }); }],
    ['tourelle de niveau 7', (r: Record<string, unknown>) => { (r.slots as unknown[])[0] = { kind: 'baliste', level: 7 }; }],
    ['emplacements tronqués', (r: Record<string, unknown>) => { (r.slots as unknown[]).length = 3; }],
    ['étage inconnu', (r: Record<string, unknown>) => { (r.floors as unknown[]).push('donjon'); }],
    ['phase inconnue', (r: Record<string, unknown>) => { r.phase = 'pause'; }],
    ['pouvoirs abîmés', (r: Record<string, unknown>) => { r.abilities = { eclat: {} }; }],
    ['générateur aléatoire abîmé', (r: Record<string, unknown>) => { r.rng = null; }],
  ])('écarte une partie en cours abîmée : %s', (_label, damage) => {
    const run = midGame() as unknown as Record<string, unknown>;
    damage(run);
    expect(sanitizeRun(run)).toBeNull();
  });

  it('une partie abîmée est écartée mais la progression est gardée', () => {
    const store = memoryStore();
    const d = defaultSave();
    d.levels['1'] = { stars: 3, bestLives: 20 };
    d.run = { ...midGame(), enemies: 'cassé' } as unknown as GameState;
    writeSave(store, d);
    const r = loadSave(store);
    expect(r.source).toBe('principale');
    expect(r.data.run).toBeNull();
    expect(r.data.levels['1']?.stars).toBe(3);
  });

  it('une sauvegarde du futur n’est jamais écrasée sans copie (quarantaine)', () => {
    const store = memoryStore();
    const json = JSON.stringify({ version: SAVE_VERSION + 1, levels: { 1: { stars: 3 } } });
    const future = JSON.stringify({ sum: 'x', data: json });
    store.setItem(SAVE_KEY, future);
    const r = loadSave(store);
    expect(r.source).toBe('neuve');
    writeSave(store, r.data);
    expect(store.getItem(QUARANTINE_KEY)).toBe(future);
    expect(loadSave(store).source).toBe('principale');
    // Une seconde écriture ne remplace pas la quarantaine.
    store.setItem(SAVE_KEY, '{abîmé');
    writeSave(store, r.data);
    expect(store.getItem(QUARANTINE_KEY)).toBe(future);
  });

  it('stockage plein : la copie de secours est sacrifiée pour écrire la sauvegarde principale', () => {
    const d = defaultSave();
    d.run = midGame(8);
    const size = encode(d).length;
    const store = tinyStore(Math.floor(size * 1.6));
    expect(writeSave(store, d)).toBe(true);
    d.levels['1'] = { stars: 2, bestLives: 3 };
    expect(writeSave(store, d)).toBe(true);
    expect(store.map.has(BACKUP_KEY)).toBe(false);
    expect(loadSave(store).data.levels['1']?.stars).toBe(2);
  });

  it('stockage vraiment trop petit : échec signalé, ancienne sauvegarde intacte', () => {
    const store = tinyStore(10_000);
    const small = defaultSave();
    expect(writeSave(store, small)).toBe(true);
    const before = store.getItem(SAVE_KEY);
    const big = defaultSave();
    big.run = midGame(8);
    (big.run as unknown as { padding: string }).padding = 'x'.repeat(20_000);
    expect(writeSave(store, big)).toBe(false);
    expect(store.getItem(SAVE_KEY)).toBe(before);
    expect(loadSave(store).source).toBe('principale');
  });

  it('stockage qui lève à la lecture seulement : partie neuve, écriture possible', () => {
    const map = new Map<string, string>();
    let reads = 0;
    const store: KeyValueStore = {
      getItem: () => { reads++; throw new Error('SecurityError'); },
      setItem: (k, v) => void map.set(k, v),
      removeItem: (k) => void map.delete(k),
    };
    expect(loadSave(store).source).toBe('neuve');
    expect(writeSave(store, defaultSave())).toBe(true);
    expect(reads).toBeGreaterThan(0);
    expect(map.has(SAVE_KEY)).toBe(true);
  });
});
