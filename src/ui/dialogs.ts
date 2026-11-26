import type { EnemyKind, FloorKind } from '../core/types';
import { ENEMIES } from '../data/enemies';
import { FLOORS } from '../data/floors';
import type { GameState } from '../sim/state';
import { assetUrl, h } from './dom';
import { icon } from './icons';

const ENEMY_SPRITE: Partial<Record<EnemyKind, string>> = { mereBrume: 'mere_brume' };

function modal(testid: string, ...children: (HTMLElement | null)[]): HTMLElement {
  return h('div', { class: 'voile', 'data-testid': testid }, h('div', { class: 'panel modale' }, ...children));
}

export function pauseModal(onResume: () => void, onRestart: () => void, onQuit: () => void): HTMLElement {
  return modal('pause-modale',
    h('h3', {}, 'Pause'),
    h('p', {}, 'Les Brumâmes attendent… pas pour toujours.'),
    h('div', { class: 'pile' },
      h('button', { class: 'btn', 'data-testid': 'continuer', onClick: onResume }, icon('play'), 'Continuer'),
      h('button', { class: 'btn secondaire', onClick: onRestart }, 'Recommencer'),
      h('button', { class: 'btn secondaire', 'data-testid': 'quitter', onClick: onQuit }, 'Quitter (partie sauvegardée)'),
    ));
}

export interface ResultInfo {
  won: boolean;
  stars: number;
  eclats: number;
  newBest: boolean;
  endless: boolean;
  hasNext: boolean;
}

export function resultModal(state: GameState, info: ResultInfo, onNext: () => void, onRetry: () => void, onMenu: () => void): HTMLElement {
  const starsRow = h('div', { class: 'grosses-etoiles' });
  for (let i = 0; i < 3; i++) {
    const st = icon('star', i < info.stars ? 'ico on' : 'ico');
    st.style.animationDelay = `${0.25 + i * 0.25}s`;
    starsRow.append(st);
  }
  const title = info.endless ? `Vague ${state.waveIndex}` : info.won ? 'Victoire !' : 'Le Cœur s’éteint…';
  const text = info.endless
    ? info.newBest ? 'Nouveau record d’ascension !' : 'La tour a tenu bon jusqu’ici.'
    : info.won ? 'L’aube se lève sur la Flèche. Les Brumâmes reculent.' : 'Réorganise tes balcons et retente ta chance.';
  return modal(info.won ? 'victoire' : 'defaite',
    h('h3', {}, title),
    !info.endless && info.won ? starsRow : null,
    h('p', {}, text),
    h('div', { class: 'bilan' },
      h('div', {}, 'Brumâmes dissipées', h('b', {}, String(state.stats.kills))),
      h('div', {}, 'Vies du Cœur', h('b', {}, `${state.lives}/${state.maxLives}`)),
      h('div', {}, 'Or gagné', h('b', {}, String(state.stats.goldEarned))),
      h('div', {}, 'Éclats gagnés', h('b', {}, `+${info.eclats}`)),
    ),
    h('div', { class: 'pile' },
      info.won && info.hasNext ? h('button', { class: 'btn', 'data-testid': 'suivant', onClick: onNext }, icon('play'), 'Niveau suivant') : null,
      h('button', { class: info.won && info.hasNext ? 'btn secondaire' : 'btn', 'data-testid': 'rejouer', onClick: onRetry }, 'Rejouer'),
      h('button', { class: 'btn secondaire', 'data-testid': 'menu', onClick: onMenu }, 'Carte des niveaux'),
    ));
}

const FLOOR_ART: Record<FloorKind, string> = { rempart: 'etage_a', atelier: 'etage_c', belvedere: 'etage_a', comptoir: 'etage_b', sanctuaire: 'etage_b' };

export function floorChoiceModal(choices: FloorKind[], onPick: (i: number) => void): HTMLElement {
  return modal('choix-etage',
    h('h3', {}, 'La tour grandit'),
    h('p', {}, 'Choisis le nouvel étage. Ses deux balcons accueilleront des tourelles.'),
    h('div', { class: 'cartes-etage' },
      ...choices.map((kind, i) =>
        h('button', { class: 'carte-etage', 'data-testid': `etage-${i}`, onClick: () => onPick(i) },
          h('img', { src: assetUrl(FLOOR_ART[kind]), alt: '' }),
          h('div', {}, h('div', { class: 'nom' }, FLOORS[kind].name), h('div', { class: 'eff' }, FLOORS[kind].effect)),
        )),
    ));
}

export function lumiDialogue(text: string, onDone: () => void): HTMLElement {
  const el = h('div', { class: 'dialogue', 'data-testid': 'dialogue' },
    h('img', { src: assetUrl('gardienne'), alt: 'Lumi' }),
    h('div', { class: 'panel bulle' }, h('div', { class: 'qui' }, 'Lumi'), text, h('span', { class: 'suite' }, 'Touche pour continuer')),
  );
  el.addEventListener('click', (e) => {
    e.stopPropagation();
    onDone();
  });
  return el;
}

export function newEnemyModal(kind: EnemyKind, onDone: () => void): HTMLElement {
  const def = ENEMIES[kind];
  return h('div', { class: 'nouvelle' }, modal('nouvelle-brumame',
    h('div', { class: 'surtitre' }, def.boss ? 'Boss' : 'Nouvelle Brumâme'),
    h('img', { src: assetUrl(ENEMY_SPRITE[kind] ?? kind), alt: '' }),
    h('h3', {}, def.name),
    h('p', {}, def.lore),
    h('button', { class: 'btn', 'data-testid': 'compris', onClick: onDone }, 'Compris !'),
  ));
}

export function banner(title: string, sub: string): HTMLElement {
  document.querySelectorAll('.bandeau').forEach((b) => b.remove());
  const el = h('div', { class: 'bandeau' }, h('span', {}, sub), h('b', {}, title));
  setTimeout(() => el.remove(), 2300);
  return el;
}
