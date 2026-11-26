import { describe, expect, it } from 'vitest';
import { botTick } from '../../src/bot/bot';
import { createGame } from '../../src/sim/create';
import type { GameState } from '../../src/sim/state';
import { advance } from '../../src/sim/step';

function play(s: GameState, seconds: number): void {
  for (let t = 0; t < seconds; t += 0.25) {
    botTick(s);
    advance(s, 0.25);
  }
}

const fingerprint = (s: GameState) => JSON.stringify({ g: s.gold, l: s.lives, w: s.waveIndex, k: s.stats.kills, e: s.enemies.map((e) => [Math.round(e.x), Math.round(e.y), Math.round(e.hp)]) });

describe('déterminisme', () => {
  it('même graine, même partie', () => {
    const a = createGame(4, 77);
    const b = createGame(4, 77);
    play(a, 90);
    play(b, 90);
    expect(fingerprint(a)).toBe(fingerprint(b));
  });
  it('une partie sérialisée en JSON reprend à l’identique', () => {
    const a = createGame(4, 5);
    play(a, 40);
    const b = JSON.parse(JSON.stringify(a)) as GameState;
    play(a, 60);
    play(b, 60);
    expect(fingerprint(b)).toBe(fingerprint(a));
  });
  it('des graines différentes donnent des parties différentes', () => {
    const a = createGame(4, 1);
    const b = createGame(4, 2);
    play(a, 60);
    play(b, 60);
    expect(fingerprint(a)).not.toBe(fingerprint(b));
  });
});
