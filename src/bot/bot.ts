import { dist2 } from '../core/math';
import type { FloorKind, TowerKind } from '../core/types';
import { ENEMIES } from '../data/enemies';
import { FLOOR_H, heartPos, slotFromId, slotId, towerTop } from '../data/geometry';
import { LEVELS } from '../data/levels';
import { TOWERS, TOWER_ORDER } from '../data/towers';
import { buildCost, slotAvailable, upgradeCost } from '../sim/commands';
import { executeRecorded } from '../sim/replay';
import type { Command, ReplayEntry } from '../sim/replay';
import type { GameState } from '../sim/state';

/**
 * Joueur automatique : sert au parcours complet automatisé (tests + e2e)
 * et à valider l'équilibrage. Il n'utilise que les commandes publiques du joueur.
 */
export interface BotAction {
  type: 'build' | 'upgrade' | 'callWave' | 'chooseFloor' | 'ability';
  detail: string;
}

/** Contexte d'une décision : journal lisible et, en option, enregistrement pour le rejeu. */
interface Ctx {
  log: BotAction[];
  record?: ReplayEntry[];
}

function act(state: GameState, ctx: Ctx, cmd: Command, type: BotAction['type'], detail: string): boolean {
  if (!executeRecorded(state, cmd, ctx.record).ok) return false;
  ctx.log.push({ type, detail });
  return true;
}

const FLOOR_PREF: readonly FloorKind[] = ['atelier', 'belvedere', 'rempart', 'sanctuaire', 'comptoir'];

export function unlockedTowers(levelId: number): TowerKind[] {
  return TOWER_ORDER.filter((k) => TOWERS[k].unlockLevel <= levelId);
}

function levelHasFliers(state: GameState): boolean {
  if (state.endless) return true;
  const level = LEVELS.find((l) => l.id === state.levelId);
  return !!level?.waves.some((w) => w.groups.some((g) => ENEMIES[g.enemy].movement === 'flier'));
}

/** Choix de tourelle pour un emplacement : anti-aérien au sommet, zone et contrôle sur les murs. */
function kindForSlot(state: GameState, slot: number): TowerKind {
  const unlocked = unlockedTowers(state.endless ? 99 : state.levelId);
  const { floor, side } = slotFromId(slot);
  const has = (k: TowerKind) => unlocked.includes(k);
  if (floor < 0) {
    if (side > 0 && has('bobine')) return 'bobine';
    if (side > 0 && has('phare')) return 'phare';
    return 'baliste';
  }
  const fliers = levelHasFliers(state);
  const topFloor = state.floors.length - 1;
  if (fliers && floor === topFloor) return side < 0 ? 'baliste' : has('cloche') ? 'cloche' : 'baliste';
  const pattern: TowerKind[] = ['mortier', 'baliste', 'phare', 'cloche', 'bobine', 'mortier', 'baliste'];
  const choice = pattern[(floor * 2 + (side < 0 ? 0 : 1)) % pattern.length] as TowerKind;
  return has(choice) ? choice : 'baliste';
}

/** Ordre de remplissage : postes du sommet, puis étages du haut vers le bas. */
function slotOrder(state: GameState): number[] {
  const order = [0, 1];
  for (let floor = state.floors.length - 1; floor >= 0; floor--) order.push(slotId(floor, -1), slotId(floor, 1));
  return order;
}

function upgradeCrown(state: GameState, ctx: Ctx): boolean {
  for (const slot of [0, 1]) {
    const t = state.slots[slot];
    if (!t || t.level >= 3) continue;
    const cost = upgradeCost(state, t);
    if (cost === null || state.gold < cost) return false;
    act(state, ctx, { c: 'upgrade', slot }, 'upgrade', `${slot}`);
  }
  return true;
}

function spend(state: GameState, ctx: Ctx): void {
  const built = state.slots.filter(Boolean).length;
  // 0. Les postes du sommet d'abord au maximum : c'est là que tout converge.
  if (built >= 5 && !upgradeCrown(state, ctx)) return;
  // 1. Remplir les emplacements libres.
  for (const slot of slotOrder(state)) {
    if (!slotAvailable(state, slot) || state.slots[slot]) continue;
    const kind = kindForSlot(state, slot);
    if (state.gold < buildCost(state, kind)) return;
    act(state, ctx, { c: 'build', slot, kind }, 'build', `${kind}@${slot}`);
  }
  // 2. Améliorer la tourelle la moins avancée (priorité aux étages hauts).
  for (;;) {
    let best = -1;
    let bestScore = Number.POSITIVE_INFINITY;
    state.slots.forEach((t, slot) => {
      if (!t) return;
      const cost = upgradeCost(state, t);
      if (cost === null) return;
      const score = t.level * 100 + slot;
      if (score < bestScore) {
        bestScore = score;
        best = slot;
      }
    });
    if (best < 0) return;
    const tower = state.slots[best];
    const cost = tower ? upgradeCost(state, tower) : null;
    if (cost === null || state.gold < cost) return;
    if (!act(state, ctx, { c: 'upgrade', slot: best }, 'upgrade', `${best}`)) return;
  }
}

function useAbilities(state: GameState, ctx: Ctx): void {
  const top = towerTop(state.floors.length);
  const heart = heartPos(state.floors.length);
  const danger = state.enemies.filter(
    (e) => e.hp > 0 && (e.y > top - FLOOR_H * 1.2 || dist2(e.x, e.y, heart.x, heart.y) < 200 * 200),
  );
  if (danger.length === 0) return;
  if (state.abilities.eclat.cooldown <= 0) {
    // Centre du groupe le plus dangereux.
    let cx = 0;
    let cy = 0;
    for (const e of danger) {
      cx += e.x;
      cy += e.y;
    }
    act(state, ctx, { c: 'ability', kind: 'eclat', x: cx / danger.length, y: cy / danger.length }, 'ability', 'eclat');
  }
  if (danger.length >= 3 && state.abilities.rafale.cooldown <= 0) {
    act(state, ctx, { c: 'ability', kind: 'rafale', x: 0, y: 0 }, 'ability', 'rafale');
  }
}

/**
 * Une décision du bot. À appeler régulièrement (toutes les ~0,25 s de jeu).
 * `record` reçoit les commandes réussies, horodatées, pour un rejeu déterministe.
 */
export function botTick(state: GameState, log: BotAction[] = [], record?: ReplayEntry[]): BotAction[] {
  const ctx: Ctx = { log, record };
  if (state.phase === 'choose') {
    const idx = FLOOR_PREF.map((k) => state.floorChoices.indexOf(k)).find((i) => i >= 0) ?? 0;
    act(state, ctx, { c: 'chooseFloor', index: idx }, 'chooseFloor', state.floorChoices[idx] ?? '');
    return log;
  }
  if (state.phase !== 'prep' && state.phase !== 'wave') return log;
  spend(state, ctx);
  if (state.phase === 'wave') useAbilities(state, ctx);
  if (state.phase === 'prep') act(state, ctx, { c: 'callWave' }, 'callWave', `${state.waveIndex}`);
  return log;
}
