import type { BiomeId } from '../core/types';
import type { ImageId } from './assets';
import type { ColorId } from './particles';

export interface BiomeStyle {
  sky: ImageId;
  /** Couleur des nuages bas (mer de nuages). */
  cloud: string;
  /** Teinte de l'air (dégradé ajouté au-dessus du décor). */
  haze: string;
  firefly: ColorId;
  stars: boolean;
  lightning: boolean;
  /** Assombrissement global de la tour la nuit. */
  towerShade: number;
}

export const BIOMES: Readonly<Record<BiomeId, BiomeStyle>> = {
  crepuscule: { sky: 'ciel_crepuscule', cloud: '255,214,196', haze: '255,140,110', firefly: 'gold', stars: false, lightning: false, towerShade: 0 },
  nuit: { sky: 'ciel_nuit', cloud: '150,150,210', haze: '70,70,150', firefly: 'cyan', stars: true, lightning: false, towerShade: 0.18 },
  orage: { sky: 'ciel_orage', cloud: '170,120,200', haze: '120,60,160', firefly: 'magenta', stars: true, lightning: true, towerShade: 0.22 },
};
