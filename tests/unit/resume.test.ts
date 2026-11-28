import { describe, expect, it } from 'vitest';
import { botTick } from '../../src/bot/bot';
import { ENDLESS_ID } from '../../src/data/levels';
import { defaultSave, loadSave, memoryStore, writeSave } from '../../src/save/save';
import { createGame } from '../../src/sim/create';
import type { GameState } from '../../src/sim/state';
import { advance } from '../../src/sim/step';

function play(s: GameState, seconds: number): void {
  for (let t = 0; t < seconds; t += 0.25) {
    botTick(s);
    advance(s, 0.25);
  }
}

/**
 * Bug corrigé : en JSON, Infinity devient null. Une Ascension infinie reprise depuis la
 * sauvegarde avait totalWaves = null et se terminait par une « victoire » à la vague suivante.
 */
describe('reprise d’une partie sauvegardée', () => {
  it('une Ascension infinie reprise ne se termine jamais par une victoire', () => {
    const s = createGame(ENDLESS_ID, 3);
    play(s, 30);
    const resumed = JSON.parse(JSON.stringify(s)) as GameState;
    play(resumed, 200);
    expect(resumed.phase).not.toBe('won');
    expect(resumed.waveIndex).toBeGreaterThan(s.waveIndex);
  });
  it('après un passage par la sauvegarde, l’Ascension garde un nombre de vagues infini', () => {
    const store = memoryStore();
    const d = defaultSave();
    const s = createGame(ENDLESS_ID, 3);
    play(s, 30);
    d.run = s;
    writeSave(store, d);
    const back = loadSave(store).data.run!;
    expect(back.totalWaves).toBe(Number.POSITIVE_INFINITY);
    play(back, 200);
    expect(back.phase).not.toBe('won');
  });
});
