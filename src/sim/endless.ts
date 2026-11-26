import type { EnemyKind, SpawnSide } from '../core/types';
import type { SpawnGroup, WaveDef } from '../data/levels';

/**
 * Génère la vague `index` (0-based) du mode Ascension infinie.
 * Déterministe : ne dépend que de l'index, pour que deux parties soient comparables.
 */
export function endlessWave(index: number): WaveDef {
  const n = index + 1;
  const groups: SpawnGroup[] = [];
  const add = (enemy: EnemyKind, count: number, interval: number, delay: number, side: SpawnSide) =>
    groups.push({ enemy, count: Math.max(1, Math.round(count)), interval, delay, side });

  add('grignot', 8 + n * 1.6, Math.max(0.2, 1.0 - n * 0.03), 0, 'both');
  if (n >= 2) add('papillombre', 3 + n * 0.9, Math.max(0.3, 1.2 - n * 0.03), 2, 'sky');
  if (n >= 3) add('carapace', 1 + n * 0.45, Math.max(0.7, 2.5 - n * 0.06), 4, n % 2 ? 'L' : 'R');
  if (n >= 4 && n % 2 === 0) add('fouisseur', 2 + n * 0.5, Math.max(0.5, 1.6 - n * 0.04), 3, 'under');
  if (n >= 5 && n % 3 !== 1) add('moucheron', 10 + n * 2, 0.16, 5, 'sky');
  if (n >= 6 && n % 2 === 1) add('planeur', 1 + n * 0.3, Math.max(0.8, 2.0 - n * 0.04), 6, 'sky');
  if (n % 5 === 0) add('mereBrume', Math.floor(n / 10) + 1, 8, 0, n % 10 === 0 ? 'both' : 'L');
  return { groups };
}

/** PV croissants : le mode infini finit toujours par l'emporter. */
export function endlessHpScale(index: number): number {
  return 0.9 * Math.pow(1.085, index);
}
