import type { AbilityKind, DamageType, EnemyKind, FloorKind, Side, TowerKind } from '../core/types';
import type { RngState } from '../core/rng';
import type { SpawnGroup } from '../data/levels';

export type Phase = 'prep' | 'wave' | 'choose' | 'won' | 'lost';
export type EnemyPhase = 'walk' | 'climb' | 'top' | 'fly' | 'burrow';

export interface Tower {
  kind: TowerKind;
  level: number;
  cooldown: number;
  targetId: number;
  /** Concentration du Phare sur la même cible (secondes). */
  focus: number;
  /** Tourelle endormie par un Planeur (secondes restantes). */
  disabled: number;
  /** Angle de visée en radians (pour le rendu). */
  aim: number;
  kills: number;
}

export interface Enemy {
  id: number;
  kind: EnemyKind;
  hp: number;
  maxHp: number;
  x: number;
  y: number;
  side: Side;
  phase: EnemyPhase;
  progress: number;
  slowTimer: number;
  slowAmount: number;
  stunTimer: number;
  /** Hauteur de sortie pour les Fouisseurs. */
  emergeY: number;
  /** Minuterie générique (portée de la Mère-Brume). */
  timer: number;
  /** Graine visuelle (ondulations). */
  wobble: number;
  /** Emplacement visé par un Planeur (-1 = aucun). */
  targetSlot: number;
  hitFlash: number;
}

export interface Projectile {
  kind: 'bolt' | 'shell';
  x: number;
  y: number;
  sx: number;
  sy: number;
  tx: number;
  ty: number;
  targetId: number;
  damage: number;
  damageType: DamageType;
  speed: number;
  radius: number;
  t: number;
  duration: number;
  alive: boolean;
}

export interface Spawner {
  group: SpawnGroup;
  spawned: number;
  timer: number;
}

export interface Modifiers {
  startGold: number;
  costMul: number;
  rangeMul: number;
  extraLives: number;
  damageMul: number;
  cooldownMul: number;
}

export const NO_MODIFIERS: Modifiers = {
  startGold: 0, costMul: 1, rangeMul: 1, extraLives: 0, damageMul: 1, cooldownMul: 1,
};

export interface AbilityState {
  cooldown: number;
  maxCooldown: number;
}

export interface GameStats {
  kills: number;
  leaked: number;
  goldEarned: number;
  towersBuilt: number;
  abilitiesUsed: number;
}

export type GameEvent =
  | { type: 'shot'; slot: number; kind: TowerKind }
  | { type: 'hit'; x: number; y: number; damageType: DamageType; big: boolean }
  | { type: 'explosion'; x: number; y: number; radius: number }
  | { type: 'pulse'; slot: number; radius: number }
  | { type: 'chain'; points: number[] }
  | { type: 'kill'; x: number; y: number; kind: EnemyKind; bounty: number }
  | { type: 'leak'; x: number; y: number; amount: number; kind: EnemyKind }
  | { type: 'emerge'; x: number; y: number }
  | { type: 'disable'; slot: number }
  | { type: 'build'; slot: number; kind: TowerKind; level: number }
  | { type: 'sell'; slot: number; refund: number }
  | { type: 'waveStart'; wave: number }
  | { type: 'waveEnd'; wave: number; bonus: number }
  | { type: 'grow'; floor: number; kind: FloorKind }
  | { type: 'ability'; kind: AbilityKind; x: number; y: number }
  | { type: 'spawn'; kind: EnemyKind; id: number }
  | { type: 'won' }
  | { type: 'lost' };

export interface GameState {
  version: 1;
  levelId: number;
  endless: boolean;
  seed: number;
  rng: RngState;
  time: number;
  phase: Phase;
  /** Index de la vague en cours, ou de la prochaine en préparation. */
  waveIndex: number;
  totalWaves: number;
  countdown: number;
  gold: number;
  lives: number;
  maxLives: number;
  hpScale: number;
  growEvery: number;
  floors: (FloorKind | null)[];
  maxFloors: number;
  slots: (Tower | null)[];
  enemies: Enemy[];
  projectiles: Projectile[];
  spawners: Spawner[];
  abilities: Record<AbilityKind, AbilityState>;
  floorChoices: FloorKind[];
  stats: GameStats;
  modifiers: Modifiers;
  nextId: number;
  /** Événements de la dernière mise à jour, consommés par le rendu et l'audio (non sauvegardés). */
  events: GameEvent[];
}
