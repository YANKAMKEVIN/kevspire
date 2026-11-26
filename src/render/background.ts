import type { Assets } from './assets';
import type { BiomeStyle } from './biomes';
import type { Camera } from './camera';

interface Puff {
  x: number;
  y: number;
  r: number;
  speed: number;
  layer: number;
}

/** Ciel en parallaxe, mer de nuages, étoiles et éclairs d'orage. */
export class Background {
  private puffs: Puff[] = [];
  private puffSprite: HTMLCanvasElement | null = null;
  private stars: { x: number; y: number; p: number }[] = [];
  private flash = 0;
  private flashTimer = 6;

  constructor() {
    for (let i = 0; i < 26; i++) {
      this.puffs.push({ x: Math.random() * 700 - 80, y: -60 - Math.random() * 260, r: 50 + Math.random() * 70, speed: 4 + Math.random() * 8, layer: i % 2 });
    }
    for (let i = 0; i < 70; i++) this.stars.push({ x: Math.random(), y: Math.random() * 0.6, p: Math.random() * 6 });
  }

  private ensurePuff(): HTMLCanvasElement {
    if (this.puffSprite) return this.puffSprite;
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d') as CanvasRenderingContext2D;
    const grad = g.createRadialGradient(64, 64, 4, 64, 64, 64);
    grad.addColorStop(0, 'rgba(255,255,255,0.95)');
    grad.addColorStop(0.55, 'rgba(255,255,255,0.55)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 128, 128);
    this.puffSprite = c;
    return c;
  }

  update(dt: number, style: BiomeStyle): void {
    for (const p of this.puffs) {
      p.x += p.speed * dt;
      if (p.x - p.r > 640) p.x = -120 - p.r;
    }
    if (style.lightning) {
      this.flashTimer -= dt;
      if (this.flashTimer <= 0) {
        this.flash = 1;
        this.flashTimer = 5 + Math.random() * 9;
      }
    }
    this.flash = Math.max(0, this.flash - dt * 3.5);
  }

  /** Renvoie l'intensité de l'éclair courant (pour l'audio éventuel). */
  get lightning(): number {
    return this.flash;
  }

  drawSky(g: CanvasRenderingContext2D, cam: Camera, assets: Assets, style: BiomeStyle, time: number): void {
    const W = cam.viewW;
    const H = cam.viewH;
    const img = assets.get(style.sky);
    if (img) {
      // L'image couvre l'écran ; elle glisse lentement quand on monte (parallaxe).
      const scale = Math.max(W / img.naturalWidth, (H * 1.25) / img.naturalHeight);
      const w = img.naturalWidth * scale;
      const h = img.naturalHeight * scale;
      const travel = h - H;
      const k = Math.min(1, Math.max(0, (cam.y + 230) / 1600));
      g.drawImage(img, (W - w) / 2, -travel * (1 - k), w, h);
    } else {
      g.fillStyle = '#1B2340';
      g.fillRect(0, 0, W, H);
    }
    if (style.stars) {
      for (const s of this.stars) {
        const a = 0.35 + 0.35 * Math.sin(time * 1.7 + s.p);
        g.fillStyle = `rgba(255,250,235,${a})`;
        g.fillRect(s.x * W, s.y * H, 1.6, 1.6);
      }
    }
    if (this.flash > 0) {
      g.fillStyle = `rgba(230,220,255,${this.flash * 0.22})`;
      g.fillRect(0, 0, W, H);
    }
  }

  /** Nuages : la couche 0 passe derrière l'île, la couche 1 devant (profondeur). */
  drawClouds(g: CanvasRenderingContext2D, cam: Camera, style: BiomeStyle, layer: number): void {
    const sprite = this.ensurePuff();
    for (const p of this.puffs) {
      if (p.layer !== layer) continue;
      const sx = cam.toScreenX(p.x);
      const sy = cam.toScreenY(p.y);
      const r = p.r * cam.scale * (layer === 1 ? 1.25 : 1);
      if (sy - r > cam.viewH || sy + r < 0) continue;
      g.globalAlpha = layer === 1 ? 0.55 : 0.4;
      g.drawImage(this.tintedPuff(sprite, style.cloud), sx - r * 1.4, sy - r * 0.8, r * 2.8, r * 1.6);
    }
    g.globalAlpha = 1;
    // Mer de nuages : voile qui monte depuis le bas de l'écran.
    const seaTop = cam.toScreenY(-120);
    if (layer === 1 && seaTop < cam.viewH) {
      const grad = g.createLinearGradient(0, seaTop, 0, cam.viewH);
      grad.addColorStop(0, `rgba(${style.cloud},0)`);
      grad.addColorStop(1, `rgba(${style.cloud},0.65)`);
      g.fillStyle = grad;
      g.fillRect(0, seaTop, cam.viewW, cam.viewH - seaTop);
    }
  }

  private tintCache = new Map<string, HTMLCanvasElement>();
  private tintedPuff(sprite: HTMLCanvasElement, rgb: string): HTMLCanvasElement {
    const hit = this.tintCache.get(rgb);
    if (hit) return hit;
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d') as CanvasRenderingContext2D;
    g.drawImage(sprite, 0, 0);
    g.globalCompositeOperation = 'source-in';
    g.fillStyle = `rgb(${rgb})`;
    g.fillRect(0, 0, 128, 128);
    this.tintCache.set(rgb, c);
    return c;
  }
}
