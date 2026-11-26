import { runLevelWithBot } from '../src/bot/run';
import { ENDLESS_ID, LEVELS } from '../src/data/levels';

const only = process.argv[2] ? Number(process.argv[2]) : null;
for (const l of LEVELS) {
  if (only && l.id !== only) continue;
  const rs = [1, 2, 3].map((s) => runLevelWithBot(l.id, s));
  console.log(`N${l.id} ${l.name.padEnd(20)} ` + rs.map((r) => `${r.won ? 'GAGNÉ' : 'perdu'} ${r.lives}/${r.maxLives} v${r.waves} t${Math.round(r.time)}`).join(' | '));
}
if (!only) {
  const e = runLevelWithBot(ENDLESS_ID, 1, undefined, 1500);
  console.log('Infini : vague', e.waves, 'temps', Math.round(e.time));
}
