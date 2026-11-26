import type { DamageType, TowerKind } from '../core/types';

export interface TowerLevelStats {
  /** Coût pour atteindre ce niveau (construction pour le niveau 1). */
  cost: number;
  damage: number;
  range: number;
  /** Tirs (ou impulsions) par seconde. Pour le Phare : 0 = rayon continu. */
  rate: number;
  /** Rayon d'explosion, de gel, ou portée de rebond selon la tourelle. */
  radius: number;
  /** Nombre de cibles (rebonds de la Bobine, perforation de la Baliste). */
  targets: number;
  /** Ralentissement (0..1) appliqué par la Cloche. */
  slow: number;
}

export interface TowerDef {
  kind: TowerKind;
  name: string;
  tagline: string;
  damageType: DamageType;
  hitsAir: boolean;
  hitsGround: boolean;
  /** Portée minimale (le mortier ne tire pas à bout portant). */
  minRange: number;
  /** Vitesse du projectile en unités/s (0 = instantané). */
  projectileSpeed: number;
  levels: readonly [TowerLevelStats, TowerLevelStats, TowerLevelStats];
  /** Niveau de campagne à partir duquel la tourelle est disponible (1 = dès le début). */
  unlockLevel: number;
}

const lvl = (s: Partial<TowerLevelStats> & Pick<TowerLevelStats, 'cost' | 'damage' | 'range' | 'rate'>): TowerLevelStats => ({
  radius: 0,
  targets: 1,
  slow: 0,
  ...s,
});

export const TOWERS: Readonly<Record<TowerKind, TowerDef>> = {
  baliste: {
    kind: 'baliste',
    name: 'Baliste',
    tagline: 'Tir rapide, touche tout ce qui vole.',
    damageType: 'phys',
    hitsAir: true,
    hitsGround: true,
    minRange: 0,
    projectileSpeed: 950,
    unlockLevel: 1,
    levels: [
      lvl({ cost: 60, damage: 13, range: 215, rate: 1.4 }),
      lvl({ cost: 70, damage: 22, range: 235, rate: 1.65 }),
      lvl({ cost: 120, damage: 34, range: 260, rate: 2.0, targets: 2 }),
    ],
  },
  cloche: {
    kind: 'cloche',
    name: 'Cloche de givre',
    tagline: 'Ralentit tout autour d’elle.',
    damageType: 'givre',
    hitsAir: true,
    hitsGround: true,
    minRange: 0,
    projectileSpeed: 0,
    unlockLevel: 1,
    levels: [
      lvl({ cost: 70, damage: 4, range: 125, rate: 0.7, radius: 125, slow: 0.35 }),
      lvl({ cost: 70, damage: 8, range: 140, rate: 0.75, radius: 140, slow: 0.45 }),
      lvl({ cost: 110, damage: 13, range: 155, rate: 0.8, radius: 155, slow: 0.55 }),
    ],
  },
  mortier: {
    kind: 'mortier',
    name: 'Mortier à braises',
    tagline: 'Gros dégâts de zone sur les grimpeurs.',
    damageType: 'phys',
    hitsAir: false,
    hitsGround: true,
    minRange: 40,
    projectileSpeed: 420,
    unlockLevel: 2,
    levels: [
      lvl({ cost: 100, damage: 30, range: 265, rate: 0.55, radius: 58 }),
      lvl({ cost: 95, damage: 50, range: 285, rate: 0.6, radius: 64 }),
      lvl({ cost: 150, damage: 82, range: 305, rate: 0.65, radius: 72 }),
    ],
  },
  phare: {
    kind: 'phare',
    name: 'Phare',
    tagline: 'Rayon qui brûle et perce les armures.',
    damageType: 'lumiere',
    hitsAir: true,
    hitsGround: true,
    minRange: 0,
    projectileSpeed: 0,
    unlockLevel: 3,
    levels: [
      lvl({ cost: 90, damage: 20, range: 170, rate: 0 }),
      lvl({ cost: 90, damage: 34, range: 185, rate: 0 }),
      lvl({ cost: 140, damage: 55, range: 200, rate: 0 }),
    ],
  },
  bobine: {
    kind: 'bobine',
    name: 'Bobine d’orage',
    tagline: 'Éclair qui rebondit de cible en cible.',
    damageType: 'foudre',
    hitsAir: true,
    hitsGround: true,
    minRange: 0,
    projectileSpeed: 0,
    unlockLevel: 5,
    levels: [
      lvl({ cost: 120, damage: 24, range: 180, rate: 0.8, radius: 95, targets: 3 }),
      lvl({ cost: 110, damage: 38, range: 195, rate: 0.9, radius: 100, targets: 4 }),
      lvl({ cost: 170, damage: 60, range: 210, rate: 1.0, radius: 110, targets: 5 }),
    ],
  },
};

export const TOWER_ORDER: readonly TowerKind[] = ['baliste', 'cloche', 'mortier', 'phare', 'bobine'];

/** Multiplicateur du rayon du Phare quand il reste concentré sur la même cible. */
export const PHARE_FOCUS_MAX = 1.6;
export const PHARE_FOCUS_TIME = 2.2;
/** Part du coût total récupérée à la revente. */
export const SELL_REFUND = 0.7;

export function totalInvested(kind: TowerKind, level: number): number {
  const def = TOWERS[kind];
  let sum = 0;
  for (let i = 0; i < level; i++) sum += def.levels[i]?.cost ?? 0;
  return sum;
}
