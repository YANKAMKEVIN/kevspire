import { verifyReplay } from '../sim/replay';
import { runLevelWith, runLevelWithBot } from './run';
import { idleStrategy, lazyStrategy } from './strategies';

/**
 * Audit d'équilibrage d'un niveau, joué en headless :
 * - « impossible » : le bot complet perd sur toutes les graines ;
 * - « fragile »    : il gagne sur certaines graines seulement ;
 * - « trivial »    : un joueur passif ou paresseux gagne quand même ;
 * - « ok »         : le bot gagne partout et les stratégies faibles perdent.
 * Chaque victoire du bot est aussi rejouée pour vérifier le déterminisme.
 */
export type Verdict = 'ok' | 'impossible' | 'fragile' | 'trivial' | 'non-déterministe';

export interface LevelAudit {
  levelId: number;
  seeds: number[];
  botWins: number;
  /** Vies restantes minimales sur les victoires du bot (marge de sécurité). */
  minLives: number;
  maxLives: number;
  idleWon: boolean;
  lazyWon: boolean;
  replaysOk: boolean;
  verdict: Verdict;
}

/** Verdict à partir des résultats bruts (fonction pure, testée à part). */
export function classify(r: { botWins: number; runs: number; idleWon: boolean; lazyWon: boolean; replaysOk: boolean }): Verdict {
  if (!r.replaysOk) return 'non-déterministe';
  if (r.botWins === 0) return 'impossible';
  if (r.idleWon || r.lazyWon) return 'trivial';
  if (r.botWins < r.runs) return 'fragile';
  return 'ok';
}

export function auditLevel(levelId: number, seeds: readonly number[] = [1, 2, 3]): LevelAudit {
  let botWins = 0;
  let minLives = Number.POSITIVE_INFINITY;
  let maxLives = 0;
  let replaysOk = true;
  for (const seed of seeds) {
    const r = runLevelWithBot(levelId, seed);
    maxLives = r.maxLives;
    if (r.won) {
      botWins++;
      minLives = Math.min(minLives, r.lives);
    }
    if (seed === seeds[0] && !verifyReplay(r.replay)) replaysOk = false;
  }
  const idleWon = runLevelWith(idleStrategy, levelId, seeds[0] ?? 1).won;
  const lazyWon = seeds.some((s) => runLevelWith(lazyStrategy, levelId, s).won);
  const verdict = classify({ botWins, runs: seeds.length, idleWon, lazyWon, replaysOk });
  return {
    levelId, seeds: [...seeds], botWins, minLives: botWins > 0 ? minLives : 0, maxLives, idleWon, lazyWon, replaysOk, verdict,
  };
}
