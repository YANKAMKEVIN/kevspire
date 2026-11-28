import { describe, expect, it } from 'vitest';
import { botTick } from '../../src/bot/bot';
import { runLevelWithBot } from '../../src/bot/run';
import { createGame } from '../../src/sim/create';
import { build, callWave, chooseFloor, sell, upgrade, useAbility } from '../../src/sim/commands';
import {
  ReplayDivergence, execute, finishRecording, playReplay, startRecording, stateHash, tickOf, verifyReplay,
} from '../../src/sim/replay';
import type { Command, Replay } from '../../src/sim/replay';
import type { GameState } from '../../src/sim/state';
import { advance } from '../../src/sim/step';

const roundTrip = (r: Replay): Replay => JSON.parse(JSON.stringify(r)) as Replay;

describe('rejeu déterministe', () => {
  it.each([1, 4, 6, 9])('le niveau %i joué par le bot se rejoue à l’identique', (id) => {
    const run = runLevelWithBot(id, 5);
    expect(run.won).toBe(true);
    expect(run.replay.entries.length).toBeGreaterThan(10);
    const final = playReplay(roundTrip(run.replay));
    expect(final.phase).toBe('won');
    expect(stateHash(final)).toBe(run.replay.endHash);
    expect(stateHash(final)).toBe(stateHash(run.state));
  });

  it('l’enregistrement survit à un aller-retour JSON et se vérifie', () => {
    const run = runLevelWithBot(2, 8);
    expect(verifyReplay(roundTrip(run.replay))).toBe(true);
  });

  it('un journal trafiqué est détecté (empreinte différente ou commande refusée)', () => {
    const run = runLevelWithBot(3, 2);
    const altered = roundTrip(run.replay);
    const i = altered.entries.findIndex((e) => e.cmd.c === 'build');
    const entry = altered.entries[i]!;
    altered.entries[i] = { ...entry, tick: entry.tick + 600 };
    expect(verifyReplay(altered)).toBe(false);
    const dropped = roundTrip(run.replay);
    dropped.entries.splice(0, 3);
    expect(verifyReplay(dropped)).toBe(false);
  });

  it('une commande impossible au rejeu lève une divergence explicite', () => {
    const s = createGame(1, 1);
    const rec = startRecording(s);
    rec.entries.push({ tick: 0, cmd: { c: 'upgrade', slot: 0 } });
    finishRecording(rec, s);
    expect(() => playReplay(rec)).toThrow(ReplayDivergence);
  });

  it('rejoue aussi une partie reprise en cours de route (départ = sauvegarde)', () => {
    const s = createGame(5, 12);
    for (let t = 0; t < 60; t += 0.25) {
      botTick(s);
      advance(s, 0.25);
    }
    const snapshot = JSON.parse(JSON.stringify(s)) as GameState;
    const rec = startRecording(snapshot);
    for (let t = 0; t < 90; t += 0.25) {
      botTick(snapshot, [], rec.entries);
      advance(snapshot, 0.25);
    }
    finishRecording(rec, snapshot);
    expect(rec.start.time).toBeGreaterThan(0);
    expect(verifyReplay(roundTrip(rec))).toBe(true);
  });

  it('execute équivaut aux appels directs pour chaque commande', () => {
    const cmds: Command[] = [
      { c: 'build', slot: 0, kind: 'baliste' },
      { c: 'upgrade', slot: 0 },
      { c: 'build', slot: 1, kind: 'baliste' },
      { c: 'sell', slot: 1 },
      { c: 'callWave' },
      { c: 'ability', kind: 'eclat', x: 270, y: 300 },
      { c: 'ability', kind: 'rafale', x: 0, y: 0 },
    ];
    const a = createGame(3, 4);
    const b = createGame(3, 4);
    a.gold = b.gold = 2000;
    for (const cmd of cmds) expect(execute(a, cmd).ok).toBe(true);
    build(b, 0, 'baliste');
    upgrade(b, 0);
    build(b, 1, 'baliste');
    sell(b, 1);
    callWave(b);
    useAbility(b, 'eclat', 270, 300);
    useAbility(b, 'rafale');
    expect(stateHash(a)).toBe(stateHash(b));
    expect(execute(a, { c: 'chooseFloor', index: 0 }).ok).toBe(chooseFloor(b, 0).ok);
  });

  it('tickOf compte les pas fixes', () => {
    const s = createGame(1, 1);
    expect(tickOf(s)).toBe(0);
    advance(s, 1);
    expect(tickOf(s)).toBe(60);
  });
});
