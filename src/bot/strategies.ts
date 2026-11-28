import { executeRecorded } from '../sim/replay';
import type { Strategy } from './run';

/**
 * Stratégies de référence, volontairement faibles, pour détecter un niveau trivial :
 * si un joueur qui ne fait (presque) rien gagne, le niveau ne demande aucun effort.
 */

/** Ne construit rien : se contente de lancer les vagues et de choisir le premier étage. */
export const idleStrategy: Strategy = (state, record) => {
  if (state.phase === 'choose') executeRecorded(state, { c: 'chooseFloor', index: 0 }, record);
  else if (state.phase === 'prep') executeRecorded(state, { c: 'callWave' }, record);
};

/** Pose deux Balistes aux postes du sommet, sans jamais les améliorer ni utiliser de pouvoir. */
export const lazyStrategy: Strategy = (state, record) => {
  if (state.phase === 'choose') {
    executeRecorded(state, { c: 'chooseFloor', index: 0 }, record);
    return;
  }
  for (const slot of [0, 1]) if (!state.slots[slot]) executeRecorded(state, { c: 'build', slot, kind: 'baliste' }, record);
  if (state.phase === 'prep') executeRecorded(state, { c: 'callWave' }, record);
};
