import type { Enemy, Projectile } from './state';

/**
 * Réserves d'objets pour la simulation (perf mobile) : un projectile ou une Brumâme
 * retirée de l'état est rangée ici et réutilisée au prochain tir ou à la prochaine
 * apparition, au lieu d'allouer un nouvel objet. Les réserves vivent hors de l'état
 * (qui reste du JSON pur) et chaque champ est réécrit à la réutilisation : elles
 * n'ont aucun effet sur le déterminisme.
 *
 * Un objet rendu à la réserve n'est pas remis à zéro : un test qui garde une référence
 * vers une Brumâme morte lit toujours `hp <= 0` tant qu'elle n'a pas été réutilisée.
 */
const MAX_FREE = 512;
const freeProjectiles: Projectile[] = [];
const freeEnemies: Enemy[] = [];

/** Compteurs d'objets réellement alloués (pour les tests de non-allocation). */
export const poolStats = { projectilesCreated: 0, enemiesCreated: 0 };

export function acquireProjectile(): Projectile {
  const p = freeProjectiles.pop();
  if (p) return p;
  poolStats.projectilesCreated++;
  return {
    kind: 'bolt', x: 0, y: 0, sx: 0, sy: 0, tx: 0, ty: 0, targetId: 0,
    damage: 0, damageType: 'phys', speed: 0, radius: 0, t: 0, duration: 0, alive: false,
  };
}

export function releaseProjectile(p: Projectile): void {
  p.alive = false;
  if (freeProjectiles.length < MAX_FREE) freeProjectiles.push(p);
}

export function acquireEnemy(): Enemy {
  const e = freeEnemies.pop();
  if (e) return e;
  poolStats.enemiesCreated++;
  return {
    id: 0, kind: 'grignot', hp: 0, maxHp: 0, x: 0, y: 0, side: -1, phase: 'walk', progress: 0,
    slowTimer: 0, slowAmount: 0, stunTimer: 0, emergeY: 0, timer: 0, wobble: 0, targetSlot: -1, hitFlash: 0,
  };
}

export function releaseEnemy(e: Enemy): void {
  if (freeEnemies.length < MAX_FREE) freeEnemies.push(e);
}

/** Vide les réserves (tests). */
export function resetPools(): void {
  freeProjectiles.length = 0;
  freeEnemies.length = 0;
  poolStats.projectilesCreated = 0;
  poolStats.enemiesCreated = 0;
}
