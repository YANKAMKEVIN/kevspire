import type { FloorKind } from '../core/types';
import { FLOORS } from '../data/floors';
import { BALCONY_Y, CENTER_X, FLOOR_H, TOWER_W, WALL_LEFT, WALL_RIGHT, heartPos, slotPos, towerTop } from '../data/geometry';
import type { GameState, Tower } from '../sim/state';
import type { Assets, ImageId } from './assets';
import type { Camera } from './camera';

export const ISLAND_W = 820;
/** Part de la hauteur de l'image d'île située au-dessus de l'herbe. */
const ISLAND_GRASS = 0.2;
const TURRET_SIZE = 74;
const CROWN_W = 250;

const BADGE: Record<FloorKind, string> = {
  rempart: '#5fa35a',
  atelier: '#d9893a',
  belvedere: '#6FF3E0',
  comptoir: '#FFC857',
  sanctuaire: '#ff8fb0',
};

/** Contexte visuel partagé par les fonctions de dessin de la tour. */
export interface TowerView {
  g: CanvasRenderingContext2D;
  cam: Camera;
  assets: Assets;
  time: number;
}

function drawImageWorld(v: TowerView, id: ImageId, cx: number, bottomY: number, w: number, h?: number): void {
  const img = v.assets.get(id);
  if (!img) return;
  const hh = h ?? (w * img.naturalHeight) / img.naturalWidth;
  const s = v.cam.scale;
  v.g.drawImage(img, v.cam.toScreenX(cx - w / 2), v.cam.toScreenY(bottomY + hh), w * s, hh * s);
}

export function drawIsland(v: TowerView): void {
  const img = v.assets.get('ile_base');
  if (!img) return;
  const h = (ISLAND_W * img.naturalHeight) / img.naturalWidth;
  // On aligne la ligne d'herbe de l'image sur y = 0.
  const top = h * ISLAND_GRASS;
  drawImageWorld(v, 'ile_base', CENTER_X, top - h, ISLAND_W, h);
}

function floorArt(index: number, kind: FloorKind | null): ImageId {
  if (kind) return `etage_${FLOORS[kind].art}` as ImageId;
  return index === 0 ? 'etage_b' : index % 2 === 1 ? 'etage_a' : 'etage_c';
}

