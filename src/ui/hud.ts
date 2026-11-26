import { EARLY_CALL_GOLD_PER_SEC, EARLY_CALL_MAX } from '../sim/flow';
import type { GameState } from '../sim/state';
import { h, setText } from './dom';
import { icon } from './icons';

export interface HudHandlers {
  pause(): void;
  callWave(): void;
  toggleSpeed(): void;
  ability(kind: 'eclat' | 'rafale'): void;
}

const RING = 2 * Math.PI * 30;

function abilityButton(kind: 'eclat' | 'rafale', onClick: () => void): { el: HTMLButtonElement; ring: SVGCircleElement; rest: HTMLElement } {
  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('viewBox', '0 0 70 70');
  svg.setAttribute('class', 'anneau');
  const bg = document.createElementNS(svgNS, 'circle');
  bg.setAttribute('cx', '35'); bg.setAttribute('cy', '35'); bg.setAttribute('r', '30');
  bg.setAttribute('stroke', 'rgba(20,20,40,.7)');
  const ring = document.createElementNS(svgNS, 'circle');
  ring.setAttribute('cx', '35'); ring.setAttribute('cy', '35'); ring.setAttribute('r', '30');
  ring.setAttribute('stroke', kind === 'eclat' ? '#ffe08a' : '#c8fff7');
  ring.setAttribute('stroke-linecap', 'round');
  ring.setAttribute('transform', 'rotate(-90 35 35)');
  ring.setAttribute('stroke-dasharray', String(RING));
  svg.append(bg, ring);
  const rest = h('span', { class: 'reste' });
  const el = h('button', { class: `pouvoir ${kind}`, 'aria-label': kind === 'eclat' ? 'Éclat d’aube' : 'Rafale', 'data-testid': `pouvoir-${kind}`, onClick },
    h('span', { class: 'fond' }), svg as unknown as HTMLElement, icon(kind === 'eclat' ? 'burst' : 'wind'), rest);
  return { el, ring, rest };
}

/** Interface en jeu : ressources en haut, pouvoirs et vague en bas. Mise à jour sans recréer le DOM. */
export class Hud {
  readonly root: HTMLElement;
  private gold: HTMLElement;
  private goldPill: HTMLElement;
  private lives: HTMLElement;
  private livesPill: HTMLElement;
  private wave: HTMLElement;
  private callBtn: HTMLButtonElement;
  private callMain: HTMLElement;
  private callSub: HTMLElement;
  private speedBtn: HTMLButtonElement;
  private abilities: Record<'eclat' | 'rafale', ReturnType<typeof abilityButton>>;
  private lastGold = -1;
  private lastLives = -1;
  private hint: HTMLElement;

  constructor(handlers: HudHandlers) {
    this.gold = h('span', { 'data-testid': 'or' });
    this.goldPill = h('div', { class: 'pastille' }, icon('coin'), this.gold);
    this.lives = h('span', { 'data-testid': 'vies' });
    this.livesPill = h('div', { class: 'pastille' }, icon('heart'), this.lives);
    this.wave = h('span', { 'data-testid': 'vague' });
    this.callMain = h('span');
    this.callSub = h('small');
    this.callBtn = h('button', { class: 'btn corail appel', 'data-testid': 'appel-vague', onClick: () => handlers.callWave() },
      icon('wave'), h('span', { class: 'lignes' }, this.callMain, this.callSub));
    this.speedBtn = h('button', { class: 'rond vitesse', 'data-testid': 'vitesse', 'aria-label': 'Vitesse', onClick: () => handlers.toggleSpeed() }, '×1');
    this.abilities = {
      eclat: abilityButton('eclat', () => handlers.ability('eclat')),
      rafale: abilityButton('rafale', () => handlers.ability('rafale')),
    };
    this.hint = h('div', { class: 'indice', style: 'display:none' });
    this.root = h('div', { class: 'hud', style: 'position:absolute;inset:0;pointer-events:none' },
      h('div', { class: 'hud-haut' },
        this.goldPill, this.livesPill, h('div', { class: 'pastille vague' }, icon('wave'), this.wave),
        h('div', { class: 'espace' }),
        h('button', { class: 'rond', 'aria-label': 'Pause', 'data-testid': 'pause', onClick: () => handlers.pause() }, icon('pause')),
      ),
      this.hint,
      h('div', { class: 'hud-bas' },
        h('div', { class: 'pouvoirs' }, this.abilities.eclat.el, this.abilities.rafale.el),
        h('div', { class: 'centre-bas' }, this.callBtn),
        this.speedBtn,
      ),
    );
  }

  setHint(text: string | null): void {
    this.hint.style.display = text ? 'block' : 'none';
    if (text) setText(this.hint, text);
  }

  setSpeed(speed: number): void {
    setText(this.speedBtn, `×${speed}`);
  }

  setTargeting(active: boolean): void {
    this.abilities.eclat.el.classList.toggle('actif', active);
  }

  update(state: GameState): void {
    const gold = Math.floor(state.gold);
    if (gold !== this.lastGold) {
      if (gold > this.lastGold && this.lastGold >= 0) this.bump(this.goldPill, 'gain');
      this.lastGold = gold;
      setText(this.gold, String(gold));
    }
    if (state.lives !== this.lastLives) {
      if (state.lives < this.lastLives) this.bump(this.livesPill, 'alerte');
      this.lastLives = state.lives;
      setText(this.lives, String(state.lives));
    }
    const total = Number.isFinite(state.totalWaves) ? `/${state.totalWaves}` : '';
    const shown = Math.min(state.waveIndex + (state.phase === 'prep' ? 1 : 1), Number.isFinite(state.totalWaves) ? state.totalWaves : 9999);
    setText(this.wave, `${shown}${total}`);
    const prep = state.phase === 'prep';
    this.callBtn.style.visibility = prep ? 'visible' : 'hidden';
    if (prep) {
      if (state.waveIndex === 0) {
        setText(this.callMain, 'Lancer la vague');
        setText(this.callSub, 'quand tu es prêt');
      } else {
        const bonus = Math.min(EARLY_CALL_MAX, Math.floor(state.countdown * EARLY_CALL_GOLD_PER_SEC));
        setText(this.callMain, `Vague dans ${Math.ceil(state.countdown)} s`);
        setText(this.callSub, bonus > 0 ? `Appeler maintenant : +${bonus} or` : 'Appeler maintenant');
      }
    }
    for (const kind of ['eclat', 'rafale'] as const) {
      const ab = state.abilities[kind];
      const ui = this.abilities[kind];
      const ready = ab.cooldown <= 0;
      ui.el.classList.toggle('charge', !ready);
      ui.el.classList.toggle('pret', ready && state.phase === 'wave');
      ui.ring.setAttribute('stroke-dashoffset', String(RING * (ab.cooldown / ab.maxCooldown)));
      setText(ui.rest, ready ? '' : `${Math.ceil(ab.cooldown)}`);
      ui.rest.style.display = ready ? 'none' : 'block';
    }
  }

  private bump(el: HTMLElement, cls: string): void {
    el.classList.remove(cls);
    void el.offsetWidth;
    el.classList.add(cls);
  }
}
