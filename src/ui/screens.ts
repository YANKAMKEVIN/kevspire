import { ENEMIES, ENEMY_ORDER } from '../data/enemies';
import { ENDLESS_ID, LEVELS } from '../data/levels';
import { availableEclats, isLevelUnlocked, totalStars, MAX_STARS } from '../meta/progression';
import { UPGRADES, nextRankCost } from '../meta/upgrades';
import type { AppApi } from './api';
import { assetUrl, clear, h } from './dom';
import { icon } from './icons';

const BIOME_LABEL = { crepuscule: 'Crépuscule', nuit: 'Nuit', orage: 'Orage d’aube' } as const;
const ENEMY_SPRITE: Record<string, string> = { mereBrume: 'mere_brume' };

function stars(n: number, max = 3): HTMLElement {
  const box = h('span', { class: 'etoiles' });
  for (let i = 0; i < max; i++) box.append(icon('star', i < n ? 'ico on' : 'ico'));
  return box;
}

function header(api: AppApi, title: string, right?: HTMLElement): HTMLElement {
  return h('div', { class: 'entete' },
    h('button', { class: 'rond', 'aria-label': 'Retour', 'data-testid': 'retour', onClick: () => { api.audio.play('click'); api.go('title'); } }, icon('back')),
    h('h2', {}, title),
    right ?? null,
  );
}

export function renderTitle(root: HTMLElement, api: AppApi): void {
  clear(root);
  const flies = h('div', { class: 'lucioles' });
  for (let i = 0; i < 14; i++) {
    flies.append(h('i', { class: 'luciole', style: `left:${Math.random() * 100}%;bottom:${Math.random() * 40}%;animation-duration:${7 + Math.random() * 8}s;animation-delay:${-Math.random() * 10}s` }));
  }
  const run = api.save.run;
  root.append(
    h('div', { class: 'ecran', 'data-testid': 'ecran-titre' },
      h('div', { class: 'titre-fond', style: `background-image:url(${assetUrl('fond_titre')})` }),
      h('div', { class: 'titre-voile' }),
      flies,
      h('div', { class: 'logo' }, h('h1', {}, 'Kevspire'), h('div', { class: 'sous' }, 'La tour des lucioles')),
      h('div', { class: 'menu-titre' },
        run ? h('button', { class: 'btn corail', 'data-testid': 'reprendre', onClick: () => { api.audio.play('click'); api.resumeRun(); } }, icon('play'), `Reprendre · ${run.endless ? 'Ascension' : `Niveau ${run.levelId}`}`) : null,
        h('button', { class: 'btn', 'data-testid': 'jouer', onClick: () => { api.audio.play('click'); api.go('levels'); } }, icon('play'), 'Jouer'),
        h('div', { class: 'ligne' },
          h('button', { class: 'btn secondaire', 'data-testid': 'atelier', onClick: () => { api.audio.play('click'); api.go('atelier'); } }, icon('hammer'), 'Atelier'),
          h('button', { class: 'btn secondaire', 'data-testid': 'bestiaire', onClick: () => { api.audio.play('click'); api.go('bestiaire'); } }, icon('book'), 'Bestiaire'),
        ),
        h('div', { class: 'ligne' },
          h('button', { class: 'btn secondaire', 'data-testid': 'reglages', onClick: () => { api.audio.play('click'); api.go('settings'); } }, icon('gear'), 'Réglages'),
        ),
      ),
      h('div', { class: 'version' }, `v${__APP_VERSION__}`),
    ),
  );
}

export function renderLevels(root: HTMLElement, api: AppApi): void {
  clear(root);
  const save = api.save;
  const list = h('div', { class: 'carte' });
  for (const level of LEVELS) {
    const open = isLevelUnlocked(save, level.id);
    const rec = save.levels[String(level.id)];
    list.append(
      h('button', {
        class: `panel niveau${open ? '' : ' verrou'}`, 'data-testid': `niveau-${level.id}`, disabled: !open,
        onClick: () => { if (open) { api.audio.play('click'); api.startLevel(level.id); } },
      },
      h('span', { class: 'num' }, open ? String(level.id) : icon('lock')),
      h('span', { class: 'infos' }, h('div', { class: 'nom' }, level.name), h('div', { class: 'biome' }, `${BIOME_LABEL[level.biome]} · ${level.waves.length} vagues`)),
      stars(rec?.stars ?? 0)),
    );
  }
  const endlessOpen = isLevelUnlocked(save, ENDLESS_ID);
  list.append(
    h('button', {
      class: `panel niveau infini${endlessOpen ? '' : ' verrou'}`, 'data-testid': 'niveau-infini', disabled: !endlessOpen,
      onClick: () => { if (endlessOpen) { api.audio.play('click'); api.startLevel(ENDLESS_ID); } },
    },
    h('span', { class: 'num' }, icon(endlessOpen ? 'infinity' : 'lock')),
    h('span', { class: 'infos' }, h('div', { class: 'nom' }, 'Ascension infinie'),
      h('div', { class: 'biome' }, endlessOpen ? `Record : vague ${save.bestEndlessWave}` : 'Termine le niveau 3 pour l’ouvrir'))),
  );
  root.append(
    h('div', { class: 'ecran' },
      h('div', { class: 'fond-ecran', style: `background-image:url(${assetUrl('ciel_nuit')})` }),
      header(api, 'Niveaux', h('span', { class: 'compteur' }, icon('star'), `${totalStars(save)}/${MAX_STARS}`)),
      h('div', { class: 'defile' }, list),
    ),
  );
}

