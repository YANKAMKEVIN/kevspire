import type { DamageType, EnemyKind } from '../core/types';

export type Movement = 'climber' | 'flier' | 'burrower';

export interface EnemyDef {
  kind: EnemyKind;
  name: string;
  lore: string;
  movement: Movement;
  hp: number;
  /** Vitesse en unités/s (marche, escalade ou vol). */
  speed: number;
  /** Vies du Cœur retirées s'il l'atteint. */
  leak: number;
  bounty: number;
  /** Multiplicateur de dégâts reçus par type (1 = normal). */
  resist: Partial<Record<DamageType, number>>;
  /** Rayon de collision / taille visuelle de base. */
  size: number;
  /** Rafale et gel moins efficaces sur les boss. */
  boss?: boolean;
  /** Ennemi apparu pour la première fois au niveau (fiche du bestiaire). */
  introLevel: number;
}

export const ENEMIES: Readonly<Record<EnemyKind, EnemyDef>> = {
  grignot: {
    kind: 'grignot',
    name: 'Grignot',
    lore: 'Une goutte d’encre affamée qui escalade tout ce qui brille.',
    movement: 'climber',
    hp: 46,
    speed: 46,
    leak: 1,
    bounty: 6,
    resist: {},
    size: 22,
    introLevel: 1,
  },
  papillombre: {
    kind: 'papillombre',
    name: 'Papillombre',
    lore: 'Elle vole droit vers la lumière du Cœur, sans détour.',
    movement: 'flier',
    hp: 30,
    speed: 56,
    leak: 1,
    bounty: 7,
    resist: { givre: 0.8 },
    size: 26,
    introLevel: 2,
  },
  carapace: {
    kind: 'carapace',
    name: 'Carapace',
    lore: 'Ses plaques d’ardoise arrêtent les carreaux. La lumière, non.',
    movement: 'climber',
    hp: 190,
    speed: 26,
    leak: 2,
    bounty: 16,
    resist: { phys: 0.5, lumiere: 1.25 },
    size: 32,
    introLevel: 3,
  },
  fouisseur: {
    kind: 'fouisseur',
    name: 'Fouisseur',
    lore: 'Il creuse sous l’île et surgit à mi-hauteur de la tour.',
    movement: 'burrower',
    hp: 120,
    speed: 40,
    leak: 1,
    bounty: 12,
    resist: { foudre: 0.75 },
    size: 26,
    introLevel: 4,
  },
  moucheron: {
    kind: 'moucheron',
    name: 'Moucheron d’essaim',
    lore: 'Seul, il ne pèse rien. Ils ne viennent jamais seuls.',
    movement: 'flier',
    hp: 15,
    speed: 82,
    leak: 1,
    bounty: 2,
    resist: { foudre: 1.4 },
    size: 14,
    introLevel: 5,
  },
  planeur: {
    kind: 'planeur',
    name: 'Planeur spectral',
    lore: 'Il frôle les tourelles et les endort quelques instants.',
    movement: 'flier',
    hp: 110,
    speed: 48,
    leak: 1,
    bounty: 13,
    resist: { phys: 0.8, lumiere: 1.2 },
    size: 32,
    introLevel: 6,
  },
  mereBrume: {
    kind: 'mereBrume',
    name: 'La Mère-Brume',
    lore: 'Elle porte en elle une nuée entière, et la relâche en grimpant.',
    movement: 'climber',
    hp: 2600,
    speed: 14,
    leak: 10,
    bounty: 150,
    resist: { givre: 0.6, phys: 0.85 },
    size: 64,
    boss: true,
    introLevel: 3,
  },
};

export const ENEMY_ORDER: readonly EnemyKind[] = [
  'grignot', 'papillombre', 'carapace', 'fouisseur', 'moucheron', 'planeur', 'mereBrume',
];
