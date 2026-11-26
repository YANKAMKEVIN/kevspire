import type { Modifiers } from '../sim/state';

export type UpgradeId = 'fonds' | 'charpente' | 'lentilles' | 'cristal' | 'braises' | 'vents';

export interface UpgradeDef {
  id: UpgradeId;
  name: string;
  /** Description d'un rang. */
  perRank: string;
  /** Coût en éclats de chaque rang. */
  costs: readonly number[];
}

export const UPGRADES: readonly UpgradeDef[] = [
  { id: 'fonds', name: 'Bourse des brises', perRank: '+30 pièces au départ', costs: [1, 2, 3] },
  { id: 'charpente', name: 'Charpente légère', perRank: 'Tourelles 5 % moins chères', costs: [2, 3, 4] },
  { id: 'lentilles', name: 'Lentilles polies', perRank: '+5 % de portée', costs: [2, 3, 4] },
  { id: 'cristal', name: 'Cristal renforcé', perRank: '+2 vies pour le Cœur', costs: [1, 2, 3] },
  { id: 'braises', name: 'Braises vives', perRank: '+6 % de dégâts', costs: [2, 3, 5] },
  { id: 'vents', name: 'Vents complices', perRank: 'Pouvoirs rechargés 10 % plus vite', costs: [1, 2, 4] },
];

export type UpgradeRanks = Record<UpgradeId, number>;

export const NO_UPGRADES: UpgradeRanks = { fonds: 0, charpente: 0, lentilles: 0, cristal: 0, braises: 0, vents: 0 };

export function modifiersFrom(r: UpgradeRanks): Modifiers {
  return {
    startGold: 30 * r.fonds,
    costMul: 1 - 0.05 * r.charpente,
    rangeMul: 1 + 0.05 * r.lentilles,
    extraLives: 2 * r.cristal,
    damageMul: 1 + 0.06 * r.braises,
    cooldownMul: 1 - 0.1 * r.vents,
  };
}

export function nextRankCost(def: UpgradeDef, rank: number): number | null {
  return def.costs[rank] ?? null;
}

export function spentEclats(r: UpgradeRanks): number {
  let total = 0;
  for (const def of UPGRADES) for (let i = 0; i < r[def.id]; i++) total += def.costs[i] ?? 0;
  return total;
}
