import { describe, expect, it } from 'vitest';
import { BACKUP_KEY, SAVE_KEY, defaultSave, encode, loadSave, memoryStore, migrate, sanitize, writeSave } from '../../src/save/save';
import { SAVE_VERSION } from '../../src/save/schema';
import { createGame } from '../../src/sim/create';

describe('sauvegarde', () => {
  it('une partie neuve sans sauvegarde', () => {
    const r = loadSave(memoryStore());
    expect(r.source).toBe('neuve');
    expect(r.data).toEqual(defaultSave());
  });
  it('aller-retour complet', () => {
    const store = memoryStore();
    const d = defaultSave();
    d.levels['1'] = { stars: 3, bestLives: 20 };
    d.upgrades.fonds = 2;
    d.seenEnemies = ['grignot', 'carapace'];
    d.settings.music = 0.2;
    d.bestEndlessWave = 12;
    writeSave(store, d);
    const r = loadSave(store);
    expect(r.source).toBe('principale');
    expect(r.data.levels['1']).toEqual({ stars: 3, bestLives: 20 });
    expect(r.data.upgrades.fonds).toBe(2);
    expect(r.data.seenEnemies).toEqual(['grignot', 'carapace']);
    expect(r.data.settings.music).toBe(0.2);
    expect(r.data.bestEndlessWave).toBe(12);
  });
  it('sauvegarde et restaure une partie en cours', () => {
    const store = memoryStore();
    const d = defaultSave();
    const run = createGame(3, 9);
    run.gold = 321;
    d.run = run;
    writeSave(store, d);
    const back = loadSave(store).data.run;
    expect(back?.gold).toBe(321);
    expect(back?.levelId).toBe(3);
    expect(back?.events).toEqual([]);
  });
  it('détecte une corruption et utilise la copie de secours', () => {
    const store = memoryStore();
    const d = defaultSave();
    d.levels['1'] = { stars: 1, bestLives: 5 };
    writeSave(store, d);
    d.levels['1'] = { stars: 2, bestLives: 12 };
    writeSave(store, d);
    const raw = store.getItem(SAVE_KEY) as string;
    store.setItem(SAVE_KEY, raw.replace('"stars\\":2', '"stars\\":3'));
    const r = loadSave(store);
    expect(r.source).toBe('secours');
    expect(r.data.levels['1']?.stars).toBe(1);
  });
  it('JSON illisible : repart d’une sauvegarde neuve sans planter', () => {
    const store = memoryStore();
    store.setItem(SAVE_KEY, '{pas du json');
    store.setItem(BACKUP_KEY, 'n’importe quoi');
    expect(loadSave(store).source).toBe('neuve');
  });
  it('migre une sauvegarde v1', () => {
    const v1 = { version: 1, stars: [3, 2, 0, 1], sound: false };
    const json = JSON.stringify(v1);
    const store = memoryStore();
    const migrated = sanitize(migrate(v1 as unknown as Record<string, unknown>));
    expect(migrated.version).toBe(SAVE_VERSION);
    expect(migrated.levels['1']?.stars).toBe(3);
    expect(migrated.levels['2']?.stars).toBe(2);
    expect(migrated.levels['3']).toBeUndefined();
    expect(migrated.levels['4']?.stars).toBe(1);
    expect(migrated.settings.music).toBe(0);
    // Sans enveloppe ni somme de contrôle, le texte brut est refusé (repli sur une sauvegarde neuve).
    store.setItem(SAVE_KEY, json);
    expect(loadSave(store).source).toBe('neuve');
  });
  it('refuse une sauvegarde venue du futur', () => {
    expect(() => migrate({ version: SAVE_VERSION + 1 })).toThrow();
  });
  it('nettoie les valeurs absurdes', () => {
    const d = sanitize({
      version: 2, levels: { '1': { stars: 99, bestLives: -5 }, '77': { stars: 3 } },
      upgrades: { fonds: 50, vents: 'x' }, seenEnemies: ['grignot', 'dragon'], settings: { music: 4, quality: 'ultra' }, bestEndlessWave: -3, run: { foo: 1 },
    });
    expect(d.levels['1']).toEqual({ stars: 3, bestLives: 0 });
    expect(d.levels['77']).toBeUndefined();
    expect(d.upgrades.fonds).toBe(3);
    expect(d.upgrades.vents).toBe(0);
    expect(d.seenEnemies).toEqual(['grignot']);
    expect(d.settings.music).toBe(1);
    expect(d.settings.quality).toBe('auto');
    expect(d.bestEndlessWave).toBe(0);
    expect(d.run).toBeNull();
  });
  it('survit à un stockage qui refuse d’écrire', () => {
    const broken = { getItem: () => { throw new Error('x'); }, setItem: () => { throw new Error('plein'); }, removeItem: () => undefined };
    expect(writeSave(broken, defaultSave())).toBe(false);
    expect(loadSave(broken).source).toBe('neuve');
  });
  it('l’enveloppe contient une somme de contrôle', () => {
    const env = JSON.parse(encode(defaultSave())) as { sum: string; data: string };
    expect(env.sum).toMatch(/^[0-9a-f]{8}$/);
    expect(JSON.parse(env.data).version).toBe(SAVE_VERSION);
  });
  it('compte les écritures', () => {
    const store = memoryStore();
    const d = defaultSave();
    writeSave(store, d);
    writeSave(store, d);
    expect(loadSave(store).data.writes).toBe(2);
  });
});
