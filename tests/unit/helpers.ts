import type { EnemyKind } from '../../src/core/types';
import { createGame } from '../../src/sim/create';
import { spawnEnemy } from '../../src/sim/spawn';
import type { Enemy, GameState } from '../../src/sim/state';
import { step } from '../../src/sim/step';

/** Partie de test : niveau 1, beaucoup d'or, phase « vague » sans apparitions programmées. */
export function arena(gold = 5000, levelId = 9): GameState {
  const s = createGame(levelId, 42);
  s.gold = gold;
  s.phase = 'wave';
  s.spawners = [];
  s.waveIndex = 0;
  s.hpScale = 1;
  return s;
}

export function put(s: GameState, kind: EnemyKind, x: number, y: number, extra: Partial<Enemy> = {}): Enemy {
  const e = spawnEnemy(s, kind, x < 270 ? -1 : 1, { x, y, ...extra });
  if (e.phase === 'walk' && y > 0) e.phase = 'climb';
  s.events.length = 0;
  return e;
}

export function run(s: GameState, seconds: number): void {
  const n = Math.round(seconds * 60);
  for (let i = 0; i < n; i++) step(s);
}
