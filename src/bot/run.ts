import { createGame } from '../sim/create';
import { finishRecording, startRecording } from '../sim/replay';
import type { Replay } from '../sim/replay';
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
  /** Enregistrement de la partie, rejouable à l'identique avec playReplay. */
  replay: Replay;
}

/** Une décision de joueur automatique (bot complet ou stratégie de référence). */
export type Strategy = (state: GameState, record: Replay['entries']) => void;

const fullBot: Strategy = (state, record) => {
  botTick(state, [], record);
};

/** Joue un niveau entier avec une stratégie, sans rendu. `maxTime` borne la durée simulée. */
export function runLevelWith(strategy: Strategy, levelId: number, seed = 1, modifiers: Modifiers = NO_MODIFIERS, maxTime = 3600): RunResult {
  const state = createGame(levelId, seed, modifiers);
  const replay = startRecording(state);
  while (state.phase !== 'won' && state.phase !== 'lost' && state.time < maxTime) {
    strategy(state, replay.entries);
    advance(state, 0.25);
  }
  finishRecording(replay, state);
  return { won: state.phase === 'won', lives: state.lives, maxLives: state.maxLives, waves: state.waveIndex, time: state.time, state, replay };
}

/** Joue un niveau entier avec le bot, sans rendu. `maxTime` borne la durée simulée. */
export function runLevelWithBot(levelId: number, seed = 1, modifiers: Modifiers = NO_MODIFIERS, maxTime = 3600): RunResult {
  return runLevelWith(fullBot, levelId, seed, modifiers, maxTime);
}
