import type { AudioEngine } from '../audio/audio';
import { botTick, unlockedTowers } from '../bot/bot';
import type { BiomeId, EnemyKind, TowerKind } from '../core/types';
import { dist2 } from '../core/math';
import { ENDLESS_ID, getLevel } from '../data/levels';
import { slotPos } from '../data/geometry';
import { TOWERS } from '../data/towers';
import { attachGestures } from '../input/gestures';
import type { Renderer } from '../render/renderer';
import type { SaveData } from '../save/schema';
import { slotAvailable } from '../sim/commands';
import { executeRecorded, finishRecording, startRecording } from '../sim/replay';
import type { Command, Replay } from '../sim/replay';
import type { GameEvent, GameState } from '../sim/state';
import { FIXED_DT, step } from '../sim/step';
import { buildRadial, towerPanel } from '../ui/buildMenu';
import { banner, floorChoiceModal, lumiDialogue, newEnemyModal, pauseModal } from '../ui/dialogs';
import { h } from '../ui/dom';
import { Hud } from '../ui/hud';

export interface SessionHooks {
  /** Partie terminée (victoire ou défaite). */
  finished(state: GameState): void;
  /** Le joueur quitte vers le menu (la partie reste sauvegardée). */
  quit(state: GameState): void;
  restart(levelId: number): void;
  /** Point de sauvegarde (début de vague, choix d'étage). */
  checkpoint(state: GameState): void;
}

export interface SessionOptions {
  bot: boolean;
  speed: number;
  showIntro: boolean;
}

const SLOT_TOUCH_RADIUS = 52;
const MAX_STEPS_PER_FRAME = 24;

/** Une partie en cours : boucle de simulation, entrées tactiles, HUD et fenêtres. */
export class GameSession {
  readonly biome: BiomeId;
  speed = 1;
  paused = false;
  private acc = 0;
  private botTimer = 0;
  private hud: Hud;
  private layer: HTMLElement;
  private popup: HTMLElement | null = null;
  private modal: HTMLElement | null = null;
  private selected = -1;
  private preview = 0;
  private targeting = false;
  private detach: () => void;
  private ended = false;
  /** Événements en cours de traitement (double tampon : aucune allocation par image). */
  private spareEvents: GameEvent[] = [];
  private consuming = false;
  /** Enregistrement de la partie depuis son ouverture (rejouable avec playReplay, utile pour reproduire un bug). */
  readonly replay: Replay;

  constructor(
    readonly state: GameState,
    private renderer: Renderer,
    private canvas: HTMLCanvasElement,
    private uiRoot: HTMLElement,
    private save: SaveData,
    private audio: AudioEngine,
    private hooks: SessionHooks,
    private opts: SessionOptions,
  ) {
    this.biome = state.endless ? 'orage' : getLevel(state.levelId).biome;
    this.replay = startRecording(state);
    this.speed = opts.speed;
    this.hud = new Hud({
      pause: () => this.openPause(),
      callWave: () => this.cmd({ c: 'callWave' }),
      toggleSpeed: () => {
        this.speed = this.speed >= 3 ? 1 : this.speed + 1;
        this.hud.setSpeed(this.speed);
        this.audio.play('click');
      },
      ability: (kind) => this.onAbility(kind),
    });
    this.hud.setSpeed(this.speed);
    this.layer = h('div', { class: 'couche-jeu', style: 'position:absolute;inset:0;pointer-events:none' });
    this.uiRoot.replaceChildren(this.hud.root, this.layer);
    this.detach = attachGestures(canvas, {
      begin: () => { this.renderer.cam.dragging = true; this.renderer.cam.velocity = 0; },
      drag: (dy) => this.renderer.cam.dragBy(dy, this.state.floors.length),
      release: (v) => { this.renderer.cam.dragging = false; this.renderer.cam.velocity = v / this.renderer.cam.scale; },
      tap: (x, y) => this.onTap(x, y),
      wheel: (dy) => { this.renderer.cam.targetY -= dy / this.renderer.cam.scale; },
    });
    this.renderer.particles.clear();
    this.renderer.cam.y = -230;
    this.renderer.cam.focusTop(state.floors.length);
    this.audio.setTheme(this.biome);
    if (opts.showIntro && !opts.bot && !state.endless && state.waveIndex === 0) {
      this.showModal(lumiDialogue(getLevel(state.levelId).intro, () => this.closeModal()));
    }
  }

