import { ENDLESS_ID, LEVELS } from '../data/levels';
import type { SaveData } from '../save/schema';
import type { GameState } from '../sim/state';
import { spentEclats } from './upgrades';

/** 3 étoiles : Cœur quasi intact ; 2 : plus de la moitié ; 1 : victoire. */
export function starsFor(lives: number, maxLives: number): number {
  const ratio = maxLives > 0 ? lives / maxLives : 0;
  if (ratio >= 0.9) return 3;
  if (ratio >= 0.5) return 2;
  return lives > 0 ? 1 : 0;
}

export function totalStars(save: SaveData): number {
  return Object.values(save.levels).reduce((s, l) => s + l.stars, 0);
}

/** Éclats gagnés : une par étoile, plus une par palier de 5 vagues en Ascension infinie. */
export function earnedEclats(save: SaveData): number {
  return totalStars(save) + Math.floor(save.bestEndlessWave / 5);
}

export function availableEclats(save: SaveData): number {
  return earnedEclats(save) - spentEclats(save.upgrades);
}

export function isLevelUnlocked(save: SaveData, id: number): boolean {
  if (id === ENDLESS_ID) return (save.levels['3']?.stars ?? 0) > 0;
  if (id === 1) return true;
  return (save.levels[String(id - 1)]?.stars ?? 0) > 0;
}

export interface LevelOutcome {
  stars: number;
  newBest: boolean;
  eclatsGained: number;
}

/** Enregistre le résultat d'une partie terminée dans la sauvegarde (sans l'écrire). */
export function recordResult(save: SaveData, state: GameState): LevelOutcome {
  const before = earnedEclats(save);
  save.run = null;
  if (state.endless) {
    const newBest = state.waveIndex > save.bestEndlessWave;
    if (newBest) save.bestEndlessWave = state.waveIndex;
    return { stars: 0, newBest, eclatsGained: earnedEclats(save) - before };
  }
  const stars = state.phase === 'won' ? starsFor(state.lives, state.maxLives) : 0;
  const key = String(state.levelId);
  const prev = save.levels[key];
  const newBest = !prev || stars > prev.stars;
  if (stars > 0) save.levels[key] = { stars: Math.max(stars, prev?.stars ?? 0), bestLives: Math.max(state.lives, prev?.bestLives ?? 0) };
  return { stars, newBest: newBest && stars > 0, eclatsGained: earnedEclats(save) - before };
}

export const MAX_STARS = LEVELS.length * 3;
