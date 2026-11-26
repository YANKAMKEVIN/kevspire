import type { AudioEngine } from '../audio/audio';
import type { SaveData } from '../save/schema';

export type ScreenId = 'title' | 'levels' | 'atelier' | 'bestiaire' | 'settings';

/** Ce que les écrans de menu peuvent demander à l'application. */
export interface AppApi {
  readonly save: SaveData;
  readonly audio: AudioEngine;
  go(screen: ScreenId): void;
  startLevel(id: number): void;
  resumeRun(): void;
  persist(): void;
  applySettings(): void;
}
