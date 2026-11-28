import { AudioEngine } from './audio/audio';
import { ENDLESS_ID, LEVELS } from './data/levels';
import { GameSession } from './game/session';
import { recordResult } from './meta/progression';
import { modifiersFrom } from './meta/upgrades';
import { Assets } from './render/assets';
import { Renderer } from './render/renderer';
import { loadSave, memoryStore, writeSave } from './save/save';
import type { KeyValueStore } from './save/save';
import type { SaveData } from './save/schema';
import { createGame } from './sim/create';
import type { GameState } from './sim/state';
import type { AppApi, ScreenId } from './ui/api';
import { resultModal } from './ui/dialogs';
import { h } from './ui/dom';
import { renderAtelier, renderBestiaire, renderLevels, renderSettings, renderTitle } from './ui/screens';

export interface LaunchOptions {
  bot: boolean;
  speed: number;
  level: number | null;
  seed: number | null;
}

export function readLaunchOptions(search: string): LaunchOptions {
  const p = new URLSearchParams(search);
  const num = (k: string) => (p.has(k) ? Number(p.get(k)) : null);
  return { bot: p.get('bot') === '1', speed: Math.min(16, Math.max(1, num('speed') ?? 1)), level: num('level'), seed: num('seed') };
}

function browserStore(): KeyValueStore {
  try {
    const k = '__kevspire_test__';
    localStorage.setItem(k, '1');
    localStorage.removeItem(k);
    return localStorage;
  } catch {
    return memoryStore();
  }
}

/** Application : écrans de menu, partie en cours, sauvegarde, qualité graphique. */
export class App implements AppApi {
  readonly audio = new AudioEngine();
  readonly save: SaveData;
  readonly saveSource: string;
  private store = browserStore();
  private assets = new Assets();
  private renderer: Renderer;
  private session: GameSession | null = null;
  private last = 0;
  private slowFrames = 0;
  private dprCap = 2;
  private running = false;
  private rafId = 0;
  /** Images dessinées depuis le lancement (sert aux tests : rien ne tourne onglet caché). */
  frames = 0;

