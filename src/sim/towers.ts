import { dist2 } from '../core/math';
import { FLOORS } from '../data/floors';
import { slotX, slotY } from '../data/geometry';
import { PHARE_FOCUS_MAX, PHARE_FOCUS_TIME, TOWERS } from '../data/towers';
import type { TowerLevelStats } from '../data/towers';
import { damageEnemy, findEnemy, isAir, isTargetable, slowEnemy } from './enemies';
import { acquireProjectile } from './pool';
import type { Enemy, GameState, Tower } from './state';

const SLOW_DURATION = 1.6;
const CHAIN_FALLOFF = 0.85;

export interface EffectiveStats extends TowerLevelStats {
  x: number;
  y: number;
}

function blankStats(): EffectiveStats {
  return { cost: 0, damage: 0, rate: 0, range: 0, radius: 0, slow: 0, targets: 0, x: 0, y: 0 };
}

/**
 * Statistiques d'une tourelle avec bonus d'étage et d'atelier.
 * `out` permet de réutiliser un objet (boucle de simulation sans allocation).
 */
export function towerStats(state: GameState, slot: number, tower: Tower, out: EffectiveStats = blankStats()): EffectiveStats {
  const floor = Math.floor(slot / 2) - 1;
  const base = TOWERS[tower.kind].levels[tower.level - 1];
  if (!base) throw new Error(`Niveau de tourelle invalide : ${tower.level}`);
  const floorKind = floor >= 0 ? state.floors[floor] : null;
  const fdef = floorKind ? FLOORS[floorKind] : null;
  out.cost = base.cost;
  out.damage = base.damage;
  out.radius = base.radius;
  out.slow = base.slow;
  out.targets = base.targets;
  out.range = base.range * (1 + (fdef?.rangeBonus ?? 0)) * state.modifiers.rangeMul;
  out.rate = base.rate * (1 + (fdef?.rateBonus ?? 0));
  out.x = slotX(slot);
  out.y = slotY(slot, state.floors.length);
  return out;
}

/** Objet de travail réutilisé à chaque pas par `updateTowers`. */
const scratch = blankStats();
/** Cibles déjà touchées par un éclair en chaîne (réutilisé). */
const chainHit: number[] = [];

function canHit(tower: Tower, e: Enemy): boolean {
  const def = TOWERS[tower.kind];
  return isTargetable(e) && (isAir(e) ? def.hitsAir : def.hitsGround);
}

/** Cible la Brumâme la plus avancée dans la portée (`excludeId` : une cible à ignorer). */
export function findTarget(state: GameState, tower: Tower, s: EffectiveStats, excludeId = -1): Enemy | null {
  const r2 = s.range * s.range;
  const min2 = TOWERS[tower.kind].minRange ** 2;
  let best: Enemy | null = null;
  for (const e of state.enemies) {
    if (e.id === excludeId || !canHit(tower, e)) continue;
    const d2 = dist2(s.x, s.y, e.x, e.y);
    if (d2 > r2 || d2 < min2) continue;
    if (!best || e.progress > best.progress) best = e;
  }
  return best;
}

function enemyById(state: GameState, id: number): Enemy | undefined {
  const e = findEnemy(state, id);
  return e && e.hp > 0 ? e : undefined;
}

function launch(state: GameState, kind: 'bolt' | 'shell', s: EffectiveStats, target: Enemy, ty: number, speed: number, radius: number, duration: number): void {
  const p = acquireProjectile();
  p.kind = kind;
  p.x = p.sx = s.x;
  p.y = p.sy = s.y;
  p.tx = target.x;
  p.ty = ty;
  p.targetId = target.id;
  p.damage = s.damage;
  p.damageType = 'phys';
  p.speed = speed;
  p.radius = radius;
  p.t = 0;
  p.duration = duration;
  p.alive = true;
  state.projectiles.push(p);
}

function fireBolt(state: GameState, s: EffectiveStats, target: Enemy): void {
  launch(state, 'bolt', s, target, target.y, TOWERS.baliste.projectileSpeed, 0, 0);
}

