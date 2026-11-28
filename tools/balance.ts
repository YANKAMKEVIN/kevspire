/**
 * Rapport d'équilibrage joué en headless par le bot (aussi lancé en CI).
 *   npm run balance            → rapport de tous les niveaux
 *   npm run balance -- 4       → un seul niveau
 *   npm run balance -- --check → code de sortie 1 si un niveau est impossible, fragile, trivial ou non déterministe
 */
import { auditLevel } from '../src/bot/balance';
import { runLevelWithBot } from '../src/bot/run';
import { ENDLESS_ID, LEVELS } from '../src/data/levels';

const args = process.argv.slice(2);
const check = args.includes('--check');
const onlyArg = args.find((a) => /^\d+$/.test(a));
const only = onlyArg ? Number(onlyArg) : null;
const seeds = [1, 2, 3, 4, 5];

let bad = 0;
for (const l of LEVELS) {
  if (only && l.id !== only) continue;
  const a = auditLevel(l.id, seeds);
  if (a.verdict !== 'ok') bad++;
  console.log(
    `N${l.id} ${l.name.padEnd(20)} ${a.verdict.toUpperCase().padEnd(10)} bot ${a.botWins}/${seeds.length}`
      + ` · marge ${a.minLives}/${a.maxLives} vies · passif ${a.idleWon ? 'GAGNE' : 'perd'} · paresseux ${a.lazyWon ? 'GAGNE' : 'perd'}`
      + ` · rejeu ${a.replaysOk ? 'ok' : 'DIVERGE'}`,
  );
}
if (!only) {
  const e = runLevelWithBot(ENDLESS_ID, 1, undefined, 1500);
  console.log(`Ascension infinie : palier ${e.waves} atteint en ${Math.round(e.time)} s`);
}
if (check && bad > 0) {
  console.error(`${bad} niveau(x) hors des clous.`);
  process.exit(1);
}
