import type { AbilityKind, TowerKind } from '../core/types';
import { fnv1a } from '../core/math';
import { build, callWave, chooseFloor, sell, upgrade, useAbility } from './commands';
import type { CommandResult } from './commands';
import type { GameState } from './state';
import { FIXED_DT, step } from './step';

/**
 * Rejeu déterministe : une partie = un état de départ + la liste horodatée (en pas
 * de simulation) des commandes du joueur. Comme la simulation est déterministe,
 * rejouer ces commandes aux mêmes pas redonne exactement le même état final.
 * Sert aux tests, au bot, et à reproduire un bug signalé par un joueur.
 */
export type Command =
  | { c: 'build'; slot: number; kind: TowerKind }
  | { c: 'upgrade'; slot: number }
  | { c: 'sell'; slot: number }
  | { c: 'callWave' }
  | { c: 'chooseFloor'; index: number }
  | { c: 'ability'; kind: AbilityKind; x: number; y: number };

export interface ReplayEntry {
  tick: number;
  cmd: Command;
}

export interface Replay {
  version: 1;
  /** État au moment où l'enregistrement commence (partie neuve ou reprise). */
  start: GameState;
  entries: ReplayEntry[];
  /** Pas de simulation au moment de l'arrêt de l'enregistrement. */
  endTick: number;
  /** Empreinte de l'état final attendu. */
  endHash: string;
}

/** Numéro du pas de simulation courant (entier, dérivé du temps de jeu). */
export function tickOf(state: GameState): number {
  return Math.round(state.time / FIXED_DT);
}

/** Empreinte stable d'un état (les événements, non sauvegardés, sont ignorés). */
export function stateHash(state: GameState): string {
  return fnv1a(JSON.stringify({ ...state, events: [] }));
}

/** Exécute une commande joueur. */
export function execute(state: GameState, cmd: Command): CommandResult {
  switch (cmd.c) {
    case 'build':
      return build(state, cmd.slot, cmd.kind);
    case 'upgrade':
      return upgrade(state, cmd.slot);
    case 'sell':
      return sell(state, cmd.slot);
    case 'callWave':
      return callWave(state);
    case 'chooseFloor':
      return chooseFloor(state, cmd.index);
    case 'ability':
      return useAbility(state, cmd.kind, cmd.x, cmd.y);
  }
}

/** Exécute une commande et, si elle réussit, l'ajoute au journal `log`. */
export function executeRecorded(state: GameState, cmd: Command, log?: ReplayEntry[]): CommandResult {
  const r = execute(state, cmd);
  if (r.ok && log) log.push({ tick: tickOf(state), cmd });
  return r;
}

const clone = (s: GameState): GameState => JSON.parse(JSON.stringify({ ...s, events: [] })) as GameState;

/** Commence l'enregistrement d'une partie à partir de son état actuel. */
export function startRecording(state: GameState): Replay {
  return { version: 1, start: clone(state), entries: [], endTick: tickOf(state), endHash: '' };
}

/** Clôt l'enregistrement : mémorise le pas et l'empreinte de l'état final. */
export function finishRecording(replay: Replay, state: GameState): Replay {
  replay.endTick = tickOf(state);
  replay.endHash = stateHash(state);
  return replay;
}

export class ReplayDivergence extends Error {}

/** Avance jusqu'au pas `tick` ; lève une erreur si la simulation ne peut plus avancer. */
function stepUntil(state: GameState, tick: number): void {
  while (tickOf(state) < tick) {
    const before = state.time;
    step(state);
    state.events.length = 0;
    if (state.time === before) throw new ReplayDivergence(`partie bloquée (${state.phase}) au pas ${tickOf(state)}, attendu ${tick}`);
  }
}

/** Rejoue un enregistrement et renvoie l'état final. Lève ReplayDivergence si une commande échoue. */
export function playReplay(replay: Replay): GameState {
  const state = clone(replay.start);
  for (const { tick, cmd } of replay.entries) {
    stepUntil(state, tick);
    const r = execute(state, cmd);
    state.events.length = 0;
    if (!r.ok) throw new ReplayDivergence(`commande ${cmd.c} refusée au pas ${tick} (${r.reason})`);
  }
  if (state.phase === 'prep' || state.phase === 'wave') stepUntil(state, replay.endTick);
  return state;
}

/** Le rejeu redonne-t-il exactement l'état final enregistré ? */
export function verifyReplay(replay: Replay): boolean {
  try {
    return stateHash(playReplay(replay)) === replay.endHash;
  } catch (e) {
    if (e instanceof ReplayDivergence) return false;
    throw e;
  }
}