function fireShell(state: GameState, s: EffectiveStats, target: Enemy): void {
  const d = Math.sqrt(dist2(s.x, s.y, target.x, target.y));
  const duration = 0.45 + d / TOWERS.mortier.projectileSpeed;
  // Visée anticipée : les grimpeurs montent, on vise un peu plus haut.
  const lead = target.phase === 'climb' ? 26 * duration : 0;
  launch(state, 'shell', s, target, target.y + lead, 0, s.radius, duration);
}

function pulse(state: GameState, slot: number, s: EffectiveStats): boolean {
  const r2 = s.radius * s.radius;
  let any = false;
  for (const e of state.enemies) {
    if (!isTargetable(e) || dist2(s.x, s.y, e.x, e.y) > r2) continue;
    any = true;
    slowEnemy(e, s.slow, SLOW_DURATION);
    damageEnemy(state, e, s.damage, 'givre');
  }
  if (any) state.events.push({ type: 'pulse', slot, radius: s.radius });
  return any;
}

function chain(state: GameState, tower: Tower, s: EffectiveStats, first: Enemy): void {
  chainHit.length = 0;
  // Le tracé part dans l'événement (consommé par le rendu) : seule allocation, une par décharge.
  const points: number[] = [s.x, s.y];
  let current: Enemy | null = first;
  let dmg = s.damage;
  for (let n = 0; n < s.targets && current; n++) {
    chainHit.push(current.id);
    points.push(current.x, current.y);
    const cx = current.x;
    const cy = current.y;
    if (damageEnemy(state, current, dmg, 'foudre')) tower.kills++;
    dmg *= CHAIN_FALLOFF;
    let next: Enemy | null = null;
    let bestD = s.radius * s.radius;
    for (const e of state.enemies) {
      if (chainHit.includes(e.id) || !canHit(tower, e)) continue;
      const d2 = dist2(cx, cy, e.x, e.y);
      if (d2 <= bestD) {
        bestD = d2;
        next = e;
      }
    }
    current = next;
  }
  state.events.push({ type: 'chain', points });
}

function updatePhare(state: GameState, tower: Tower, s: EffectiveStats, dt: number): void {
  let target = tower.targetId ? enemyById(state, tower.targetId) : undefined;
  const r2 = s.range * s.range;
  if (!target || !canHit(tower, target) || dist2(s.x, s.y, target.x, target.y) > r2) {
    const found = findTarget(state, tower, s);
    tower.focus = 0;
    tower.targetId = found ? found.id : 0;
    target = found ?? undefined;
  }
  if (!target) return;
  tower.focus = Math.min(PHARE_FOCUS_TIME, tower.focus + dt);
  const mul = 1 + (PHARE_FOCUS_MAX - 1) * (tower.focus / PHARE_FOCUS_TIME);
  tower.aim = Math.atan2(target.y - s.y, target.x - s.x);
  if (damageEnemy(state, target, s.damage * mul * dt, 'lumiere')) {
    tower.kills++;
    tower.targetId = 0;
  }
}

export function updateTowers(state: GameState, dt: number): void {
  for (let slot = 0; slot < state.slots.length; slot++) {
    const tower = state.slots[slot];
    if (!tower) continue;
    if (tower.disabled > 0) {
      tower.disabled -= dt;
      tower.targetId = 0;
      continue;
    }
    const s = towerStats(state, slot, tower, scratch);
    if (tower.kind === 'phare') {
      updatePhare(state, tower, s, dt);
      continue;
    }
    tower.cooldown -= dt;
    if (tower.cooldown > 0) continue;
    if (tower.kind === 'cloche') {
      if (pulse(state, slot, s)) tower.cooldown = 1 / s.rate;
      continue;
    }
    const target = findTarget(state, tower, s);
    if (!target) continue;
    tower.aim = Math.atan2(target.y - s.y, target.x - s.x);
    tower.cooldown = 1 / s.rate;
    state.events.push({ type: 'shot', slot, kind: tower.kind });
    if (tower.kind === 'baliste') {
      fireBolt(state, s, target);
      if (s.targets > 1) {
        const second = findTarget(state, tower, s, target.id);
        if (second) fireBolt(state, s, second);
      }
    } else if (tower.kind === 'mortier') fireShell(state, s, target);
    else if (tower.kind === 'bobine') chain(state, tower, s, target);
  }
}
