import type { EnemyKind } from '../core/types';
import { ENEMIES } from '../data/enemies';
import type { Enemy } from '../sim/state';
import type { ImageId } from './assets';
import type { TowerView } from './towerArt';

const SPRITE: Record<EnemyKind, ImageId> = {
  grignot: 'grignot',
  papillombre: 'papillombre',
  carapace: 'carapace',
  fouisseur: 'fouisseur',
  moucheron: 'moucheron',
  planeur: 'planeur',
  mereBrume: 'mere_brume',
};

/** Taille d'affichage (unités du monde) : un peu plus grande que la boîte de collision. */
export function displaySize(kind: EnemyKind): number {
  return ENEMIES[kind].size * (kind === 'mereBrume' ? 2.4 : 2.1);
}

function healthBar(v: TowerView, e: Enemy, x: number, y: number, w: number): void {
  const { g, cam } = v;
  const s = cam.scale;
  const ratio = Math.max(0, e.hp / e.maxHp);
  const boss = ENEMIES[e.kind].boss === true;
  const bw = (boss ? 90 : Math.max(26, w * 0.6)) * s;
  const bh = (boss ? 7 : 4) * s;
  const sx = cam.toScreenX(x) - bw / 2;
  const sy = cam.toScreenY(y) - bh;
  g.fillStyle = 'rgba(20,14,40,0.8)';
  g.fillRect(sx - 1.5, sy - 1.5, bw + 3, bh + 3);
  g.fillStyle = ratio > 0.5 ? '#6FF3E0' : ratio > 0.25 ? '#FFC857' : '#FF7A59';
  g.fillRect(sx, sy, bw * ratio, bh);
}

export function drawEnemy(v: TowerView, e: Enemy): void {
  if (e.phase === 'burrow') return;
  const { g, cam, assets, time } = v;
  const def = ENEMIES[e.kind];
  const size = displaySize(e.kind);
  const img = assets.get(SPRITE[e.kind]);
  const s = cam.scale;
  const sx = cam.toScreenX(e.x);
  const sy = cam.toScreenY(e.y);
  if (sy < -size * s * 2 || sy > cam.viewH + size * s * 2) return;
  const t = time * 6 + e.wobble;
  g.save();
  g.translate(sx, sy);
  let w = size;
  let h = size;
  if (img) h = (size * img.naturalHeight) / img.naturalWidth;
  if (def.movement === 'flier') {
    const flap = e.kind === 'planeur' ? 1 + Math.sin(t * 0.5) * 0.06 : 0.75 + Math.abs(Math.sin(t * 1.6)) * 0.3;
    g.rotate(Math.sin(t * 0.4) * 0.12);
    g.scale(flap * (e.kind === 'planeur' ? e.side : 1), 1);
  } else if (e.phase === 'climb') {
    // Grimpe : la créature (de profil) se tourne vers le haut, pattes contre le mur.
    g.rotate(e.side < 0 ? -Math.PI / 2 : Math.PI / 2);
    if (e.side > 0) g.scale(-1, 1);
    g.translate(0, Math.sin(t) * 1.5 * s);
  } else {
    const facing = e.phase === 'top' ? (e.x < 270 ? 1 : -1) : e.side < 0 ? 1 : -1;
    g.scale(facing, 1);
    g.translate(0, -Math.abs(Math.sin(t)) * 3 * s);
  }
  w *= s;
  h *= s;
  if (img) {
    g.drawImage(img, -w / 2, -h / 2, w, h);
    if (e.slowTimer > 0) {
      const frost = assets.silhouette(SPRITE[e.kind], '#9fe6ff');
      if (frost) {
        g.globalAlpha = 0.38;
        g.drawImage(frost, -w / 2, -h / 2, w, h);
      }
    }
    if (e.hitFlash > 0) {
      const white = assets.silhouette(SPRITE[e.kind], '#ffffff');
      if (white) {
        g.globalAlpha = Math.min(0.85, e.hitFlash * 7);
        g.drawImage(white, -w / 2, -h / 2, w, h);
      }
    }
    g.globalAlpha = 1;
  } else {
    g.fillStyle = '#3B2A5C';
    g.beginPath();
    g.arc(0, 0, w / 2, 0, Math.PI * 2);
    g.fill();
  }
  g.restore();
  if (e.stunTimer > 0) {
    g.fillStyle = '#FFC857';
    for (let i = 0; i < 3; i++) {
      const a = time * 5 + (i * Math.PI * 2) / 3;
      g.beginPath();
      g.arc(sx + Math.cos(a) * size * 0.45 * s, sy - size * 0.55 * s + Math.sin(a) * 4 * s, 2.6 * s, 0, Math.PI * 2);
      g.fill();
    }
  }
  if (e.hp < e.maxHp || def.boss) healthBar(v, e, e.x, e.y + size * 0.62, size);
}

/** Monticule de terre qui avance sous l'île (Fouisseur enfoui). */
export function drawBurrow(v: TowerView, e: Enemy): void {
  if (e.phase !== 'burrow') return;
  const { g, cam, time } = v;
  const s = cam.scale;
  const sx = cam.toScreenX(e.x);
  const sy = cam.toScreenY(2);
  g.fillStyle = '#5a3d5e';
  g.beginPath();
  g.ellipse(sx, sy, 16 * s, (6 + Math.sin(time * 12 + e.wobble) * 1.5) * s, 0, Math.PI, 0);
  g.fill();
  g.fillStyle = 'rgba(160,110,255,0.6)';
  for (let i = 0; i < 3; i++) {
    g.beginPath();
    g.arc(sx + (Math.random() - 0.5) * 24 * s, sy - Math.random() * 10 * s, 2 * s, 0, Math.PI * 2);
    g.fill();
  }
}