  destroy(): void {
    this.detach();
    this.uiRoot.replaceChildren();
  }

  get blocked(): boolean {
    return this.paused || this.modal !== null;
  }

  // ------------------------------------------------------------------ boucle

  frame(dt: number): void {
    const s = this.state;
    if (!this.blocked && !this.ended) {
      this.acc += Math.min(dt, 0.1) * this.speed;
      let n = 0;
      while (this.acc >= FIXED_DT && n < MAX_STEPS_PER_FRAME) {
        if (this.opts.bot) this.runBot();
        step(s);
        this.acc -= FIXED_DT;
        n++;
        this.consumeEvents();
        if (this.modal || this.ended) break;
      }
      if (n >= MAX_STEPS_PER_FRAME) this.acc = 0;
    }
    this.renderer.update(this.blocked ? dt * 0.3 : dt, s, this.biome);
    this.renderer.draw(s, this.biome, { selectedSlot: this.selected, previewRange: this.preview, targeting: this.targeting });
    this.hud.update(s);
    this.audio.setIntensity(s.phase === 'wave' ? Math.min(1, 0.4 + s.enemies.length / 40) : 0.1);
    if (this.popup && this.selected >= 0) this.positionPopup();
  }

  private runBot(): void {
    this.botTimer -= FIXED_DT;
    if (this.botTimer > 0) return;
    this.botTimer = 0.25;
    botTick(this.state, [], this.replay.entries);
  }

  private consumeEvents(): void {
    const events = this.state.events;
    if (events.length === 0 || this.consuming) return;
    this.consuming = true;
    this.state.events = this.spareEvents;
    try {
      for (const ev of events) this.onEvent(ev);
    } finally {
      events.length = 0;
      this.spareEvents = events;
      this.consuming = false;
    }
  }

  private onEvent(ev: GameEvent): void {
    this.renderer.fx.handle(this.state, ev);
    this.audio.onEvent(ev);
    switch (ev.type) {
      case 'waveStart':
        this.layer.append(banner(`Vague ${ev.wave + 1}`, this.state.endless ? 'Ascension' : 'Les Brumâmes arrivent'));
        this.hooks.checkpoint(this.state);
        break;
      case 'waveEnd':
        this.layer.append(banner(`+${ev.bonus} or`, 'Vague repoussée'));
        if (this.state.phase === 'choose') this.openFloorChoice();
        break;
      case 'grow':
        this.renderer.cam.focusTop(this.state.floors.length);
        break;
      case 'spawn':
        this.maybeIntroduce(ev.kind);
        break;
      case 'leak':
        if (this.save.settings.haptics) navigator.vibrate?.(40);
        break;
      case 'won':
      case 'lost':
        this.ended = true;
        finishRecording(this.replay, this.state);
        this.closePopup();
        this.hooks.finished(this.state);
        break;
      default:
        break;
    }
  }

  private maybeIntroduce(kind: EnemyKind): void {
    if (this.save.seenEnemies.includes(kind)) return;
    this.save.seenEnemies.push(kind);
    if (this.opts.bot) return;
    this.audio.play('open');
    this.showModal(newEnemyModal(kind, () => this.closeModal()));
  }

  // ------------------------------------------------------------------ entrées

  private cmd(command: Command): boolean {
    const r = executeRecorded(this.state, command, this.replay.entries);
    this.audio.play(r.ok ? 'click' : 'deny');
    return r.ok;
  }

  private onAbility(kind: 'eclat' | 'rafale'): void {
    const ab = this.state.abilities[kind];
    if (this.state.phase !== 'wave' || ab.cooldown > 0) {
      this.audio.play('deny');
      return;
    }
    if (kind === 'rafale') {
      this.cmd({ c: 'ability', kind: 'rafale', x: 0, y: 0 });
      return;
    }
    this.targeting = !this.targeting;
    this.hud.setTargeting(this.targeting);
    this.hud.setHint(this.targeting ? 'Touche la tour là où frapper' : null);
    this.closePopup();
  }

