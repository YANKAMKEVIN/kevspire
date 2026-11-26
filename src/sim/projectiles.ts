import { dist2 } from '../core/math';
import { damageEnemy, isAir, isTargetable } from './enemies';
import type { GameState, Projectile } from './state';

const BOLT_HIT_RADIUS = 14;

function updateBolt(state: GameState, p: Projectile, dt: number): void {
  const target = state.enemies.find((e) => e.id === p.targetId && isTargetable(e));
  if (target) {
    p.tx = target.x;
    p.ty = target.y;
  }
  const dx = p.tx - p.x;
  const dy = p.ty - p.y;
  const d = Math.hypot(dx, dy);
  const step = p.speed * dt;
  if (d <= step + BOLT_HIT_RADIUS) {
    p.alive = false;
    if (target) {
      damageEnemy(state, target, p.damage, p.damageType);
      state.events.push({ type: 'hit', x: target.x, y: target.y, damageType: p.damageType, big: false });
    }
    return;
  }
  p.x += (dx / d) * step;
  p.y += (dy / d) * step;
}

function updateShell(state: GameState, p: Projectile, dt: number): void {
  p.t += dt;
  const k = Math.min(1, p.t / p.duration);
  p.x = p.sx + (p.tx - p.sx) * k;
  // Trajectoire en cloche : apex au-dessus du plus haut des deux points.
  const apex = Math.max(p.sy, p.ty) + 90;
  const linear = p.sy + (p.ty - p.sy) * k;
  p.y = linear + (apex - Math.max(p.sy, p.ty)) * 4 * k * (1 - k);
  if (k < 1) return;
  p.alive = false;
  const r2 = p.radius * p.radius;
  for (const e of state.enemies) {
    if (!isTargetable(e) || isAir(e)) continue;
    if (dist2(p.tx, p.ty, e.x, e.y) <= r2) damageEnemy(state, e, p.damage, p.damageType);
  }
  state.events.push({ type: 'explosion', x: p.tx, y: p.ty, radius: p.radius });
}

export function updateProjectiles(state: GameState, dt: number): void {
  const list = state.projectiles;
  for (const p of list) {
    if (!p.alive) continue;
    if (p.kind === 'bolt') updateBolt(state, p, dt);
    else updateShell(state, p, dt);
  }
  let n = 0;
  for (let i = 0; i < list.length; i++) {
    const p = list[i] as Projectile;
    if (p.alive) list[n++] = p;
  }
  list.length = n;
}
