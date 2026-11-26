import type { BiomeId, EnemyKind, SpawnSide } from '../core/types';

export interface SpawnGroup {
  enemy: EnemyKind;
  count: number;
  /** Secondes entre deux apparitions du groupe. */
  interval: number;
  /** Délai avant la première apparition, depuis le début de la vague. */
  delay: number;
  side: SpawnSide;
}

export interface WaveDef {
  groups: SpawnGroup[];
}

export interface LevelDef {
  id: number;
  name: string;
  biome: BiomeId;
  /** Réplique de Lumi au lancement du niveau. */
  intro: string;
  startFloors: number;
  maxFloors: number;
  startGold: number;
  lives: number;
  /** Multiplicateur global des PV ennemis. */
  hpScale: number;
  /** La tour gagne un étage toutes les `growEvery` vagues. */
  growEvery: number;
  waves: WaveDef[];
}

const g = (enemy: EnemyKind, count: number, interval: number, delay = 0, side: SpawnSide = 'both'): SpawnGroup => ({
  enemy, count, interval, delay, side,
});
const w = (...groups: SpawnGroup[]): WaveDef => ({ groups });

export const LEVELS: readonly LevelDef[] = [
  {
    id: 1, name: 'Premières lueurs', biome: 'crepuscule', startFloors: 2, maxFloors: 5, startGold: 170, lives: 20, hpScale: 0.85, growEvery: 1,
    intro: 'Les Grignots arrivent par les deux côtés de l’île. Pose une Baliste sur un balcon : touche un emplacement !',
    waves: [
      w(g('grignot', 5, 1.8, 0, 'L')),
      w(g('grignot', 6, 1.5, 0, 'R')),
      w(g('grignot', 9, 1.2)),
      w(g('grignot', 8, 1.0, 0, 'L'), g('grignot', 6, 1.2, 4, 'R')),
      w(g('grignot', 16, 0.8)),
      w(g('grignot', 12, 0.7, 0, 'L'), g('grignot', 12, 0.7, 0, 'R')),
    ],
  },
  {
    id: 2, name: 'Ailes de nuit', biome: 'crepuscule', startFloors: 2, maxFloors: 6, startGold: 190, lives: 20, hpScale: 0.95, growEvery: 1,
    intro: 'Des Papillombres ! Elles volent droit vers le Cœur. Le Mortier ne peut pas les toucher, la Baliste si.',
    waves: [
      w(g('grignot', 8, 1.2)),
      w(g('papillombre', 5, 1.6, 0, 'sky')),
      w(g('grignot', 10, 1.0), g('papillombre', 4, 2.0, 5, 'sky')),
      w(g('papillombre', 9, 1.0, 0, 'sky')),
      w(g('grignot', 14, 0.8), g('papillombre', 6, 1.4, 3, 'sky')),
      w(g('grignot', 10, 0.6, 0, 'L'), g('papillombre', 10, 0.9, 2, 'sky')),
      w(g('grignot', 20, 0.55), g('papillombre', 12, 0.8, 4, 'sky')),
    ],
  },
  {
    id: 3, name: 'Plaques d’ardoise', biome: 'crepuscule', startFloors: 2, maxFloors: 6, startGold: 230, lives: 20, hpScale: 1, growEvery: 1,
    intro: 'Les Carapaces résistent aux carreaux. Le Phare, lui, perce leur armure. Et méfie-toi de ce qui gronde au loin…',
    waves: [
      w(g('grignot', 10, 1.0), g('carapace', 2, 4, 6, 'L')),
      w(g('carapace', 4, 3.0), g('papillombre', 5, 1.4, 4, 'sky')),
      w(g('grignot', 16, 0.7), g('carapace', 3, 3, 8)),
      w(g('papillombre', 12, 0.8, 0, 'sky'), g('carapace', 4, 2.5, 3)),
      w(g('grignot', 20, 0.5), g('carapace', 5, 2.2, 4)),
      w(g('carapace', 7, 1.8), g('papillombre', 10, 0.8, 2, 'sky')),
      w(g('mereBrume', 1, 1, 0, 'L'), g('grignot', 12, 1.0, 6)),
    ],
  },
  {
    id: 4, name: 'Sous la surface', biome: 'nuit', startFloors: 3, maxFloors: 7, startGold: 260, lives: 20, hpScale: 1.15, growEvery: 1,
    intro: 'La nuit tombe. Les Fouisseurs creusent sous l’île et surgissent au milieu du mur. Couvre tous les étages !',
    waves: [
      w(g('fouisseur', 4, 2.5, 0, 'under'), g('grignot', 10, 1.0, 2)),
      w(g('papillombre', 10, 0.9, 0, 'sky'), g('fouisseur', 4, 2.0, 4, 'under')),
      w(g('carapace', 5, 2.4), g('fouisseur', 6, 1.6, 3, 'under')),
      w(g('grignot', 24, 0.45), g('papillombre', 8, 1.0, 5, 'sky')),
      w(g('fouisseur', 10, 1.2, 0, 'under'), g('carapace', 4, 2.5, 4)),
      w(g('grignot', 16, 0.5), g('papillombre', 14, 0.6, 2, 'sky'), g('fouisseur', 6, 1.5, 6, 'under')),
      w(g('carapace', 10, 1.4), g('fouisseur', 10, 1.0, 3, 'under')),
    ],
  },
  {
    id: 5, name: 'L’essaim', biome: 'nuit', startFloors: 3, maxFloors: 7, startGold: 340, lives: 20, hpScale: 1.25, growEvery: 1,
    intro: 'Un essaim de Moucherons approche. La Bobine d’orage est prête : ses éclairs rebondissent d’un ennemi à l’autre.',
    waves: [
      w(g('moucheron', 10, 0.35, 0, 'sky')),
      w(g('grignot', 14, 0.7), g('moucheron', 11, 0.3, 4, 'sky')),
      w(g('carapace', 6, 2.0), g('moucheron', 14, 0.25, 3, 'sky')),
      w(g('fouisseur', 8, 1.2, 0, 'under'), g('papillombre', 12, 0.7, 2, 'sky')),
      w(g('moucheron', 25, 0.2, 0, 'sky'), g('grignot', 16, 0.6, 3)),
      w(g('carapace', 8, 1.5), g('moucheron', 21, 0.2, 2, 'sky'), g('fouisseur', 6, 1.4, 5, 'under')),
      w(g('papillombre', 16, 0.5, 0, 'sky'), g('moucheron', 28, 0.18, 4, 'sky'), g('grignot', 20, 0.5, 1)),
      w(g('carapace', 12, 1.1), g('moucheron', 28, 0.16, 3, 'sky'), g('fouisseur', 10, 1.0, 2, 'under')),
    ],
  },
  {
    id: 6, name: 'Les planeurs', biome: 'nuit', startFloors: 3, maxFloors: 8, startGold: 380, lives: 20, hpScale: 1.4, growEvery: 1,
    intro: 'Les Planeurs spectraux endorment les tourelles qu’ils frôlent. Abats-les vite, ou garde ta Rafale pour eux.',
    waves: [
      w(g('planeur', 4, 2.5, 0, 'sky'), g('grignot', 12, 0.8, 2)),
      w(g('carapace', 6, 2.0), g('planeur', 4, 2.4, 5, 'sky')),
      w(g('moucheron', 21, 0.2, 0, 'sky'), g('planeur', 5, 2.0, 3, 'sky')),
      w(g('fouisseur', 10, 1.0, 0, 'under'), g('papillombre', 14, 0.6, 2, 'sky')),
      w(g('planeur', 8, 1.4, 0, 'sky'), g('carapace', 8, 1.6, 2)),
      w(g('grignot', 30, 0.35), g('moucheron', 21, 0.2, 4, 'sky'), g('planeur', 5, 1.8, 6, 'sky')),
      w(g('carapace', 12, 1.0), g('fouisseur', 10, 1.0, 3, 'under'), g('planeur', 6, 1.6, 5, 'sky')),
      w(g('mereBrume', 1, 1, 0, 'R'), g('planeur', 6, 2.0, 8, 'sky'), g('moucheron', 21, 0.25, 12, 'sky')),
    ],
  },
  {
    id: 7, name: 'Tempête montante', biome: 'orage', startFloors: 3, maxFloors: 8, startGold: 430, lives: 20, hpScale: 1.55, growEvery: 1,
    intro: 'L’orage se lève et les Brumâmes sont enragées. Chaque étage compte, choisis-les bien.',
    waves: [
      w(g('grignot', 20, 0.5), g('papillombre', 12, 0.7, 2, 'sky')),
      w(g('carapace', 8, 1.5), g('fouisseur', 8, 1.2, 3, 'under')),
      w(g('moucheron', 28, 0.16, 0, 'sky'), g('planeur', 5, 1.8, 2, 'sky')),
      w(g('carapace', 10, 1.2), g('grignot', 24, 0.4, 2)),
      w(g('fouisseur', 14, 0.8, 0, 'under'), g('papillombre', 18, 0.5, 2, 'sky')),
      w(g('planeur', 10, 1.2, 0, 'sky'), g('moucheron', 28, 0.15, 3, 'sky')),
      w(g('carapace', 14, 0.9), g('fouisseur', 12, 0.9, 2, 'under'), g('papillombre', 16, 0.5, 4, 'sky')),
      w(g('grignot', 40, 0.25), g('planeur', 8, 1.3, 4, 'sky'), g('carapace', 10, 1.0, 6)),
    ],
  },
  {
    id: 8, name: 'Le Grand Assaut', biome: 'orage', startFloors: 4, maxFloors: 9, startGold: 540, lives: 20, hpScale: 1.5, growEvery: 1,
    intro: 'Elles arrivent de partout à la fois. Tiens bon, Gardien : l’aube n’est plus très loin.',
    waves: [
      w(g('grignot', 24, 0.4), g('fouisseur', 8, 1.0, 2, 'under'), g('papillombre', 12, 0.6, 3, 'sky')),
      w(g('carapace', 12, 1.1), g('moucheron', 28, 0.15, 2, 'sky')),
      w(g('planeur', 10, 1.1, 0, 'sky'), g('fouisseur', 12, 0.8, 2, 'under')),
      w(g('mereBrume', 1, 1, 0, 'L'), g('carapace', 8, 1.4, 5)),
      w(g('grignot', 40, 0.22), g('papillombre', 24, 0.35, 2, 'sky')),
      w(g('carapace', 16, 0.8), g('planeur', 10, 1.1, 3, 'sky'), g('moucheron', 28, 0.14, 5, 'sky')),
      w(g('fouisseur', 20, 0.6, 0, 'under'), g('carapace', 12, 0.9, 2), g('papillombre', 20, 0.4, 4, 'sky')),
      w(g('mereBrume', 1, 1, 0, 'R'), g('planeur', 12, 1.0, 4, 'sky'), g('grignot', 30, 0.3, 6)),
    ],
  },
  {
    id: 9, name: 'L’Aube ou rien', biome: 'orage', startFloors: 4, maxFloors: 10, startGold: 620, lives: 20, hpScale: 1.85, growEvery: 1,
    intro: 'Deux Mères-Brumes veulent éteindre le Cœur avant l’aube. C’est la dernière nuit. Allume tout !',
    waves: [
      w(g('carapace', 12, 1.0), g('papillombre', 16, 0.5, 2, 'sky')),
      w(g('fouisseur', 16, 0.7, 0, 'under'), g('moucheron', 28, 0.15, 2, 'sky')),
      w(g('planeur', 12, 1.0, 0, 'sky'), g('grignot', 36, 0.25, 2)),
      w(g('carapace', 18, 0.7), g('fouisseur', 14, 0.7, 3, 'under')),
      w(g('mereBrume', 1, 1, 0, 'L'), g('moucheron', 35, 0.12, 4, 'sky')),
      w(g('grignot', 50, 0.18), g('planeur', 12, 0.9, 3, 'sky'), g('papillombre', 24, 0.35, 5, 'sky')),
      w(g('carapace', 20, 0.6), g('fouisseur', 20, 0.6, 2, 'under'), g('moucheron', 28, 0.14, 4, 'sky')),
      w(g('planeur', 16, 0.8, 0, 'sky'), g('carapace', 16, 0.7, 2), g('papillombre', 24, 0.35, 4, 'sky')),
      w(g('mereBrume', 1, 1, 0, 'L'), g('mereBrume', 1, 1, 6, 'R'), g('grignot', 40, 0.3, 3), g('planeur', 10, 1.2, 8, 'sky')),
    ],
  },
];

export function getLevel(id: number): LevelDef {
  const level = LEVELS.find((l) => l.id === id);
  if (!level) throw new Error(`Niveau inconnu : ${id}`);
  return level;
}

/** Identifiant réservé au mode Ascension infinie. */
export const ENDLESS_ID = 100;