  private onTap(sx: number, sy: number): void {
    this.audio.unlock();
    if (this.blocked) return;
    const rect = this.canvas.getBoundingClientRect();
    const w = this.renderer.cam.toWorld(sx - rect.left, sy - rect.top);
    if (this.targeting) {
      this.targeting = false;
      this.hud.setTargeting(false);
      this.hud.setHint(null);
      this.cmd({ c: 'ability', kind: 'eclat', x: w.x, y: w.y });
      return;
    }
    const slot = this.slotAt(w.x, w.y);
    if (slot < 0 || slot === this.selected) {
      this.closePopup();
      return;
    }
    this.openSlot(slot);
  }

  private slotAt(x: number, y: number): number {
    let best = -1;
    let bestD = SLOT_TOUCH_RADIUS * SLOT_TOUCH_RADIUS;
    for (let slot = 0; slot < this.state.slots.length; slot++) {
      if (!slotAvailable(this.state, slot)) continue;
      const p = slotPos(slot, this.state.floors.length);
      const d = dist2(x, y, p.x, p.y + 22);
      if (d < bestD) {
        bestD = d;
        best = slot;
      }
    }
    return best;
  }

  openSlot(slot: number): void {
    this.closePopup();
    this.selected = slot;
    this.preview = 0;
    this.audio.play('open');
    const handlers = {
      build: (s: number, kind: TowerKind) => {
        if (this.cmd({ c: 'build', slot: s, kind })) this.closePopup();
      },
      upgrade: (s: number) => {
        if (this.cmd({ c: 'upgrade', slot: s })) this.openSlot(s);
      },
      sell: (s: number) => {
        if (this.cmd({ c: 'sell', slot: s })) this.closePopup();
      },
      preview: (kind: TowerKind | null) => {
        this.preview = kind ? TOWERS[kind].levels[0].range * this.state.modifiers.rangeMul : 0;
      },
      close: () => this.closePopup(),
    };
    const unlocked = new Set(unlockedTowers(this.state.endless ? 99 : this.state.levelId));
    const p = this.slotScreen(slot);
    this.popup = this.state.slots[slot]
      ? towerPanel(this.state, slot, handlers)
      : buildRadial(this.state, slot, p.x, p.y, (k) => unlocked.has(k), handlers, this.renderer.cam.viewW);
    this.layer.append(this.popup);
  }

  /** Position écran d'un emplacement (utilisée aussi par les tests de bout en bout). */
  slotScreen(slot: number): { x: number; y: number } {
    const cam = this.renderer.cam;
    const p = slotPos(slot, this.state.floors.length);
    return { x: cam.toScreenX(p.x), y: cam.toScreenY(p.y + 24) };
  }

  /** Le menu radial suit le balcon quand la caméra bouge. */
  private positionPopup(): void {
    const radial = this.popup?.querySelector<HTMLElement>('.radial');
    if (!radial) return;
    const p = this.slotScreen(this.selected);
    radial.style.left = `${p.x}px`;
    radial.style.top = `${p.y}px`;
  }

  closePopup(): void {
    this.popup?.remove();
    this.popup = null;
    this.selected = -1;
    this.preview = 0;
  }

  // ------------------------------------------------------------------ fenêtres

  private showModal(el: HTMLElement): void {
    this.closePopup();
    this.modal?.remove();
    this.modal = el;
    this.layer.append(el);
  }

  private closeModal(): void {
    this.audio.unlock();
    this.audio.play('click');
    this.modal?.remove();
    this.modal = null;
  }

  private openFloorChoice(): void {
    if (this.opts.bot) return;
    this.audio.play('open');
    this.showModal(floorChoiceModal(this.state.floorChoices, (i) => {
      executeRecorded(this.state, { c: 'chooseFloor', index: i }, this.replay.entries);
      this.consumeEvents();
      this.closeModal();
      this.hooks.checkpoint(this.state);
    }));
  }

  openPause(): void {
    if (this.modal || this.ended) return;
    this.paused = true;
    this.audio.play('click');
    this.showModal(pauseModal(
      () => { this.paused = false; this.closeModal(); },
      () => { this.paused = false; this.hooks.restart(this.state.levelId); },
      () => { this.paused = false; this.hooks.quit(this.state); },
    ));
  }

  /** Mise en pause automatique quand l'application passe en arrière-plan. */
  autoPause(): void {
    if (!this.blocked && !this.ended && this.state.phase !== 'won' && this.state.phase !== 'lost') this.openPause();
  }

  isEndless(): boolean {
    return this.state.levelId === ENDLESS_ID;
  }
}
