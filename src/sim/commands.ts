import { dist2 } from '../core/math';
import type { AbilityKind, TowerKind } from '../core/types';
import { ENEMIES } from '../data/enemies';
import { FLOOR_H, heartPos, slotFromId, towerTop } from '../data/geometry';
import { SELL_REFUND, TOWERS, totalInvested } from '../data/towers';
import { damageEnemy, stunEnemy } from './enemies';
import { EARLY_CALL_GOLD_PER_SEC, EARLY_CALL_MAX, growTower, startWave } from './flow';
import type { GameState, Tower } from './state';

export const ECLAT_RADIUS = 120;
export const ECLAT_DAMAGE = 45;
export const ECLAT_STUN = 2.5;
export const RAFALE_PUSH = 160;

export type CommandResult = { ok: true } | { ok: false; reason: string };
const OK: CommandResult = { ok: true };
const fail = (reason: string): CommandResult => ({ ok: false, reason });

const playing = (s: GameState): boolean => s.phase === 'prep' || s.phase === 'wave';

/** Un emplacement existe s'il est sur un étage déjà construit. */
export function slotAvailable(state: GameState, slot: number): boolean {
  if (slot < 0 || slot >= state.slots.length) return false;
  return slotFromId(slot).floor < state.floors.length;
}

export function buildCost(state: GameState, kind: TowerKind): number {
  return Math.round(TOWERS[kind].levels[0].cost * state.modifiers.costMul);
}

export function upgradeCost(state: GameState, tower: Tower): number | null {
  const next = TOWERS[tower.kind].levels[tower.level];
  return next ? Math.round(next.cost * state.modifiers.costMul) : null;
}

export function sellValue(state: GameState, tower: Tower): number {
  return Math.floor(totalInvested(tower.kind, tower.level) * state.modifiers.costMul * SELL_REFUND);
}

export function build(state: GameState, slot: number, kind: TowerKind): CommandResult {
  if (!playing(state)) return fail('phase');
  if (!slotAvailable(state, slot)) return fail('emplacement');
  if (state.slots[slot]) return fail('occupé');
  const cost = buildCost(state, kind);
  if (state.gold < cost) return fail('or');
  state.gold -= cost;
  state.slots[slot] = { kind, level: 1, cooldown: 0.2, targetId: 0, focus: 0, disabled: 0, aim: -Math.PI / 2, kills: 0 };
  state.stats.towersBuilt++;
  state.events.push({ type: 'build', slot, kind, level: 1 });
  return OK;
}

export function upgrade(state: GameState, slot: number): CommandResult {
  if (!playing(state)) return fail('phase');
  const tower = state.slots[slot];
  if (!tower) return fail('vide');
  const cost = upgradeCost(state, tower);
  if (cost === null) return fail('max');
  if (state.gold < cost) return fail('or');
  state.gold -= cost;
  tower.level++;
  state.events.push({ type: 'build', slot, kind: tower.kind, level: tower.level });
  return OK;
}

export function sell(state: GameState, slot: number): CommandResult {
  if (!playing(state)) return fail('phase');
  const tower = state.slots[slot];
  if (!tower) return fail('vide');
  const refund = sellValue(state, tower);
  state.gold += refund;
  state.slots[slot] = null;
  state.events.push({ type: 'sell', slot, refund });
  return OK;
}

export function callWave(state: GameState): CommandResult {
  if (state.phase !== 'prep') return fail('phase');
  if (state.waveIndex > 0) {
    const bonus = Math.min(EARLY_CALL_MAX, Math.floor(state.countdown * EARLY_CALL_GOLD_PER_SEC));
    state.gold += bonus;
    state.stats.goldEarned += bonus;
  }
  startWave(state);
  return OK;
}

export function chooseFloor(state: GameState, index: number): CommandResult {
  return growTower(state, index) ? OK : fail('choix');
}

export function useAbility(state: GameState, kind: AbilityKind, x = 0, y = 0): CommandResult {
  if (state.phase !== 'wave') return fail('phase');
  const ab = state.abilities[kind];
  if (ab.cooldown > 0) return fail('recharge');
  ab.cooldown = ab.maxCooldown;
  state.stats.abilitiesUsed++;
  if (kind === 'eclat') {
    const r2 = ECLAT_RADIUS * ECLAT_RADIUS;
    for (const e of state.enemies) {
      if (e.phase === 'burrow' || dist2(x, y, e.x, e.y) > r2) continue;
      stunEnemy(e, ECLAT_STUN);
      damageEnemy(state, e, ECLAT_DAMAGE * (1 + state.waveIndex * 0.08) * state.hpScale, 'lumiere');
    }
  } else {
    rafale(state);
  }
  state.events.push({ type: 'ability', kind, x, y });
  return OK;
}

/** Souffle les grimpeurs d'un étage vers le bas et repousse les volants. */
function rafale(state: GameState): void {
  const top = towerTop(state.floors.length);
  const heart = heartPos(state.floors.length);
  for (const e of state.enemies) {
    const boss = ENEMIES[e.kind].boss === true;
    const push = boss ? 0.35 : 1;
    if (e.phase === 'climb' || e.phase === 'top') {
      if (e.phase === 'top') e.y = top;
      e.phase = 'climb';
      e.y = Math.max(0, e.y - FLOOR_H * push);
      e.x = e.side < 0 ? Math.min(e.x, heart.x - 90) : Math.max(e.x, heart.x + 90);
    } else if (e.phase === 'fly') {
      const dx = e.x - heart.x;
      const dy = e.y - heart.y;
      const d = Math.hypot(dx, dy) || 1;
      e.x += (dx / d) * RAFALE_PUSH * push;
      e.y += (dy / d) * RAFALE_PUSH * push;
      e.targetSlot = -1;
    }
  }
}
