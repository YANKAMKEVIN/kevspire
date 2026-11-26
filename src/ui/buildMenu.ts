import type { TowerKind } from '../core/types';
import { FLOORS } from '../data/floors';
import { slotFromId } from '../data/geometry';
import { TOWERS, TOWER_ORDER } from '../data/towers';
import { buildCost, sellValue, upgradeCost } from '../sim/commands';
import type { GameState } from '../sim/state';
import { towerStats } from '../sim/towers';
import { assetUrl, h } from './dom';
import { icon } from './icons';

export interface BuildHandlers {
  build(slot: number, kind: TowerKind): void;
  upgrade(slot: number): void;
  sell(slot: number): void;
  preview(kind: TowerKind | null): void;
  close(): void;
}

const RADIUS = 92;

/** Menu radial autour d'un balcon vide : 5 tourelles en éventail, du côté libre de l'écran. */
export function buildRadial(state: GameState, slot: number, x: number, y: number, unlocked: (k: TowerKind) => boolean, hd: BuildHandlers, viewW: number): HTMLElement {
  const root = h('div', { class: 'radial', 'data-testid': 'menu-construction', style: `left:${x}px;top:${y}px` });
  const { floor } = slotFromId(slot);
  // L'éventail s'ouvre vers l'intérieur de l'écran (vers le haut pour les postes du sommet).
  const center = floor < 0 ? -Math.PI / 2 : x < viewW / 2 ? 0 : Math.PI;
  const spread = Math.PI * 0.95;
  const fiche = h('div', { class: 'panel fiche', style: 'display:none' });
  let armed: TowerKind | null = null;
  TOWER_ORDER.forEach((kind, i) => {
    const a = center - spread / 2 + (spread * i) / (TOWER_ORDER.length - 1);
    const bx = Math.max(-x + 40, Math.min(viewW - x - 40, Math.cos(a) * RADIUS));
    const by = Math.sin(a) * RADIUS;
    const def = TOWERS[kind];
    const open = unlocked(kind);
    const cost = buildCost(state, kind);
    const cheap = state.gold >= cost;
    const btn = h('button', {
      class: `choix-tour${open ? '' : ' verrou'}${open && !cheap ? ' cher' : ''}`, 'data-testid': `construire-${kind}`, 'aria-label': def.name,
      style: `left:${bx}px;top:${by}px;animation-delay:${i * 0.03}s`,
    },
    h('img', { src: assetUrl(kind), alt: '' }),
    open ? h('span', { class: 'prix' }, icon('coin'), String(cost)) : h('span', { class: 'prix' }, icon('lock'), `N${def.unlockLevel}`));
    btn.addEventListener('click', (ev) => {
      ev.stopPropagation();
      if (!open) return;
      // Premier appui : aperçu (portée + fiche). Second appui : construction.
      if (armed !== kind) {
        armed = kind;
        root.querySelectorAll('.choix-tour.on').forEach((el) => el.classList.remove('on'));
        btn.classList.add('on');
        hd.preview(kind);
        showTowerCard(fiche, state, kind, cost, cheap);
        return;
      }
      hd.build(slot, kind);
    });
    root.append(btn);
  });
  return h('div', { style: 'position:absolute;inset:0;pointer-events:none' }, root, fiche);
}

function showTowerCard(fiche: HTMLElement, state: GameState, kind: TowerKind, cost: number, cheap: boolean): void {
  const def = TOWERS[kind];
  const lv = def.levels[0];
  fiche.style.display = 'block';
  fiche.style.pointerEvents = 'none';
  fiche.replaceChildren(
    h('div', { class: 'tete' }, h('img', { src: assetUrl(kind), alt: '' }),
      h('div', {}, h('div', { class: 'nom' }, def.name), h('div', { class: 'desc' }, def.tagline))),
    h('div', { class: 'stats' },
      h('div', { class: 'stat' }, 'Dégâts', h('b', {}, String(lv.damage))),
      h('div', { class: 'stat' }, 'Portée', h('b', {}, String(Math.round(lv.range * state.modifiers.rangeMul)))),
      h('div', { class: 'stat' }, 'Cible', h('b', {}, def.hitsAir ? (def.hitsGround ? 'Tout' : 'Air') : 'Sol'))),
    h('div', { style: 'text-align:center;font-weight:800;font-size:14px;color:' + (cheap ? 'var(--or)' : 'var(--corail)') },
      cheap ? `Touche encore pour construire (${cost} or)` : `Il manque ${cost - Math.floor(state.gold)} or`),
  );
}

/** Fiche d'une tourelle existante : statistiques, amélioration et revente. */
export function towerPanel(state: GameState, slot: number, hd: BuildHandlers): HTMLElement {
  const tower = state.slots[slot];
  if (!tower) return h('div');
  const def = TOWERS[tower.kind];
  const s = towerStats(state, slot, tower);
  const next = def.levels[tower.level];
  const upCost = upgradeCost(state, tower);
  const floor = slotFromId(slot).floor;
  const floorKind = floor >= 0 ? state.floors[floor] : null;
  const delta = (a: number, b: number | undefined) => (b !== undefined && b > a ? h('span', { class: 'plus' }, ` +${Math.round(b - a)}`) : null);
  const rate = def.kind === 'phare' ? 'Rayon' : `${s.rate.toFixed(1)}/s`;
  return h('div', { class: 'panel fiche', 'data-testid': 'fiche-tourelle' },
    h('div', { class: 'tete' }, h('img', { src: assetUrl(tower.kind), alt: '' }),
      h('div', {},
        h('div', { class: 'nom' }, `${def.name} · niv. ${tower.level}`),
        h('div', { class: 'desc' }, floor < 0 ? 'Poste du sommet : protège le Cœur.' : floorKind ? `${FLOORS[floorKind].name} : ${FLOORS[floorKind].effect}` : def.tagline))),
    h('div', { class: 'stats' },
      h('div', { class: 'stat' }, 'Dégâts', h('b', {}, String(Math.round(s.damage)), delta(s.damage, next?.damage))),
      h('div', { class: 'stat' }, 'Portée', h('b', {}, String(Math.round(s.range)), delta(def.levels[tower.level - 1]?.range ?? 0, next?.range))),
      h('div', { class: 'stat' }, 'Cadence', h('b', {}, rate))),
    h('div', { class: 'actions' },
      h('button', { class: 'btn secondaire', 'data-testid': 'vendre', onClick: (e) => { e.stopPropagation(); hd.sell(slot); } }, icon('sell'), `+${sellValue(state, tower)}`),
      upCost === null
        ? h('button', { class: 'btn off' }, 'Niveau max')
        : h('button', { class: `btn${state.gold >= upCost ? '' : ' off'}`, 'data-testid': 'ameliorer', onClick: (e) => { e.stopPropagation(); hd.upgrade(slot); } }, icon('up'), `${upCost}`),
      h('button', { class: 'rond', 'aria-label': 'Fermer', style: 'flex:none', onClick: (e) => { e.stopPropagation(); hd.close(); } }, icon('close')),
    ),
  );
}
