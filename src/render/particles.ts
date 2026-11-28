import type { Camera } from './camera';
import { makeGlowSprite } from './assets';

export const COLORS = {
  gold: '255,200,87',
  coral: '255,122,89',
  cyan: '111,243,224',
  violet: '150,100,255',
  magenta: '255,90,200',
  white: '255,250,235',
  frost: '170,225,255',
  ember: '255,130,40',
} as const;
export type ColorId = keyof typeof COLORS;

export type ParticleKind = 'glow' | 'smoke' | 'spark' | 'ring' | 'text' | 'chain' | 'beam';

export interface Particle {
  active: boolean;
  kind: ParticleKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  grow: number;
  color: ColorId;
  gravity: number;
  drag: number;
  text: string;
  points: number[];
}

/** Tracé vide partagé (jamais modifié) : évite un tableau neuf par particule. */
const NO_POINTS: number[] = [];

/** Réserve de particules sans allocation en cours de partie (perf mobile). */
export class ParticleSystem {
  private pool: Particle[] = [];
  private glow = new Map<ColorId, HTMLCanvasElement>();
  budget = 900;

  constructor() {
    for (const id of Object.keys(COLORS) as ColorId[]) this.glow.set(id, makeGlowSprite(64, COLORS[id]));
  }

  get activeCount(): number {
    let n = 0;
    for (const p of this.pool) if (p.active) n++;
    return n;
  }

  spawn(kind: ParticleKind, x: number, y: number, o: Partial<Particle> = {}): Particle | null {
    let p: Particle | undefined;
    for (let i = 0; i < this.pool.length; i++) {
      const q = this.pool[i] as Particle;
      if (!q.active) {
        p = q;
        break;
      }
    }
    if (!p) {
      if (this.pool.length >= this.budget) return null;
      p = { active: false, kind, x, y, vx: 0, vy: 0, life: 0, maxLife: 0, size: 0, grow: 0, color: 'gold', gravity: 0, drag: 0, text: '', points: [] };
      this.pool.push(p);
    }
    p.active = true;
    p.kind = kind;
    p.x = x;
    p.y = y;
    p.vx = o.vx ?? 0;
    p.vy = o.vy ?? 0;
    p.maxLife = p.life = o.life ?? 0.6;
    p.size = o.size ?? 10;
    p.grow = o.grow ?? 0;
    p.color = o.color ?? 'gold';
    p.gravity = o.gravity ?? 0;
    p.drag = o.drag ?? 0;
    p.text = o.text ?? '';
    p.points = o.points ?? NO_POINTS;
    return p;
  }

  burst(x: number, y: number, n: number, color: ColorId, speed: number, size: number, life = 0.5): void {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = speed * (0.35 + Math.random() * 0.65);
      this.spawn('glow', x, y, { vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: life * (0.6 + Math.random() * 0.6), size: size * (0.6 + Math.random() * 0.7), color, drag: 2.5, grow: -size * 0.8 });
    }
  }

  update(dt: number): void {
    for (const p of this.pool) {
      if (!p.active) continue;
      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        continue;
      }
      p.vy -= p.gravity * dt;
      const k = Math.max(0, 1 - p.drag * dt);
      p.vx *= k;
      p.vy *= k;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.size = Math.max(0, p.size + p.grow * dt);
    }
  }

  clear(): void {
    for (const p of this.pool) p.active = false;
  }

  draw(g: CanvasRenderingContext2D, cam: Camera): void {
    const s = cam.scale;
    // Passe 1 : fumées (normal), passe 2 : lumières (additif), passe 3 : textes.
    for (const p of this.pool) {
      if (!p.active || p.kind !== 'smoke') continue;
      const t = p.life / p.maxLife;
      g.globalAlpha = 0.35 * t;
      g.fillStyle = `rgb(${COLORS[p.color]})`;
      g.beginPath();
      g.arc(cam.toScreenX(p.x), cam.toScreenY(p.y), p.size * s, 0, Math.PI * 2);
      g.fill();
    }
    g.globalCompositeOperation = 'lighter';
    for (const p of this.pool) {
      if (!p.active) continue;
      const t = p.life / p.maxLife;
      const sx = cam.toScreenX(p.x);
      const sy = cam.toScreenY(p.y);
      if (p.kind === 'glow') {
        const sprite = this.glow.get(p.color);
        if (!sprite) continue;
        const r = p.size * s * 2;
        g.globalAlpha = Math.min(1, t * 1.4);
        g.drawImage(sprite, sx - r / 2, sy - r / 2, r, r);
      } else if (p.kind === 'spark') {
        g.globalAlpha = t;
        g.strokeStyle = `rgb(${COLORS[p.color]})`;
        g.lineWidth = Math.max(1, p.size * s * 0.25);
        g.beginPath();
        g.moveTo(sx, sy);
        g.lineTo(sx - p.vx * 0.03 * s, sy + p.vy * 0.03 * s);
        g.stroke();
      } else if (p.kind === 'ring') {
        const r = (p.size + (1 - t) * p.grow) * s;
        g.globalAlpha = t * 0.8;
        g.strokeStyle = `rgb(${COLORS[p.color]})`;
        g.lineWidth = 3 * s * t + 1;
        g.beginPath();
        g.arc(sx, sy, r, 0, Math.PI * 2);
        g.stroke();
      } else if (p.kind === 'chain') {
        this.drawChain(g, cam, p, t);
      }
    }
    g.globalCompositeOperation = 'source-over';
    for (const p of this.pool) {
      if (!p.active || p.kind !== 'text') continue;
      const t = p.life / p.maxLife;
      g.globalAlpha = Math.min(1, t * 2);
      g.font = `800 ${Math.round(p.size * s)}px Nunito, sans-serif`;
      g.textAlign = 'center';
      g.lineWidth = 4;
      g.strokeStyle = 'rgba(27,35,64,0.9)';
      g.fillStyle = `rgb(${COLORS[p.color]})`;
      const sx = cam.toScreenX(p.x);
      const sy = cam.toScreenY(p.y);
      g.strokeText(p.text, sx, sy);
      g.fillText(p.text, sx, sy);
    }
    g.globalAlpha = 1;
  }

  /** Éclair en zigzag entre les points (régénéré à chaque image pour qu'il crépite). */
  private drawChain(g: CanvasRenderingContext2D, cam: Camera, p: Particle, t: number): void {
    const pts = p.points;
    for (const pass of [0, 1]) {
      g.globalAlpha = pass === 0 ? 0.45 * t : t;
      g.strokeStyle = pass === 0 ? `rgb(${COLORS.violet})` : `rgb(${COLORS.white})`;
      g.lineWidth = (pass === 0 ? 7 : 2.2) * cam.scale;
      g.beginPath();
      for (let i = 0; i + 3 < pts.length; i += 2) {
        const ax = pts[i] as number;
        const ay = pts[i + 1] as number;
        const bx = pts[i + 2] as number;
        const by = pts[i + 3] as number;
        if (i === 0) g.moveTo(cam.toScreenX(ax), cam.toScreenY(ay));
        const segs = 5;
        for (let k = 1; k <= segs; k++) {
          const f = k / segs;
          const j = k === segs ? 0 : (Math.random() - 0.5) * 18;
          g.lineTo(cam.toScreenX(ax + (bx - ax) * f + j), cam.toScreenY(ay + (by - ay) * f + j));
        }
      }
      g.stroke();
    }
  }
}
