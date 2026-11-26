// Pipeline d'images : PNG bruts générés (Codex) -> WebP optimisés dans public/assets.
// Usage : node tools/assets.mjs <dossier_des_png_bruts>
import sharp from 'sharp';
import { mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const SRC = process.argv[2];
if (!SRC || !existsSync(SRC)) {
  console.error('Usage : node tools/assets.mjs <dossier>');
  process.exit(1);
}
const OUT = 'public/assets';
mkdirSync(OUT, { recursive: true });

/** id -> [largeur max, hauteur max, rogner la transparence ?] */
const SPEC = {
  fond_titre: [900, 1600, false],
  ciel_crepuscule: [900, 1600, false],
  ciel_nuit: [900, 1600, false],
  ciel_orage: [900, 1350, false],
  ile_base: [1100, 400, true],
  etage_a: [420, 420, true],
  etage_b: [420, 420, true],
  etage_c: [420, 420, true],
  sommet: [420, 420, true],
  coeur: [256, 256, true],
  baliste: [240, 240, true],
  phare: [240, 240, true],
  mortier: [240, 240, true],
  cloche: [240, 240, true],
  bobine: [240, 240, true],
  grignot: [200, 200, true],
  papillombre: [220, 220, true],
  carapace: [240, 240, true],
  fouisseur: [220, 220, true],
  moucheron: [128, 128, true],
  planeur: [240, 240, true],
  mere_brume: [440, 440, true],
  gardienne: [520, 520, true],
};

for (const [id, [w, h, trim]] of Object.entries(SPEC)) {
  const input = join(SRC, `${id}.png`);
  if (!existsSync(input)) {
    console.warn(`manquant : ${id}`);
    continue;
  }
  let img = sharp(input);
  if (trim) img = sharp(await img.trim({ threshold: 8 }).toBuffer());
  const out = join(OUT, `${id}.webp`);
  const info = await img.resize({ width: w, height: h, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: trim ? 90 : 84, alphaQuality: 95, effort: 6 })
    .toFile(out);
  console.log(`${id.padEnd(16)} ${info.width}x${info.height} ${(info.size / 1024).toFixed(0)} Ko`);
}
