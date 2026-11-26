import { createRng } from '../core/rng';
import { slotCount } from '../data/geometry';
import { ENDLESS_ID, getLevel } from '../data/levels';
import type { GameState, Modifiers } from './state';
import { NO_MODIFIERS } from './state';

export const ABILITY_COOLDOWN = { eclat: 32, rafale: 48 } as const;
/** Délai avant la première vague : le joueur la lance quand il est prêt. */
export const FIRST_COUNTDOWN = 999;
export const INTER_WAVE = 14;

export function createGame(levelId: number, seed: number, modifiers: Modifiers = NO_MODIFIERS): GameState {
  const endless = levelId === ENDLESS_ID;
  const level = endless ? null : getLevel(levelId);
  const startFloors = level?.startFloors ?? 3;
  const maxFloors = level?.maxFloors ?? 12;
  const lives = (level?.lives ?? 20) + modifiers.extraLives;
  const slots = new Array(slotCount(maxFloors)).fill(null);
  return {
    version: 1,
    levelId,
    endless,
    seed,
    rng: createRng(seed),
    time: 0,
    phase: 'prep',
    waveIndex: 0,
    totalWaves: level ? level.waves.length : Number.POSITIVE_INFINITY,
    countdown: FIRST_COUNTDOWN,
    gold: (level?.startGold ?? 320) + modifiers.startGold,
    lives,
    maxLives: lives,
    hpScale: level?.hpScale ?? 1,
    growEvery: level?.growEvery ?? 2,
    floors: new Array(startFloors).fill(null),
    maxFloors,
    slots,
    enemies: [],
    projectiles: [],
    spawners: [],
    abilities: {
      eclat: { cooldown: 0, maxCooldown: ABILITY_COOLDOWN.eclat * modifiers.cooldownMul },
      rafale: { cooldown: 0, maxCooldown: ABILITY_COOLDOWN.rafale * modifiers.cooldownMul },
    },
    floorChoices: [],
    stats: { kills: 0, leaked: 0, goldEarned: 0, towersBuilt: 0, abilitiesUsed: 0 },
    modifiers: { ...modifiers },
    nextId: 1,
    events: [],
  };
}
