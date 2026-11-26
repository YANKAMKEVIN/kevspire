import { createGame } from '../sim/create';
import type { GameState, Modifiers } from '../sim/state';
import { NO_MODIFIERS } from '../sim/state';
import { advance } from '../sim/step';
import { botTick } from './bot';

export interface RunResult {
  won: boolean;
  lives: number;
  maxLives: number;
  waves: number;
  time: number;
  state: GameState;
}

/** Joue un niveau entier avec le bot, sans rendu. `maxTime` borne la durée simulée. */
export function runLevelWithBot(levelId: number, seed = 1, modifiers: Modifiers = NO_MODIFIERS, maxTime = 3600): RunResult {
  const state = createGame(levelId, seed, modifiers);
  while (state.phase !== 'won' && state.phase !== 'lost' && state.time < maxTime) {
    botTick(state);
    advance(state, 0.25);
  }
  return { won: state.phase === 'won', lives: state.lives, maxLives: state.maxLives, waves: state.waveIndex, time: state.time, state };
}
