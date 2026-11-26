import { ENEMIES } from '../data/enemies';
import { heartPos, slotPos } from '../data/geometry';
import type { GameEvent, GameState } from '../sim/state';
import type { Camera } from './camera';
import type { ParticleSystem } from './particles';
import type { TurretAnim } from './towerArt';

/** Traduit les événements de la simulation en effets visuels. */
export class Fx {
  readonly turret = new Map<number, TurretAnim>();
  heartHurt = 0;
  /** Facteur de densité (réduit en qualité « éco »). */
  density = 1;

  constructor(private particles: ParticleSystem, private cam: Camera) {}

  private anim(slot: number): TurretAnim {
    let a = this.turret.get(slot);
    if (!a) {
      a = { pop: 0, recoil: 0 };
      this.turret.set(slot, a);
    }
    return a;
  }

  private n(count: number): number {
    return Math.max(1, Math.round(count * this.density));
  }

  handle(state: GameState, ev: GameEvent): void {
    const P = this.particles;
    const floors = state.floors.length;
    switch (ev.type) {
      case 'shot': {
        this.anim(ev.slot).recoil = 1;
        const p = slotPos(ev.slot, floors);
        if (ev.kind === 'mortier') {
          P.burst(p.x, p.y + 50, this.n(6), 'ember', 90, 7, 0.35);
          P.spawn('smoke', p.x, p.y + 56, { vy: 30, life: 0.9, size: 9, grow: 14, color: 'violet' });
        } else if (ev.kind === 'baliste') P.burst(p.x, p.y + 44, this.n(3), 'gold', 60, 4, 0.2);
        break;
      }
      case 'hit':
        P.burst(ev.x, ev.y, this.n(4), 'gold', 110, 4, 0.25);
        break;
      case 'explosion':
        P.burst(ev.x, ev.y, this.n(16), 'ember', 240, 12, 0.55);
        P.burst(ev.x, ev.y, this.n(6), 'coral', 120, 18, 0.4);
        P.spawn('ring', ev.x, ev.y, { size: 8, grow: ev.radius, life: 0.35, color: 'ember' });
        for (let i = 0; i < this.n(4); i++) P.spawn('smoke', ev.x + (Math.random() - 0.5) * 30, ev.y, { vy: 25, life: 1.1, size: 10, grow: 16, color: 'violet' });
        this.cam.addShake(2.5);
        break;
      case 'pulse': {
        const p = slotPos(ev.slot, floors);
        P.spawn('ring', p.x, p.y + 30, { size: 10, grow: ev.radius, life: 0.6, color: 'frost' });
        P.burst(p.x, p.y + 30, this.n(8), 'frost', 140, 5, 0.6);
        this.anim(ev.slot).recoil = 0.6;
        break;
      }
      case 'chain':
        P.spawn('chain', 0, 0, { life: 0.16, points: ev.points.slice() });
        for (let i = 2; i + 1 < ev.points.length; i += 2) P.burst(ev.points[i] as number, ev.points[i + 1] as number, this.n(4), 'violet', 120, 6, 0.3);
        break;
      case 'kill': {
        const big = ENEMIES[ev.kind].boss === true;
        P.burst(ev.x, ev.y, this.n(big ? 60 : 12), 'violet', big ? 300 : 150, big ? 16 : 9, big ? 1.2 : 0.55);
        P.burst(ev.x, ev.y, this.n(big ? 20 : 5), 'cyan', 90, 6, 0.8);
        P.spawn('text', ev.x, ev.y + 18, { vy: 46, life: 0.9, size: big ? 24 : 15, color: 'gold', text: `+${ev.bounty}`, drag: 1.5 });
        if (big) this.cam.addShake(10);
        break;
      }
      case 'leak': {
        const h = heartPos(floors);
        this.heartHurt = 1;
        P.burst(h.x, h.y, this.n(18), 'magenta', 200, 10, 0.6);
        P.spawn('text', h.x, h.y + 50, { vy: 40, life: 1.1, size: 20, color: 'coral', text: `-${ev.amount}`, drag: 1 });
        this.cam.addShake(5 + ev.amount);
        break;
      }
      case 'emerge':
        P.burst(ev.x, ev.y, this.n(14), 'violet', 160, 9, 0.6);
        for (let i = 0; i < this.n(3); i++) P.spawn('smoke', ev.x, ev.y, { vx: (Math.random() - 0.5) * 60, vy: 20, life: 1, size: 12, grow: 14, color: 'violet' });
        break;
      case 'disable': {
        const p = slotPos(ev.slot, floors);
        P.burst(p.x, p.y + 30, this.n(12), 'violet', 90, 7, 0.8);
        break;
      }
      case 'build': {
        const p = slotPos(ev.slot, floors);
        this.anim(ev.slot).pop = 1;
        P.burst(p.x, p.y + 20, this.n(ev.level > 1 ? 24 : 14), 'gold', 160, 8, 0.7);
        P.spawn('ring', p.x, p.y + 10, { size: 6, grow: 60, life: 0.45, color: 'gold' });
        break;
      }
      case 'sell': {
        const p = slotPos(ev.slot, floors);
        P.spawn('text', p.x, p.y + 40, { vy: 40, life: 1, size: 16, color: 'gold', text: `+${ev.refund}` });
        P.burst(p.x, p.y + 20, this.n(10), 'white', 120, 6, 0.5);
        this.turret.delete(ev.slot);
        break;
      }
      case 'grow': {
        const h = heartPos(floors);
        P.burst(h.x, h.y - 40, this.n(40), 'gold', 260, 12, 1.0);
        this.cam.addShake(4);
        break;
      }
      case 'ability':
        if (ev.kind === 'eclat') {
          P.spawn('ring', ev.x, ev.y, { size: 10, grow: 130, life: 0.6, color: 'gold' });
          P.spawn('ring', ev.x, ev.y, { size: 4, grow: 90, life: 0.8, color: 'white' });
          P.burst(ev.x, ev.y, this.n(50), 'gold', 320, 12, 0.9);
          this.cam.addShake(6);
        } else {
          for (let i = 0; i < this.n(40); i++) {
            const y = Math.random() * 1400;
            P.spawn('spark', Math.random() < 0.5 ? -20 : 560, y, { vx: (Math.random() < 0.5 ? 1 : -1) * 700, vy: -200, life: 0.7, size: 10, color: 'white' });
          }
          this.cam.addShake(4);
        }
        break;
      default:
        break;
    }
  }

  update(dt: number, state: GameState): void {
    this.heartHurt = Math.max(0, this.heartHurt - dt * 2.5);
    for (const a of this.turret.values()) {
      a.pop = Math.max(0, a.pop - dt * 3);
      a.recoil = Math.max(0, a.recoil - dt * 6);
    }
    // Traînées des obus de mortier.
    for (const p of state.projectiles) {
      if (p.kind === 'shell' && Math.random() < 0.7 * this.density) {
        this.particles.spawn('glow', p.x, p.y, { life: 0.3, size: 6, grow: -14, color: 'ember' });
      }
    }
  }
}
