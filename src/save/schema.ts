import type { EnemyKind } from '../core/types';
import type { UpgradeRanks } from '../meta/upgrades';
import type { GameState } from '../sim/state';

export const SAVE_VERSION = 2;

export type Quality = 'auto' | 'haute' | 'eco';

export interface Settings {
  music: number;
  sfx: number;
  haptics: boolean;
  quality: Quality;
}

export interface LevelRecord {
  stars: number;
  bestLives: number;
}

export interface SaveData {
  version: typeof SAVE_VERSION;
  levels: Record<string, LevelRecord>;
  upgrades: UpgradeRanks;
  bestEndlessWave: number;
  seenEnemies: EnemyKind[];
  settings: Settings;
  tutorialDone: boolean;
  /** Partie en cours, sauvegardée au début de chaque vague, pour pouvoir la reprendre. */
  run: GameState | null;
  /** Nombre de sauvegardes écrites (diagnostic). */
  writes: number;
}

/** Ancien format (v1) : un tableau d'étoiles et un booléen pour le son. */
export interface SaveDataV1 {
  version: 1;
  stars: number[];
  sound: boolean;
}

export const DEFAULT_SETTINGS: Settings = { music: 0.6, sfx: 0.8, haptics: true, quality: 'auto' };
