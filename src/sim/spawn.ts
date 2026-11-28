import { nextFloat, range } from '../core/rng';
import type { EnemyKind, Side } from '../core/types';
import { ENEMIES } from '../data/enemies';
import { CENTER_X, FLOOR_H, GROUND_SPAWN_X, SKY_SPAWN_RADIUS, WORLD_W, heartPos } from '../data/geometry';
import { getLevel } from '../data/levels';
import type { SpawnGroup, WaveDef } from '../data/levels';
import { endlessHpScale, endlessWave } from './endless';
import { remainingDistance } from './enemies';
import { acquireEnemy } from './pool';
import type { Enemy, GameState } from './state';

export function waveDef(state: GameState, index: number): WaveDef | null {
  if (state.endless) return endlessWave(index);
  return getLevel(state.levelId).waves[index] ?? null;
}

/** PV effectifs d'un ennemi pour la vague courante. */
export function enemyHp(state: GameState, kind: EnemyKind): number {
  const waveScale = state.endless ? endlessHpScale(state.waveIndex) : state.hpScale * (1 + 0.05 * state.waveIndex);
  return Math.round(ENEMIES[kind].hp * waveScale);
}

/** Tire un emplacement occupé au hasard (même tirage que sur la liste des occupés), ou -1. */
function randomOccupiedSlot(state: GameState): number {
  let count = 0;
  for (const t of state.slots) if (t) count++;
  if (count === 0) return -1;
  let k = Math.floor(nextFloat(state.rng) * count);
  for (let i = 0; i < state.slots.length; i++) {
    if (!state.slots[i]) continue;
    if (k-- === 0) return i;
  }
  return -1;
}

export function spawnEnemy(state: GameState, kind: EnemyKind, side: Side, opts: Partial<Enemy> = {}): Enemy {
  const def = ENEMIES[kind];
  const hp = enemyHp(state, kind);
  // Objet recyclé depuis la réserve : chaque champ est réécrit.
  const e = acquireEnemy();
  e.id = state.nextId++;
  e.kind = kind;
  e.hp = hp;
  e.maxHp = hp;
  e.x = side < 0 ? -GROUND_SPAWN_X : WORLD_W + GROUND_SPAWN_X;
  e.y = 0;
  e.side = side;
  e.phase = 'walk';
  e.progress = 0;
  e.slowTimer = 0;
  e.slowAmount = 0;
  e.stunTimer = 0;
  e.emergeY = 0;
  e.timer = 4;
  e.wobble = nextFloat(state.rng) * Math.PI * 2;
  e.targetSlot = -1;
  e.hitFlash = 0;
  if (def.movement === 'flier') {
    const heart = heartPos(state.floors.length);
    // Arrivée par la gauche, la droite ou le haut, jamais par le dessous de l'île.
    const angle = range(state.rng, 0.12, Math.PI - 0.12);
    e.x = Math.max(-70, Math.min(WORLD_W + 70, heart.x + Math.cos(angle) * SKY_SPAWN_RADIUS));
    e.y = heart.y + Math.sin(angle) * SKY_SPAWN_RADIUS * 0.75 + 60;
    e.side = e.x < CENTER_X ? -1 : 1;
    e.phase = 'fly';
    if (kind === 'planeur') {
      e.targetSlot = randomOccupiedSlot(state);
    }
  } else if (def.movement === 'burrower') {
    e.phase = 'burrow';
    e.y = -36;
    const maxFloor = Math.max(1, Math.ceil(state.floors.length / 2));
    e.emergeY = range(state.rng, FLOOR_H * 0.4, maxFloor * FLOOR_H);
  }
  Object.assign(e, opts);
  e.progress = -remainingDistance(state, e);
  state.enemies.push(e);
  state.events.push({ type: 'spawn', kind, id: e.id });
  return e;
}

function sideFor(state: GameState, group: SpawnGroup, index: number): Side {
  switch (group.side) {
    case 'L':
      return -1;
    case 'R':
      return 1;
    case 'both':
      return index % 2 === 0 ? -1 : 1;
    default:
      return nextFloat(state.rng) < 0.5 ? -1 : 1;
  }
}

export function beginWaveSpawners(state: GameState): void {
  const def = waveDef(state, state.waveIndex);
  state.spawners = (def?.groups ?? []).map((group) => ({ group, spawned: 0, timer: group.delay }));
}

export function updateSpawners(state: GameState, dt: number): void {
  for (const sp of state.spawners) {
    if (sp.spawned >= sp.group.count) continue;
    sp.timer -= dt;
    while (sp.timer <= 0 && sp.spawned < sp.group.count) {
      spawnEnemy(state, sp.group.enemy, sideFor(state, sp.group, sp.spawned));
      sp.spawned++;
      sp.timer += sp.group.interval;
    }
  }
}

export function spawnersDone(state: GameState): boolean {
  return state.spawners.every((sp) => sp.spawned >= sp.group.count);
}
