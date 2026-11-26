import type { DamageType } from '../core/types';
import { ENEMIES } from '../data/enemies';
import { FLOORS } from '../data/floors';
import { FLOOR_H, WALL_LEFT, WALL_RIGHT, heartPos, slotPos, towerTop } from '../data/geometry';
import { spawnEnemy } from './spawn';
import type { Enemy, GameState } from './state';

const PLANEUR_SLEEP = 5;
const BOSS_BROOD_INTERVAL = 5;

/** Applique des dégâts (résistances comprises). Renvoie true si l'ennemi meurt. */
export function damageEnemy(state: GameState, e: Enemy, amount: number, type: DamageType): boolean {
  if (e.hp <= 0 || e.phase === 'burrow') return false;
  const resist = ENEMIES[e.kind].resist[type] ?? 1;
  e.hp -= amount * resist * state.modifiers.damageMul;
  e.hitFlash = 0.12;
  if (e.hp <= 0) {
    const def = ENEMIES[e.kind];
    state.gold += def.bounty;
    state.stats.goldEarned += def.bounty;
    state.stats.kills++;
    state.events.push({ type: 'kill', x: e.x, y: e.y, kind: e.kind, bounty: def.bounty });
    return true;
  }
  return false;
}

export function slowEnemy(e: Enemy, amount: number, duration: number): void {
  const eff = ENEMIES[e.kind].boss ? amount * 0.5 : amount;
  if (eff >= e.slowAmount || e.slowTimer <= 0) e.slowAmount = eff;
  e.slowTimer = Math.max(e.slowTimer, duration);
}

export function stunEnemy(e: Enemy, duration: number): void {
  e.stunTimer = Math.max(e.stunTimer, ENEMIES[e.kind].boss ? duration * 0.4 : duration);
}

function wallSlowAt(state: GameState, y: number): number {
  const kind = state.floors[Math.floor(y / FLOOR_H)];
  return kind ? FLOORS[kind].wallSlow : 0;
}

function leak(state: GameState, e: Enemy): void {
  const amount = ENEMIES[e.kind].leak;
  state.lives = Math.max(0, state.lives - amount);
  state.stats.leaked += amount;
  state.events.push({ type: 'leak', x: e.x, y: e.y, amount, kind: e.kind });
  e.hp = 0;
}

/** Fait avancer `e` vers (tx, ty) ; renvoie true une fois arrivé. */
function moveTo(e: Enemy, tx: number, ty: number, step: number): boolean {
  const dx = tx - e.x;
  const dy = ty - e.y;
  const d = Math.hypot(dx, dy);
  if (d <= step || d < 1e-6) {
    e.x = tx;
    e.y = ty;
    return true;
  }
  e.x += (dx / d) * step;
  e.y += (dy / d) * step;
  return false;
}

function updateClimber(state: GameState, e: Enemy, step: number): void {
  const def = ENEMIES[e.kind];
  const wallX = e.side < 0 ? WALL_LEFT - def.size * 0.35 : WALL_RIGHT + def.size * 0.35;
  const top = towerTop(state.floors.length);
  if (e.phase === 'walk' || e.phase === 'burrow') {
    if (moveTo(e, wallX, e.phase === 'burrow' ? e.y : 0, e.phase === 'burrow' ? step * 1.3 : step)) {
      if (e.phase === 'burrow') {
        e.y = Math.min(e.emergeY, top - 10);
        state.events.push({ type: 'emerge', x: e.x, y: e.y });
      }
      e.phase = 'climb';
    }
    return;
  }
  if (e.phase === 'climb') {
    e.x = wallX;
    const s = step * (1 - wallSlowAt(state, e.y));
    e.y += s;
    if (e.y >= top) {
      e.y = top;
      e.phase = 'top';
    }
    return;
  }
  // Sur la couronne : marche vers le Cœur.
  const heart = heartPos(state.floors.length);
  if (moveTo(e, heart.x, heart.y, step)) leak(state, e);
}

