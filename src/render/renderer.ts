import type { BiomeId } from '../core/types';
import { ENEMIES } from '../data/enemies';
import { slotFromId, slotPos } from '../data/geometry';
import { slotAvailable, buildCost } from '../sim/commands';
import type { GameState } from '../sim/state';
import { towerStats } from '../sim/towers';
import type { Assets } from './assets';
import { makeGlowSprite } from './assets';
import { Background } from './background';
import { BIOMES } from './biomes';
import { Camera } from './camera';
import { drawBurrow, drawEnemy } from './enemyArt';
import { Fx } from './fx';
import { ParticleSystem } from './particles';
import {
  drawBalconies, drawCrown, drawEmptySlot, drawFloors, drawHeart, drawIsland, drawTurret,
} from './towerArt';
import type { TowerView } from './towerArt';

export interface Overlay {
  selectedSlot: number;
  /** Aperçu de portée pendant le choix d'une tourelle. */
  previewRange: number;
  targeting: boolean;
}

/** Dessine une image complète de la partie sur un canvas 2D. */
export class Renderer {
  readonly cam = new Camera();
  readonly particles = new ParticleSystem();
  readonly fx: Fx;
  private bg = new Background();
  private glowGold: HTMLCanvasElement;
  private glowCyan: HTMLCanvasElement;
  private g: CanvasRenderingContext2D;
  private dpr = 1;
  private fireflyTimer = 0;
  time = 0;

  constructor(private canvas: HTMLCanvasElement, private assets: Assets) {
    const g = canvas.getContext('2d', { alpha: false });
    if (!g) throw new Error('Canvas 2D indisponible');
    this.g = g;
    this.fx = new Fx(this.particles, this.cam);
    this.glowGold = makeGlowSprite(128, '255,200,87');
    this.glowCyan = makeGlowSprite(128, '111,243,224');
  }

  resize(cssW: number, cssH: number, dpr: number): void {
    this.dpr = dpr;
    this.canvas.width = Math.round(cssW * dpr);
    this.canvas.height = Math.round(cssH * dpr);
    this.canvas.style.width = `${cssW}px`;
    this.canvas.style.height = `${cssH}px`;
    this.cam.resize(cssW, cssH);
  }

  update(dt: number, state: GameState, biome: BiomeId): void {
    this.time += dt;
    this.cam.update(dt, state.floors.length);
    this.particles.update(dt);
    this.fx.update(dt, state);
    this.bg.update(dt, BIOMES[biome]);
    this.fireflyTimer -= dt;
    if (this.fireflyTimer <= 0) {
      this.fireflyTimer = 0.35 / this.fx.density;
      const y = this.cam.y + Math.random() * this.cam.worldViewH;
      this.particles.spawn('glow', Math.random() * 540, y, {
        vx: (Math.random() - 0.5) * 14, vy: 6 + Math.random() * 10, life: 4 + Math.random() * 3, size: 3 + Math.random() * 2.5, color: BIOMES[biome].firefly,
      });
    }
  }

  draw(state: GameState, biome: BiomeId, overlay: Overlay): void {
    const g = this.g;
    const cam = this.cam;
    const style = BIOMES[biome];
    g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    g.imageSmoothingQuality = 'high';
    const v: TowerView = { g, cam, assets: this.assets, time: this.time };
    this.bg.drawSky(g, cam, this.assets, style, this.time);
    this.bg.drawClouds(g, cam, style, 0);
    drawIsland(v);
    for (const e of state.enemies) drawBurrow(v, e);
    drawFloors(v, state, style.towerShade);
    drawBalconies(v, state);
    drawCrown(v, state);
    for (const e of state.enemies) if (ENEMIES[e.kind].movement !== 'flier') drawEnemy(v, e);
    this.drawSlots(v, state, overlay);
    drawHeart(v, state, this.glowCyan, this.fx.heartHurt);
    this.drawBeams(state);
    for (const e of state.enemies) if (ENEMIES[e.kind].movement === 'flier') drawEnemy(v, e);
    this.drawProjectiles(state);
    this.particles.draw(g, cam);
    this.bg.drawClouds(g, cam, style, 1);
    this.drawRange(state, overlay);
    this.drawIndicators(state);
    if (overlay.targeting) this.drawTargetingHint();
  }

  private drawSlots(v: TowerView, state: GameState, overlay: Overlay): void {
    const floors = state.floors.length;
    const cheapest = buildCost(state, 'baliste');
    for (let slot = 0; slot < state.slots.length; slot++) {
      if (!slotAvailable(state, slot)) continue;
      const tower = state.slots[slot];
      if (tower) drawTurret(v, slot, tower, floors, this.fx.turret.get(slot), this.glowGold);
      else drawEmptySlot(v, slot, floors, state.gold >= cheapest, overlay.selectedSlot === slot);
    }
  }

