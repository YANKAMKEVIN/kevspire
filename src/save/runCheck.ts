import type { EnemyKind, FloorKind, TowerKind } from '../core/types';
import { ENEMY_ORDER } from '../data/enemies';
import { FLOOR_ORDER } from '../data/floors';
import { slotCount } from '../data/geometry';
import { ENDLESS_ID, LEVELS } from '../data/levels';
import { TOWER_ORDER } from '../data/towers';
import type { GameState } from '../sim/state';

/**
 * Validation profonde d'une partie en cours lue depuis la sauvegarde.
 * Une partie abîmée (champ manquant, type inattendu, niveau inconnu) est écartée :
 * le joueur perd sa partie en cours mais jamais sa progression, et le jeu ne plante pas.
 */
type Obj = Record<string, unknown>;

const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const fin = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const allFinite = (o: Obj, keys: readonly string[]): boolean => keys.every((k) => fin(o[k]));

const PHASES = ['prep', 'wave', 'choose', 'won', 'lost'];
const ENEMY_PHASES = ['walk', 'climb', 'top', 'fly', 'burrow'];

function validTower(t: unknown): boolean {
  if (t === null) return true;
  if (!isObj(t) || !TOWER_ORDER.includes(t.kind as TowerKind)) return false;
  return Number.isInteger(t.level) && (t.level as number) >= 1 && (t.level as number) <= 3
    && allFinite(t, ['cooldown', 'targetId', 'focus', 'disabled', 'aim', 'kills']);
}

function validEnemy(e: unknown): boolean {
  if (!isObj(e) || !ENEMY_ORDER.includes(e.kind as EnemyKind) || !ENEMY_PHASES.includes(e.phase as string)) return false;
  return (e.side === -1 || e.side === 1)
    && allFinite(e, ['id', 'hp', 'maxHp', 'x', 'y', 'progress', 'slowTimer', 'slowAmount', 'stunTimer', 'emergeY', 'timer', 'wobble', 'targetSlot', 'hitFlash']);
}

function validProjectile(p: unknown): boolean {
  if (!isObj(p) || (p.kind !== 'bolt' && p.kind !== 'shell') || typeof p.alive !== 'boolean') return false;
  return allFinite(p, ['x', 'y', 'sx', 'sy', 'tx', 'ty', 'targetId', 'damage', 'speed', 'radius', 't', 'duration']);
}

function validSpawner(sp: unknown): boolean {
  if (!isObj(sp) || !fin(sp.spawned) || !fin(sp.timer) || !isObj(sp.group)) return false;
  const g = sp.group;
  return ENEMY_ORDER.includes(g.enemy as EnemyKind) && allFinite(g, ['count', 'interval', 'delay']);
}

const validFloor = (f: unknown): boolean => f === null || FLOOR_ORDER.includes(f as FloorKind);

/** Renvoie la partie si elle est saine (avec les champs dérivés recalculés), sinon null. */
export function sanitizeRun(raw: unknown): GameState | null {
  if (!isObj(raw) || raw.version !== 1) return null;
  const level = LEVELS.find((l) => l.id === raw.levelId);
  const endless = raw.levelId === ENDLESS_ID;
  if (!level && !endless) return null;
  if (!allFinite(raw, ['seed', 'time', 'waveIndex', 'countdown', 'gold', 'lives', 'maxLives', 'hpScale', 'growEvery', 'maxFloors', 'nextId'])) return null;
  if (!PHASES.includes(raw.phase as string) || !isObj(raw.rng) || !fin(raw.rng.s)) return null;
  const maxFloors = raw.maxFloors as number;
  if (!Array.isArray(raw.floors) || raw.floors.length < 1 || raw.floors.length > maxFloors || !raw.floors.every(validFloor)) return null;
  if (!Array.isArray(raw.slots) || raw.slots.length !== slotCount(maxFloors) || !raw.slots.every(validTower)) return null;
  if (!Array.isArray(raw.enemies) || !raw.enemies.every(validEnemy)) return null;
  if (!Array.isArray(raw.projectiles) || !raw.projectiles.every(validProjectile)) return null;
  if (!Array.isArray(raw.spawners) || !raw.spawners.every(validSpawner)) return null;
  if (!Array.isArray(raw.floorChoices) || !raw.floorChoices.every((f) => f !== null && validFloor(f))) return null;
  const ab = raw.abilities;
  if (!isObj(ab) || !isObj(ab.eclat) || !isObj(ab.rafale)) return null;
  if (!allFinite(ab.eclat, ['cooldown', 'maxCooldown']) || !allFinite(ab.rafale, ['cooldown', 'maxCooldown'])) return null;
  if (!isObj(raw.stats) || !allFinite(raw.stats, ['kills', 'leaked', 'goldEarned', 'towersBuilt', 'abilitiesUsed'])) return null;
  if (!isObj(raw.modifiers) || !allFinite(raw.modifiers, ['startGold', 'costMul', 'rangeMul', 'extraLives', 'damageMul', 'cooldownMul'])) return null;
  return {
    ...(raw as unknown as GameState),
    endless,
    // JSON transforme Infinity en null : on recalcule le nombre de vagues depuis les données.
    totalWaves: level ? level.waves.length : Number.POSITIVE_INFINITY,
    events: [],
  };
}