function updateFlier(state: GameState, e: Enemy, step: number, dt: number): void {
  let tx: number;
  let ty: number;
  if (e.targetSlot >= 0 && state.slots[e.targetSlot]) {
    const p = slotPos(e.targetSlot, state.floors.length);
    tx = p.x;
    ty = p.y + 20;
  } else {
    e.targetSlot = -1;
    const heart = heartPos(state.floors.length);
    tx = heart.x;
    ty = heart.y;
  }
  e.wobble += dt * 3;
  const before = e.x;
  const arrived = moveTo(e, tx, ty, step);
  e.x += Math.sin(e.wobble) * 0.6;
  e.side = e.x >= before ? 1 : -1;
  if (!arrived) return;
  if (e.targetSlot >= 0) {
    const tower = state.slots[e.targetSlot];
    if (tower) {
      tower.disabled = Math.max(tower.disabled, PLANEUR_SLEEP);
      state.events.push({ type: 'disable', slot: e.targetSlot });
    }
    e.targetSlot = -1;
    return;
  }
  leak(state, e);
}

function updateBoss(state: GameState, e: Enemy, dt: number): void {
  if (e.phase !== 'climb') return;
  e.timer -= dt;
  if (e.timer > 0) return;
  e.timer = BOSS_BROOD_INTERVAL;
  for (let i = 0; i < 2; i++) {
    spawnEnemy(state, 'grignot', e.side, { x: e.x, y: Math.max(0, e.y - 20 - i * 18), phase: 'climb' });
  }
}

export function updateEnemies(state: GameState, dt: number): void {
  const list = state.enemies;
  for (let i = 0; i < list.length; i++) {
    const e = list[i] as Enemy;
    if (e.hp <= 0) continue;
    if (e.hitFlash > 0) e.hitFlash -= dt;
    if (e.slowTimer > 0) e.slowTimer -= dt;
    if (e.stunTimer > 0) {
      e.stunTimer -= dt;
      continue;
    }
    const def = ENEMIES[e.kind];
    const mul = e.slowTimer > 0 ? 1 - e.slowAmount : 1;
    const step = def.speed * mul * dt;
    if (def.movement === 'flier') updateFlier(state, e, step, dt);
    else updateClimber(state, e, step);
    if (def.boss) updateBoss(state, e, dt);
    e.progress = -remainingDistance(state, e);
  }
}

/**
 * Distance restant à parcourir jusqu'au Cœur : les tourelles visent la Brumâme la plus proche
 * de l'atteindre (progress = -distance restante), qu'elle grimpe ou qu'elle vole.
 */
export function remainingDistance(state: GameState, e: Enemy): number {
  const heart = heartPos(state.floors.length);
  if (e.phase === 'fly' || e.phase === 'top') return Math.hypot(heart.x - e.x, heart.y - e.y);
  const top = towerTop(state.floors.length);
  const crown = Math.hypot(heart.x - e.x, heart.y - top);
  if (e.phase === 'climb') return top - e.y + crown;
  const wallX = e.side < 0 ? WALL_LEFT : WALL_RIGHT;
  const fromGround = e.phase === 'burrow' ? Math.max(0, top - e.emergeY) : top;
  return Math.abs(e.x - wallX) + fromGround + crown;
}

/** Retire les ennemis morts (échange avec le dernier, sans allocation). */
export function compactEnemies(state: GameState): void {
  const list = state.enemies;
  let n = list.length;
  for (let i = 0; i < n; ) {
    if ((list[i] as Enemy).hp <= 0) {
      list[i] = list[n - 1] as Enemy;
      n--;
    } else i++;
  }
  list.length = n;
}

/** Une Brumâme est-elle visée par les tourelles ? (les fouisseurs enfouis ne le sont pas) */
export function isTargetable(e: Enemy): boolean {
  return e.hp > 0 && e.phase !== 'burrow';
}

export const isAir = (e: Enemy): boolean => ENEMIES[e.kind].movement === 'flier';

