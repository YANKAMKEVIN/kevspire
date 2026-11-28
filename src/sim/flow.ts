import { sample } from '../core/rng';
import { FLOORS, FLOOR_ORDER } from '../data/floors';
import { INTER_WAVE } from './create';
import { clearProjectiles } from './projectiles';
import { beginWaveSpawners, spawnersDone } from './spawn';
import type { GameState } from './state';

export const WAVE_BONUS_BASE = 22;
export const WAVE_BONUS_STEP = 4;
/** Or offert par seconde de compte à rebours restante quand on appelle la vague en avance. */
export const EARLY_CALL_GOLD_PER_SEC = 2;
export const EARLY_CALL_MAX = 40;

export function startWave(state: GameState): void {
  if (state.phase !== 'prep') return;
  state.phase = 'wave';
  state.countdown = 0;
  beginWaveSpawners(state);
  state.events.push({ type: 'waveStart', wave: state.waveIndex });
}

function endWave(state: GameState): void {
  const bonus = WAVE_BONUS_BASE + WAVE_BONUS_STEP * state.waveIndex;
  let gold = bonus;
  for (const kind of state.floors) {
    if (!kind) continue;
    gold += FLOORS[kind].goldPerWave;
    state.lives = Math.min(state.maxLives, state.lives + FLOORS[kind].healPerWave);
  }
  state.gold += gold;
  state.stats.goldEarned += gold;
  state.events.push({ type: 'waveEnd', wave: state.waveIndex, bonus: gold });
  clearProjectiles(state);
  state.waveIndex++;
  if (!state.endless && state.waveIndex >= state.totalWaves) {
    state.phase = 'won';
    state.events.push({ type: 'won' });
    return;
  }
  const grows = state.waveIndex % state.growEvery === 0 && state.floors.length < state.maxFloors;
  if (grows) {
    state.phase = 'choose';
    state.floorChoices = sample(state.rng, FLOOR_ORDER, 3);
  } else {
    state.phase = 'prep';
    state.countdown = INTER_WAVE;
  }
}

/** Ajoute l'étage choisi au sommet de la tour (les volants suivent le Cœur qui monte). */
export function growTower(state: GameState, choiceIndex: number): boolean {
  if (state.phase !== 'choose') return false;
  const kind = state.floorChoices[choiceIndex];
  if (!kind) return false;
  state.floors.push(kind);
  state.floorChoices = [];
  state.phase = 'prep';
  state.countdown = INTER_WAVE;
  state.events.push({ type: 'grow', floor: state.floors.length - 1, kind });
  return true;
}

export function checkWaveFlow(state: GameState): void {
  if (state.phase === 'wave' && state.lives > 0 && spawnersDone(state) && state.enemies.length === 0) endWave(state);
  if (state.lives <= 0 && state.phase !== 'lost') {
    state.phase = 'lost';
    state.events.push({ type: 'lost' });
  }
}
