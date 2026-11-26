import type { FloorKind } from '../core/types';

export interface FloorDef {
  kind: FloorKind;
  name: string;
  effect: string;
  /** Sprite d'étage utilisé (a, b ou c). */
  art: 'a' | 'b' | 'c';
  /** Bonus de cadence des tourelles de l'étage. */
  rateBonus: number;
  /** Bonus de portée des tourelles de l'étage. */
  rangeBonus: number;
  /** Ralentissement des grimpeurs le long du mur de l'étage. */
  wallSlow: number;
  /** Or gagné à chaque fin de vague. */
  goldPerWave: number;
  /** Vies du Cœur rendues à chaque fin de vague (dans la limite du maximum). */
  healPerWave: number;
}

const base = { rateBonus: 0, rangeBonus: 0, wallSlow: 0, goldPerWave: 0, healPerWave: 0 };

export const FLOORS: Readonly<Record<FloorKind, FloorDef>> = {
  rempart: { ...base, kind: 'rempart', name: 'Rempart de ronces', effect: 'Les grimpeurs avancent 35 % moins vite sur ce mur.', art: 'a', wallSlow: 0.35 },
  atelier: { ...base, kind: 'atelier', name: 'Atelier à vapeur', effect: 'Les tourelles de cet étage tirent 25 % plus vite.', art: 'c', rateBonus: 0.25 },
  belvedere: { ...base, kind: 'belvedere', name: 'Belvédère', effect: 'Les tourelles de cet étage portent 18 % plus loin.', art: 'a', rangeBonus: 0.18 },
  comptoir: { ...base, kind: 'comptoir', name: 'Comptoir des brises', effect: '+20 pièces à la fin de chaque vague.', art: 'b', goldPerWave: 20 },
  sanctuaire: { ...base, kind: 'sanctuaire', name: 'Sanctuaire', effect: 'Rend 1 vie au Cœur à la fin de chaque vague.', art: 'b', healPerWave: 1 },
};

export const FLOOR_ORDER: readonly FloorKind[] = ['rempart', 'atelier', 'belvedere', 'comptoir', 'sanctuaire'];