function drawBadge(v: TowerView, kind: FloorKind, x: number, y: number): void {
  const { g, cam } = v;
  const sx = cam.toScreenX(x);
  const sy = cam.toScreenY(y);
  const r = 13 * cam.scale;
  g.fillStyle = '#2a2140';
  g.beginPath();
  g.arc(sx, sy, r + 2.5 * cam.scale, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = BADGE[kind];
  g.beginPath();
  g.arc(sx, sy, r, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = '#2a2140';
  g.fillStyle = '#2a2140';
  g.lineWidth = 2 * cam.scale;
  const k = r * 0.5;
  g.beginPath();
  switch (kind) {
    case 'rempart':
      for (const dx of [-k, 0, k]) {
        g.moveTo(sx + dx - k * 0.4, sy + k * 0.6);
        g.lineTo(sx + dx, sy - k * 0.9);
        g.lineTo(sx + dx + k * 0.4, sy + k * 0.6);
      }
      g.fill();
      break;
    case 'atelier':
      g.arc(sx, sy, k * 0.9, 0, Math.PI * 2);
      g.stroke();
      for (let i = 0; i < 6; i++) {
        const a = (i * Math.PI) / 3;
        g.moveTo(sx + Math.cos(a) * k * 0.9, sy + Math.sin(a) * k * 0.9);
        g.lineTo(sx + Math.cos(a) * k * 1.4, sy + Math.sin(a) * k * 1.4);
      }
      g.stroke();
      break;
    case 'belvedere':
      g.ellipse(sx, sy, k * 1.3, k * 0.75, 0, 0, Math.PI * 2);
      g.stroke();
      g.beginPath();
      g.arc(sx, sy, k * 0.4, 0, Math.PI * 2);
      g.fill();
      break;
    case 'comptoir':
      g.arc(sx, sy, k * 1.1, 0, Math.PI * 2);
      g.stroke();
      g.beginPath();
      g.arc(sx, sy, k * 0.45, 0, Math.PI * 2);
      g.fill();
      break;
    case 'sanctuaire':
      g.moveTo(sx, sy + k * 1.1);
      g.bezierCurveTo(sx - k * 1.6, sy - k * 0.1, sx - k * 0.6, sy - k * 1.3, sx, sy - k * 0.4);
      g.bezierCurveTo(sx + k * 0.6, sy - k * 1.3, sx + k * 1.6, sy - k * 0.1, sx, sy + k * 1.1);
      g.fill();
      break;
  }
}

/** Ronces du Rempart : quelques lianes épineuses peintes sur le mur. */
function drawThorns(v: TowerView, floor: number): void {
  const { g, cam } = v;
  g.strokeStyle = '#3f7d46';
  g.lineWidth = 3 * cam.scale;
  for (const wall of [WALL_LEFT + 6, WALL_RIGHT - 6]) {
    g.beginPath();
    for (let k = 0; k <= 10; k++) {
      const y = floor * FLOOR_H + 10 + (k / 10) * (FLOOR_H - 20);
      const x = wall + Math.sin(k * 1.3 + floor) * 6;
      if (k === 0) g.moveTo(cam.toScreenX(x), cam.toScreenY(y));
      else g.lineTo(cam.toScreenX(x), cam.toScreenY(y));
    }
    g.stroke();
  }
}

export function drawFloors(v: TowerView, state: GameState, shade: number): void {
  for (let i = 0; i < state.floors.length; i++) {
    const kind = state.floors[i] ?? null;
    const y0 = i * FLOOR_H;
    if (v.cam.toScreenY(y0) < -40 || v.cam.toScreenY(y0 + FLOOR_H) > v.cam.viewH + 40) continue;
    drawImageWorld(v, floorArt(i, kind), CENTER_X, y0 - 8, TOWER_W + 14, FLOOR_H + 16);
    if (kind === 'rempart') drawThorns(v, i);
    if (kind) drawBadge(v, kind, CENTER_X, y0 + FLOOR_H - 26);
  }
  if (shade > 0) {
    const { g, cam } = v;
    g.fillStyle = `rgba(20,16,50,${shade})`;
    const top = towerTop(state.floors.length);
    g.fillRect(cam.toScreenX(WALL_LEFT - 7), cam.toScreenY(top + 8), (TOWER_W + 14) * cam.scale, top * cam.scale + 8);
  }
}

/** Balcon en bois et laiton, du mur jusqu'à l'emplacement de tourelle. */
export function drawBalcony(v: TowerView, floor: number, side: -1 | 1): void {
  const { g, cam } = v;
  const s = cam.scale;
  const y = floor * FLOOR_H + BALCONY_Y;
  const wall = side < 0 ? WALL_LEFT + 4 : WALL_RIGHT - 4;
  const outer = side < 0 ? WALL_LEFT - 86 : WALL_RIGHT + 86;
  const x0 = Math.min(wall, outer);
  const w = Math.abs(outer - wall);
  // Console de soutien (équerre sous le plancher).
  const mid = wall + (outer - wall) * 0.6;
  g.fillStyle = '#5a3520';
  g.beginPath();
  g.moveTo(cam.toScreenX(wall), cam.toScreenY(y));
  g.lineTo(cam.toScreenX(wall), cam.toScreenY(y - 38));
  g.lineTo(cam.toScreenX(mid), cam.toScreenY(y));
  g.closePath();
  g.fill();
  g.strokeStyle = '#c99a3c';
  g.lineWidth = 2 * s;
  g.beginPath();
  g.moveTo(cam.toScreenX(wall), cam.toScreenY(y - 38));
  g.lineTo(cam.toScreenX(mid), cam.toScreenY(y));
  g.stroke();
  // Plancher.
  const grad = g.createLinearGradient(0, cam.toScreenY(y), 0, cam.toScreenY(y - 12));
  grad.addColorStop(0, '#e0a865');
  grad.addColorStop(1, '#9a5f34');
  g.fillStyle = grad;
  g.fillRect(cam.toScreenX(x0), cam.toScreenY(y), w * s, 12 * s);
  g.fillStyle = '#d8a24a';
  g.fillRect(cam.toScreenX(x0), cam.toScreenY(y), w * s, 2.5 * s);
  // Garde-corps en laiton au bord extérieur.
  g.strokeStyle = '#c99a3c';
  g.lineWidth = 2.5 * s;
  g.beginPath();
  g.moveTo(cam.toScreenX(outer), cam.toScreenY(y));
  g.lineTo(cam.toScreenX(outer), cam.toScreenY(y + 22));
  g.lineTo(cam.toScreenX(outer - side * 14), cam.toScreenY(y + 22));
  g.stroke();
  g.fillStyle = '#FFC857';
  g.beginPath();
  g.arc(cam.toScreenX(outer), cam.toScreenY(y + 24), 3.2 * s, 0, Math.PI * 2);
  g.fill();
}

export function drawBalconies(v: TowerView, state: GameState): void {
  for (let i = 0; i < state.floors.length; i++) {
    drawBalcony(v, i, -1);
    drawBalcony(v, i, 1);
  }
}

export function drawCrown(v: TowerView, state: GameState): void {
  drawImageWorld(v, 'sommet', CENTER_X, towerTop(state.floors.length) - 10, CROWN_W);
}

/** Cœur d'Aube : flotte, pulse, et faiblit avec les vies restantes. */
export function drawHeart(v: TowerView, state: GameState, glow: HTMLCanvasElement, hurt: number): void {
  const { g, cam, time } = v;
  const h = heartPos(state.floors.length);
  const ratio = state.maxLives > 0 ? state.lives / state.maxLives : 0;
  const bob = Math.sin(time * 2) * 4;
  const pulse = 0.75 + 0.25 * Math.sin(time * 3);
  const flicker = ratio < 0.3 ? 0.6 + Math.random() * 0.4 : 1;
  const r = (110 + 40 * pulse) * cam.scale * (0.6 + 0.4 * ratio);
  g.globalCompositeOperation = 'lighter';
  g.globalAlpha = 0.8 * flicker;
  g.drawImage(glow, cam.toScreenX(h.x) - r, cam.toScreenY(h.y + bob) - r, r * 2, r * 2);
  g.globalCompositeOperation = 'source-over';
  g.globalAlpha = 1;
  const w = 58 + hurt * 10;
  const img = v.assets.get('coeur');
  if (img) {
    const hh = (w * img.naturalHeight) / img.naturalWidth;
    g.drawImage(img, cam.toScreenX(h.x - w / 2), cam.toScreenY(h.y + bob + hh / 2), w * cam.scale, hh * cam.scale);
  }
}

export function drawEmptySlot(v: TowerView, slot: number, floors: number, affordable: boolean, selected: boolean): void {
  const { g, cam, time } = v;
  const p = slotPos(slot, floors);
  const sx = cam.toScreenX(p.x);
  const sy = cam.toScreenY(p.y - 6);
  const s = cam.scale;
  const pulse = affordable ? 0.5 + 0.5 * Math.sin(time * 3 + slot) : 0;
  g.fillStyle = selected ? 'rgba(255,200,87,0.55)' : `rgba(27,35,64,${0.45 + pulse * 0.1})`;
  g.strokeStyle = affordable || selected ? `rgba(255,200,87,${0.6 + pulse * 0.4})` : 'rgba(243,227,195,0.35)';
  g.lineWidth = 2.5 * s;
  g.beginPath();
  g.ellipse(sx, sy, 22 * s, 9 * s, 0, 0, Math.PI * 2);
  g.fill();
  g.stroke();
  g.lineWidth = 3 * s;
  g.beginPath();
  g.moveTo(sx - 6 * s, sy - 14 * s);
  g.lineTo(sx + 6 * s, sy - 14 * s);
  g.moveTo(sx, sy - 20 * s);
  g.lineTo(sx, sy - 8 * s);
  g.stroke();
}

export interface TurretAnim {
  pop: number;
  recoil: number;
}

export function drawTurret(v: TowerView, slot: number, tower: Tower, floors: number, anim: TurretAnim | undefined, glow: HTMLCanvasElement): void {
  const { g, cam, time } = v;
  const p = slotPos(slot, floors);
  const img = v.assets.get(tower.kind);
  const levelScale = 1 + (tower.level - 1) * 0.09;
  const pop = anim ? 1 + Math.sin(Math.min(1, anim.pop) * Math.PI) * 0.25 * (anim.pop > 0 ? 1 : 0) : 1;
  const recoil = anim ? anim.recoil : 0;
  const size = TURRET_SIZE * levelScale * pop;
  const s = cam.scale;
  const sx = cam.toScreenX(p.x);
  const base = cam.toScreenY(p.y - 14);
  if (tower.level === 3) {
    const r = size * 0.9 * s;
    g.globalCompositeOperation = 'lighter';
    g.globalAlpha = 0.35 + 0.15 * Math.sin(time * 2.5 + slot);
    g.drawImage(glow, sx - r, base - r * 1.1, r * 2, r * 2);
    g.globalCompositeOperation = 'source-over';
  }
  g.globalAlpha = tower.disabled > 0 ? 0.55 : 1;
  if (img) {
    const w = size;
    const h = (w * img.naturalHeight) / img.naturalWidth;
    const flip = slot % 2 === 0 && tower.kind !== 'bobine' && tower.kind !== 'cloche';
    g.save();
    g.translate(sx, base);
    if (flip) g.scale(-1, 1);
    g.scale(1 + recoil * 0.08, 1 - recoil * 0.12);
    g.drawImage(img, (-w / 2) * s, -h * s, w * s, h * s);
    g.restore();
  }
  g.globalAlpha = 1;
  // Pastilles de niveau.
  for (let i = 0; i < tower.level; i++) {
    const px = sx + (i - (tower.level - 1) / 2) * 10 * s;
    const py = base + 8 * s;
    g.fillStyle = '#2a2140';
    g.beginPath();
    g.arc(px, py, 4.2 * s, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#FFC857';
    g.beginPath();
    g.moveTo(px, py - 3 * s);
    g.lineTo(px + 3 * s, py);
    g.lineTo(px, py + 3 * s);
    g.lineTo(px - 3 * s, py);
    g.fill();
  }
  if (tower.disabled > 0) {
    g.font = `800 ${Math.round(16 * s)}px Nunito, sans-serif`;
    g.fillStyle = '#c9b8ff';
    g.textAlign = 'center';
    const k = (time * 1.2) % 1;
    g.globalAlpha = 1 - k;
    g.fillText('z', sx + 14 * s + k * 8 * s, base - size * s - k * 18 * s);
    g.globalAlpha = 1;
  }
}

