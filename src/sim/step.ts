import { compactEnemies, updateEnemies } from './enemies';
import { checkWaveFlow, startWave } from './flow';
import { updateProjectiles } from './projectiles';
import { updateSpawners } from './spawn';
import type { GameState } from './state';
import { updateTowers } from './towers';

export const FIXED_DT = 1 / 60;

/** Avance la simulation d'un pas fixe. Les événements produits s'ajoutent à `state.events`. */
export function step(state: GameState, dt: number = FIXED_DT): void {
  if (state.phase === 'choose' || state.phase === 'won' || state.phase === 'lost') return;
  state.time += dt;
  const { eclat, rafale } = state.abilities;
  if (eclat.cooldown > 0) eclat.cooldown = Math.max(0, eclat.cooldown - dt);
  if (rafale.cooldown > 0) rafale.cooldown = Math.max(0, rafale.cooldown - dt);
  if (state.phase === 'prep') {
    state.countdown -= dt;
    if (state.countdown <= 0) startWave(state);
  }
  if (state.phase === 'wave') updateSpawners(state, dt);
  updateEnemies(state, dt);
  updateTowers(state, dt);
  updateProjectiles(state, dt);
  compactEnemies(state);
  checkWaveFlow(state);
}

/** Exécute `seconds` de simulation en pas fixes (utile pour les tests et le bot). */
export function advance(state: GameState, seconds: number): void {
  const steps = Math.round(seconds / FIXED_DT);
  for (let i = 0; i < steps; i++) {
    step(state);
    state.events.length = 0;
    if (state.phase === 'won' || state.phase === 'lost') break;
  }
}

export function drainEvents(state: GameState): GameState['events'] {
  const ev = state.events;
  state.events = [];
  return ev;
}
