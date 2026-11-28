import { fnv1a } from '../core/math';
import type { EnemyKind } from '../core/types';
import { ENEMY_ORDER } from '../data/enemies';
import { LEVELS } from '../data/levels';
import { NO_UPGRADES, UPGRADES } from '../meta/upgrades';
import type { UpgradeRanks } from '../meta/upgrades';
import { sanitizeRun } from './runCheck';
import { DEFAULT_SETTINGS, SAVE_VERSION } from './schema';
import type { LevelRecord, Quality, SaveData, SaveDataV1, Settings } from './schema';

/** Stockage clé/valeur (localStorage en jeu, mémoire en test). */
export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export const SAVE_KEY = 'kevspire.save';
export const BACKUP_KEY = 'kevspire.save.bak';
/**
 * Copie intacte d'une sauvegarde principale illisible (corrompue, ou écrite par une
 * version plus récente du jeu), mise à l'abri avant d'être écrasée : rien n'est perdu.
 */
export const QUARANTINE_KEY = 'kevspire.save.illisible';

interface Envelope {
  sum: string;
  data: string;
}

export function defaultSave(): SaveData {
  return {
    version: SAVE_VERSION,
    levels: {},
    upgrades: { ...NO_UPGRADES },
    bestEndlessWave: 0,
    seenEnemies: [],
    settings: { ...DEFAULT_SETTINGS },
    tutorialDone: false,
    run: null,
    writes: 0,
  };
}

type Migration = (raw: Record<string, unknown>) => Record<string, unknown>;

/** Migrations successives : MIGRATIONS[n] transforme une sauvegarde vN en vN+1. */
export const MIGRATIONS: Record<number, Migration> = {
  1: (raw) => {
    const v1 = raw as unknown as SaveDataV1;
    const levels: Record<string, LevelRecord> = {};
    (Array.isArray(v1.stars) ? v1.stars : []).forEach((stars, i) => {
      if (typeof stars === 'number' && stars > 0) levels[String(i + 1)] = { stars, bestLives: 0 };
    });
    const vol = v1.sound === false ? 0 : DEFAULT_SETTINGS.sfx;
    return { ...defaultSave(), levels, settings: { ...DEFAULT_SETTINGS, sfx: vol, music: v1.sound === false ? 0 : DEFAULT_SETTINGS.music } };
  },
};

export function migrate(raw: Record<string, unknown>): Record<string, unknown> {
  let current = raw;
  let version = typeof current.version === 'number' ? current.version : 1;
  if (version > SAVE_VERSION) throw new Error(`Sauvegarde plus récente que le jeu (v${version})`);
  while (version < SAVE_VERSION) {
    const m = MIGRATIONS[version];
    if (!m) throw new Error(`Migration manquante depuis v${version}`);
    current = { ...m(current), version: version + 1 };
    version++;
  }
  return current;
}

const num = (v: unknown, lo: number, hi: number, fallback: number): number =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : fallback;

function sanitizeSettings(raw: unknown): Settings {
  const s = (raw ?? {}) as Partial<Settings>;
  const quality: Quality = s.quality === 'haute' || s.quality === 'eco' ? s.quality : 'auto';
  return {
    music: num(s.music, 0, 1, DEFAULT_SETTINGS.music),
    sfx: num(s.sfx, 0, 1, DEFAULT_SETTINGS.sfx),
    haptics: typeof s.haptics === 'boolean' ? s.haptics : DEFAULT_SETTINGS.haptics,
    quality,
  };
}

/** Valide chaque champ : une sauvegarde abîmée ne doit jamais faire planter le jeu. */
export function sanitize(raw: Record<string, unknown>): SaveData {
  const out = defaultSave();
  const levels = (raw.levels ?? {}) as Record<string, Partial<LevelRecord>>;
  for (const l of LEVELS) {
    const rec = levels[String(l.id)];
    if (rec) out.levels[String(l.id)] = { stars: Math.round(num(rec.stars, 0, 3, 0)), bestLives: num(rec.bestLives, 0, 999, 0) };
  }
  const ups = (raw.upgrades ?? {}) as Partial<UpgradeRanks>;
  for (const def of UPGRADES) out.upgrades[def.id] = Math.round(num(ups[def.id], 0, def.costs.length, 0));
  out.bestEndlessWave = Math.round(num(raw.bestEndlessWave, 0, 9999, 0));
  out.seenEnemies = Array.isArray(raw.seenEnemies)
    ? (raw.seenEnemies as unknown[]).filter((k): k is EnemyKind => ENEMY_ORDER.includes(k as EnemyKind))
    : [];
  out.settings = sanitizeSettings(raw.settings);
  out.tutorialDone = raw.tutorialDone === true;
  out.run = sanitizeRun(raw.run);
  out.writes = Math.round(num(raw.writes, 0, Number.MAX_SAFE_INTEGER, 0));
  return out;
}

function decode(text: string | null): SaveData | null {
  if (!text) return null;
  try {
    const env = JSON.parse(text) as Envelope;
    if (typeof env.data !== 'string' || fnv1a(env.data) !== env.sum) return null;
    const raw = JSON.parse(env.data) as Record<string, unknown>;
    return sanitize(migrate(raw));
  } catch {
    return null;
  }
}

export function encode(data: SaveData): string {
  const json = JSON.stringify({ ...data, run: data.run ? { ...data.run, events: [] } : null });
  return JSON.stringify({ sum: fnv1a(json), data: json } satisfies Envelope);
}

export interface LoadResult {
  data: SaveData;
  source: 'principale' | 'secours' | 'neuve';
}

/** Charge la sauvegarde principale, ou la copie de secours si la principale est corrompue. */
export function loadSave(store: KeyValueStore): LoadResult {
  const main = decode(safeGet(store, SAVE_KEY));
  if (main) return { data: main, source: 'principale' };
  const backup = decode(safeGet(store, BACKUP_KEY));
  if (backup) return { data: backup, source: 'secours' };
  return { data: defaultSave(), source: 'neuve' };
}

/**
 * Écrit la sauvegarde ; l'ancienne version valide devient la copie de secours, une
 * ancienne version illisible est mise en quarantaine. Si le stockage est plein, la copie
 * de secours est sacrifiée pour laisser passer la sauvegarde principale. Ne lève jamais.
 */
export function writeSave(store: KeyValueStore, data: SaveData): boolean {
  data.writes++;
  let encoded: string;
  try {
    encoded = encode(data);
  } catch {
    return false;
  }
  const previous = safeGet(store, SAVE_KEY);
  if (previous) {
    if (decode(previous)) safeSet(store, BACKUP_KEY, previous);
    else if (safeGet(store, QUARANTINE_KEY) === null) safeSet(store, QUARANTINE_KEY, previous);
  }
  if (safeSet(store, SAVE_KEY, encoded)) return true;
  safeRemove(store, BACKUP_KEY);
  return safeSet(store, SAVE_KEY, encoded);
}

function safeSet(store: KeyValueStore, key: string, value: string): boolean {
  try {
    store.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

function safeRemove(store: KeyValueStore, key: string): void {
  try {
    store.removeItem(key);
  } catch {
    // stockage inaccessible : rien à faire
  }
}

function safeGet(store: KeyValueStore, key: string): string | null {
  try {
    return store.getItem(key);
  } catch {
    return null;
  }
}

export function memoryStore(): KeyValueStore & { map: Map<string, string> } {
  const map = new Map<string, string>();
  return {
    map,
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, v),
    removeItem: (k) => void map.delete(k),
  };
}
