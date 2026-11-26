import { clamp } from '../core/math';
import { WORLD_W, towerTop } from '../data/geometry';

/**
 * Caméra verticale : la largeur du monde remplit l'écran, on fait défiler en hauteur.
 * `y` est l'altitude du bas de l'écran (en unités du monde).
 */
export class Camera {
  y = -150;
  targetY = -150;
  velocity = 0;
  scale = 1;
  viewW = 540;
  viewH = 960;
  dragging = false;
  shake = 0;
  shakeX = 0;
  shakeY = 0;

  resize(cssW: number, cssH: number): void {
    // Sur un écran large, on limite la largeur utile pour garder la tour lisible.
    this.scale = Math.min(cssW / WORLD_W, cssH / 760);
    this.viewW = cssW;
    this.viewH = cssH;
  }

  /** Décalage horizontal pour centrer le monde quand l'écran est plus large que lui. */
  get offsetX(): number {
    return (this.viewW - WORLD_W * this.scale) / 2;
  }

  get worldViewH(): number {
    return this.viewH / this.scale;
  }

  bounds(floors: number): { min: number; max: number } {
    const min = -230;
    const max = Math.max(min, towerTop(floors) + 260 - this.worldViewH);
    return { min, max };
  }

  /** Cadre le sommet de la tour (le Cœur) en laissant voir le ciel au-dessus. */
  focusTop(floors: number): void {
    const b = this.bounds(floors);
    this.targetY = clamp(towerTop(floors) + 240 - this.worldViewH, b.min, b.max);
  }

  dragBy(dyScreen: number, floors: number): void {
    const b = this.bounds(floors);
    this.y = clamp(this.y + dyScreen / this.scale, b.min - 40, b.max + 40);
    this.targetY = this.y;
  }

  update(dt: number, floors: number): void {
    const b = this.bounds(floors);
    if (!this.dragging) {
      if (Math.abs(this.velocity) > 1) {
        this.targetY += this.velocity * dt;
        this.velocity *= Math.pow(0.04, dt);
      } else this.velocity = 0;
      this.targetY = clamp(this.targetY, b.min, b.max);
      this.y += (this.targetY - this.y) * (1 - Math.pow(0.0005, dt));
    }
    if (this.shake > 0) {
      this.shake = Math.max(0, this.shake - dt * 18);
      this.shakeX = (Math.random() * 2 - 1) * this.shake;
      this.shakeY = (Math.random() * 2 - 1) * this.shake;
    } else this.shakeX = this.shakeY = 0;
  }

  toScreenX(x: number): number {
    return this.offsetX + x * this.scale + this.shakeX;
  }

  toScreenY(y: number): number {
    return this.viewH - (y - this.y) * this.scale + this.shakeY;
  }

  toWorld(sx: number, sy: number): { x: number; y: number } {
    return { x: (sx - this.offsetX) / this.scale, y: this.y + (this.viewH - sy) / this.scale };
  }

  addShake(amount: number): void {
    this.shake = Math.min(14, this.shake + amount);
  }
}