export function renderAtelier(root: HTMLElement, api: AppApi): void {
  clear(root);
  const save = api.save;
  const grid = h('div', { class: 'grille' });
  for (const def of UPGRADES) {
    const rank = save.upgrades[def.id];
    const cost = nextRankCost(def, rank);
    const can = cost !== null && availableEclats(save) >= cost;
    const ranks = h('div', { class: 'rangs' });
    for (let i = 0; i < def.costs.length; i++) ranks.append(h('i', { class: i < rank ? 'on' : '' }));
    grid.append(
      h('div', { class: 'panel carte-amel' },
        h('div', { class: 'txt' }, h('div', { class: 'nom' }, def.name), h('div', { class: 'eff' }, def.perRank), ranks),
        cost === null
          ? h('span', { class: 'tag or' }, 'Maximum')
          : h('button', {
            class: `btn${can ? '' : ' off'}`, 'data-testid': `amel-${def.id}`,
            onClick: () => {
              if (!can) return api.audio.play('deny');
              save.upgrades[def.id]++;
              api.audio.play('star');
              api.persist();
              renderAtelier(root, api);
            },
          }, icon('crystal'), String(cost)),
      ),
    );
  }
  root.append(
    h('div', { class: 'ecran' },
      h('div', { class: 'fond-ecran', style: `background-image:url(${assetUrl('ciel_crepuscule')})` }),
      header(api, 'Atelier', h('span', { class: 'compteur', 'data-testid': 'eclats' }, icon('crystal'), String(availableEclats(save)))),
      h('div', { class: 'defile' },
        h('p', { style: 'max-width:520px;margin:0 auto 12px;opacity:.85;font-size:14px;line-height:1.4' },
          'Chaque étoile gagnée te donne un éclat d’aube. Investis-les ici : les améliorations valent pour toutes les parties.'),
        grid),
    ),
  );
}

export function renderBestiaire(root: HTMLElement, api: AppApi): void {
  clear(root);
  const grid = h('div', { class: 'grille' });
  for (const kind of ENEMY_ORDER) {
    const def = ENEMIES[kind];
    const seen = api.save.seenEnemies.includes(kind);
    const resist = Object.entries(def.resist).map(([type, mul]) =>
      h('span', { class: `tag${(mul ?? 1) > 1 ? ' or' : ''}` }, `${(mul ?? 1) > 1 ? 'Sensible' : 'Résiste'} : ${type === 'phys' ? 'carreaux et obus' : type}`));
    grid.append(
      h('div', { class: `panel bete${seen ? '' : ' inconnue'}` },
        h('img', { src: assetUrl(ENEMY_SPRITE[kind] ?? kind), alt: '' }),
        h('div', {},
          h('div', { class: 'nom' }, seen ? def.name : '???'),
          h('div', { class: 'lore' }, seen ? def.lore : `Apparaît à partir du niveau ${def.introLevel}.`),
          seen ? h('div', { class: 'tags' }, h('span', { class: 'tag' }, def.movement === 'flier' ? 'Vole' : def.movement === 'burrower' ? 'Creuse' : 'Grimpe'), ...resist) : null,
        ),
      ),
    );
  }
  root.append(
    h('div', { class: 'ecran' },
      h('div', { class: 'fond-ecran', style: `background-image:url(${assetUrl('ciel_orage')})` }),
      header(api, 'Bestiaire'),
      h('div', { class: 'defile' }, grid),
    ),
  );
}

export function renderSettings(root: HTMLElement, api: AppApi): void {
  clear(root);
  const s = api.save.settings;
  const slider = (label: string, value: number, set: (v: number) => void) => {
    const input = h('input', { type: 'range', min: '0', max: '100', value: String(Math.round(value * 100)), 'aria-label': label });
    input.addEventListener('input', () => { set(Number(input.value) / 100); api.applySettings(); });
    input.addEventListener('change', () => api.persist());
    return h('div', { class: 'panel reglage' }, h('label', {}, label), input);
  };
  const qualities = [['auto', 'Auto'], ['haute', 'Haute'], ['eco', 'Éco']] as const;
  const qBox = h('div', { class: 'choix' });
  for (const [id, label] of qualities) {
    qBox.append(h('button', { class: s.quality === id ? 'on' : '', onClick: () => { s.quality = id; api.applySettings(); api.persist(); renderSettings(root, api); } }, label));
  }
  const haptic = h('div', { class: 'choix' },
    h('button', { class: s.haptics ? 'on' : '', onClick: () => { s.haptics = !s.haptics; api.persist(); renderSettings(root, api); } }, s.haptics ? 'Oui' : 'Non'));
  root.append(
    h('div', { class: 'ecran' },
      h('div', { class: 'fond-ecran', style: `background-image:url(${assetUrl('ciel_nuit')})` }),
      header(api, 'Réglages'),
      h('div', { class: 'defile' },
        h('div', { class: 'grille' },
          slider('Musique', s.music, (v) => { s.music = v; }),
          slider('Effets sonores', s.sfx, (v) => { s.sfx = v; }),
          h('div', { class: 'panel reglage' }, h('label', {}, 'Qualité graphique'), qBox),
          h('div', { class: 'panel reglage' }, h('label', {}, 'Vibrations'), haptic),
        ),
      ),
    ),
  );
}