  constructor(private canvas: HTMLCanvasElement, private ui: HTMLElement, private launch: LaunchOptions) {
    const loaded = loadSave(this.store);
    this.save = loaded.data;
    this.saveSource = loaded.source;
    this.renderer = new Renderer(canvas, this.assets);
    window.addEventListener('resize', () => this.resize());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.session?.autoPause();
        this.audio.suspend();
        this.stopLoop();
      } else {
        this.audio.resume();
        this.startLoop();
      }
    });
    const unlock = () => this.audio.unlock();
    window.addEventListener('pointerdown', unlock, { passive: true });
  }

  async start(): Promise<void> {
    const bar = h('i', { style: 'width:0%' });
    this.ui.replaceChildren(h('div', { class: 'chargement' }, h('div', { style: 'text-align:center' },
      h('div', { style: 'font-family:var(--titre);font-weight:900;font-size:40px;color:var(--or)' }, 'Kevspire'),
      h('div', { class: 'barre' }, bar))));
    await Promise.all([
      this.assets.load((d, t) => { bar.style.width = `${(d / t) * 100}%`; }),
      document.fonts?.ready.catch(() => undefined),
    ]);
    this.applySettings();
    this.resize();
    (window as unknown as { __kevspire?: unknown }).__kevspire = { app: this, session: null };
    this.startLoop();
    if (this.launch.level !== null) this.startLevel(this.launch.level);
    else this.go('title');
  }

  // ------------------------------------------------------------------ API des écrans

  go(screen: ScreenId): void {
    this.endSession();
    this.canvas.style.visibility = 'hidden';
    this.audio.setTheme('menu');
    const map = { title: renderTitle, levels: renderLevels, atelier: renderAtelier, bestiaire: renderBestiaire, settings: renderSettings };
    map[screen](this.ui, this);
  }

  startLevel(id: number): void {
    const seed = this.launch.seed ?? Math.floor(Math.random() * 1e9);
    this.beginSession(createGame(id, seed, modifiersFrom(this.save.upgrades)), true);
  }

  resumeRun(): void {
    if (this.save.run) this.beginSession(this.save.run, false);
  }

  persist(): void {
    writeSave(this.store, this.save);
  }

  applySettings(): void {
    const s = this.save.settings;
    this.audio.setVolumes(s.sfx, s.music);
    this.dprCap = s.quality === 'haute' ? 3 : s.quality === 'eco' ? 1 : 2;
    this.renderer.fx.density = s.quality === 'eco' ? 0.45 : 1;
    this.renderer.particles.budget = s.quality === 'eco' ? 350 : 900;
    this.resize();
  }

  // ------------------------------------------------------------------ partie

  private beginSession(state: GameState, fresh: boolean): void {
    this.endSession();
    this.canvas.style.visibility = 'visible';
    this.session = new GameSession(state, this.renderer, this.canvas, this.ui, this.save, this.audio, {
      finished: (s) => this.onFinished(s),
      quit: (s) => {
        this.save.run = s.phase === 'won' || s.phase === 'lost' ? null : this.save.run;
        this.persist();
        this.go('levels');
      },
      restart: (id) => this.startLevel(id),
      checkpoint: (s) => {
        this.save.run = JSON.parse(JSON.stringify({ ...s, events: [] })) as GameState;
        this.persist();
      },
    }, { bot: this.launch.bot, speed: this.launch.speed, showIntro: fresh });
    (window as unknown as { __kevspire?: unknown }).__kevspire = { app: this, session: this.session };
  }

  private endSession(): void {
    this.session?.destroy();
    this.session = null;
  }

  private onFinished(state: GameState): void {
    const outcome = recordResult(this.save, state);
    this.persist();
    const levelIndex = LEVELS.findIndex((l) => l.id === state.levelId);
    const next = LEVELS[levelIndex + 1];
    const won = state.phase === 'won';
    const modal = resultModal(state, {
      won: won || state.endless,
      stars: outcome.stars,
      eclats: outcome.eclatsGained,
      newBest: outcome.newBest,
      endless: state.levelId === ENDLESS_ID,
      hasNext: !!next,
    },
    () => next && this.startLevel(next.id),
    () => this.startLevel(state.levelId),
    () => this.go('levels'));
    setTimeout(() => {
      if (this.session?.state === state) {
        this.ui.append(modal);
        if (won) this.audio.play('star');
      }
    }, 900);
  }

  // ------------------------------------------------------------------ rendu

  private resize(): void {
    const w = window.innerWidth;
    const hgt = window.innerHeight;
    this.renderer.resize(w, hgt, Math.min(window.devicePixelRatio || 1, this.dprCap));
  }

  /** Boucle d'affichage : arrêtée onglet caché (batterie), reprise sans saut de temps. */
  private startLoop(): void {
    if (this.running || document.hidden) return;
    this.running = true;
    this.last = 0;
    this.rafId = requestAnimationFrame(this.tick);
  }

  private stopLoop(): void {
    this.running = false;
    cancelAnimationFrame(this.rafId);
  }

  /** Fonction liée une fois pour toutes : aucune fermeture allouée par image. */
  private readonly tick = (t: number): void => {
    if (!this.running) return;
    const dt = this.last ? Math.min(0.1, (t - this.last) / 1000) : 1 / 60;
    this.last = t;
    this.frames++;
    if (this.session) {
      this.session.frame(dt);
      this.adaptQuality(dt);
    }
    this.rafId = requestAnimationFrame(this.tick);
  };

  /** Qualité « auto » : si le téléphone peine, on baisse la résolution et les particules. */
  private adaptQuality(dt: number): void {
    if (this.save.settings.quality !== 'auto') return;
    this.slowFrames = dt > 1 / 40 ? this.slowFrames + 1 : Math.max(0, this.slowFrames - 1);
    if (this.slowFrames > 90 && this.dprCap > 1) {
      this.dprCap = Math.max(1, this.dprCap - 0.5);
      this.renderer.fx.density = Math.max(0.4, this.renderer.fx.density - 0.25);
      this.slowFrames = 0;
      this.resize();
    }
  }
}
