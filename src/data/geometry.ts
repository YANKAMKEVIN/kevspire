/**
 * Géométrie du monde (unités logiques). L'axe Y monte : y = 0 est le dessus de l'île.
 * La tour est centrée en X ; chaque étage porte un balcon à gauche et un à droite.
 */
export const WORLD_W = 540;
export const CENTER_X = WORLD_W / 2;
export const TOWER_W = 170;
export const FLOOR_H = 136;
export const CROWN_H = 96;
export const BALCONY_REACH = 40;
/** Hauteur des balcons au-dessus du plancher de l'étage. */
export const BALCONY_Y = 30;
export const WALL_LEFT = CENTER_X - TOWER_W / 2;
export const WALL_RIGHT = CENTER_X + TOWER_W / 2;
/** Distance d'apparition des volants autour du Cœur. */
export const SKY_SPAWN_RADIUS = 520;
export const GROUND_SPAWN_X = 40;

export function towerTop(floors: number): number {
  return floors * FLOOR_H;
}

export function heartPos(floors: number): { x: number; y: number } {
  return { x: CENTER_X, y: towerTop(floors) + CROWN_H * 0.62 };
}

/** Emplacements 0 et 1 : postes du sommet, de part et d'autre du Cœur (étage -1). */
export const CROWN_FLOOR = -1;
export const CROWN_SLOT_DX = 66;

export function slotId(floor: number, side: -1 | 1): number {
  return 2 + floor * 2 + (side < 0 ? 0 : 1);
}

export function slotFromId(id: number): { floor: number; side: -1 | 1 } {
  return { floor: Math.floor(id / 2) - 1, side: id % 2 === 0 ? -1 : 1 };
}

/** Position d'un emplacement ; les postes du sommet suivent la tour quand elle grandit. */
export function slotPos(id: number, floors: number): { x: number; y: number } {
  const { floor, side } = slotFromId(id);
  if (floor === CROWN_FLOOR) return { x: CENTER_X + side * CROWN_SLOT_DX, y: towerTop(floors) + 30 };
  const x = side < 0 ? WALL_LEFT - BALCONY_REACH : WALL_RIGHT + BALCONY_REACH;
  return { x, y: floor * FLOOR_H + BALCONY_Y + 18 };
}

export function slotCount(maxFloors: number): number {
  return 2 + maxFloors * 2;
}