  private drawBeams(state: GameState): void {
    const g = this.g;
    const cam = this.cam;
    g.globalCompositeOperation = 'lighter';
    state.slots.forEach((t, slot) => {
      if (!t || t.kind !== 'phare' || !t.targetId || t.disabled > 0) return;
      const target = state.enemies.find((e) => e.id === t.targetId);
      if (!target) return;
      const p = slotPos(slot, state.floors.length);
      const ox = cam.toScreenX(p.x + (slotFromId(slot).side < 0 ? -10 : 10));
      const oy = cam.toScreenY(p.y + 30);
      const tx = cam.toScreenX(target.x);
      const ty = cam.toScreenY(target.y);
      const f = 0.5 + t.focus / 2.2;
      for (const [w, col] of [[14, 'rgba(255,200,87,0.25)'], [6, 'rgba(255,236,170,0.7)'], [2.2, 'rgba(255,255,255,0.95)']] as const) {
        g.strokeStyle = col;
        g.lineWidth = w * cam.scale * f * (0.9 + Math.random() * 0.2);
        g.beginPath();
        g.moveTo(ox, oy);
        g.lineTo(tx, ty);
        g.stroke();
      }
      const r = 26 * cam.scale * f;
      g.drawImage(this.glowGold, tx - r, ty - r, r * 2, r * 2);
      if (Math.random() < 0.3) this.particles.spawn('spark', target.x, target.y, { vx: (Math.random() - 0.5) * 220, vy: Math.random() * 200, life: 0.25, size: 6, color: 'gold' });
    });
    g.globalCompositeOperation = 'source-over';
  }

  private drawProjectiles(state: GameState): void {
    const g = this.g;
    const cam = this.cam;
    g.globalCompositeOperation = 'lighter';
    for (const p of state.projectiles) {
      const sx = cam.toScreenX(p.x);
      const sy = cam.toScreenY(p.y);
      if (p.kind === 'bolt') {
        const dx = p.tx - p.x;
        const dy = p.ty - p.y;
        const d = Math.hypot(dx, dy) || 1;
        g.strokeStyle = 'rgba(255,220,140,0.95)';
        g.lineWidth = 3 * cam.scale;
        g.beginPath();
        g.moveTo(sx - (dx / d) * 22 * cam.scale, sy + (dy / d) * 22 * cam.scale);
        g.lineTo(sx, sy);
        g.stroke();
        const r = 10 * cam.scale;
        g.drawImage(this.glowGold, sx - r, sy - r, r * 2, r * 2);
      } else {
        const r = 16 * cam.scale;
        g.drawImage(this.glowGold, sx - r, sy - r, r * 2, r * 2);
        g.fillStyle = '#ffdca0';
        g.beginPath();
        g.arc(sx, sy, 4.5 * cam.scale, 0, Math.PI * 2);
        g.fill();
      }
    }
    g.globalCompositeOperation = 'source-over';
  }

  private drawRange(state: GameState, overlay: Overlay): void {
    if (overlay.selectedSlot < 0) return;
    const p = slotPos(overlay.selectedSlot, state.floors.length);
    const tower = state.slots[overlay.selectedSlot];
    const range = tower ? towerStats(state, overlay.selectedSlot, tower).range : overlay.previewRange;
    if (range <= 0) return;
    const g = this.g;
    const cam = this.cam;
    g.save();
    g.setLineDash([8, 7]);
    g.lineDashOffset = -this.time * 20;
    g.strokeStyle = 'rgba(255,200,87,0.85)';
    g.fillStyle = 'rgba(255,200,87,0.08)';
    g.lineWidth = 2;
    g.beginPath();
    g.arc(cam.toScreenX(p.x), cam.toScreenY(p.y + 30), range * cam.scale, 0, Math.PI * 2);
    g.fill();
    g.stroke();
    g.restore();
  }

  /** Flèches au bord de l'écran pour les Brumâmes hors champ. */
  private drawIndicators(state: GameState): void {
    const g = this.g;
    const cam = this.cam;
    const top = cam.y + cam.worldViewH;
    let above = 0;
    let below = 0;
    for (const e of state.enemies) {
      if (e.phase === 'burrow') continue;
      if (e.y > top + 10) above++;
      else if (e.y < cam.y - 10) below++;
    }
    const pulse = 0.6 + 0.4 * Math.sin(this.time * 6);
    const arrow = (y: number, dir: 1 | -1, count: number) => {
      const x = cam.viewW / 2;
      g.globalAlpha = pulse;
      g.fillStyle = '#ff5ac8';
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x - 14, y + dir * 14);
      g.lineTo(x + 14, y + dir * 14);
      g.closePath();
      g.fill();
      g.globalAlpha = 1;
      g.font = '800 13px Nunito, sans-serif';
      g.textAlign = 'center';
      g.fillStyle = '#fff';
      g.fillText(String(count), x, y + dir * 28 + 4);
    };
    if (above > 0) arrow(96, 1, above);
    if (below > 0) arrow(cam.viewH - 150, -1, below);
  }

  private drawTargetingHint(): void {
    const g = this.g;
    g.fillStyle = 'rgba(255,200,87,0.10)';
    g.fillRect(0, 0, this.cam.viewW, this.cam.viewH);
  }
}
