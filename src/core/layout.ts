// Reglas de colocación de accesorios (puras, sin Phaser): se usan igual al colocar, al mover y al cargar partidas.
// Coordenadas = mundo de Blender en metros (x derecha, y hacia el fondo del lote).
import { GARAGE_OFFSET, SLOT_HALF, SLOT_WORLD, TOTAL_SLOTS, ZONES, zoneOfSlot } from '../data/config';
import type { ItemDef } from '../data/items';
import { isSlotUnlocked, type SaveData } from './save';

export type R = [number, number, number, number];            // x0, y0, x1, y1
export type Rot = 0 | 1 | 2 | 3;                              // 0 mira a -Y, 1 a +X, 2 a +Y, 3 a -X
/** `slot`: solo en Bahías de Servicio = índice estable de la plaza (SLOT_WORLD) sobre la que están instaladas */
export interface Placed { uid: string; item: string; x: number; y: number; rot: Rot; slot?: number }
export type LayoutSave = Pick<SaveData, 'zones' | 'slotsUnlocked' | 'cars'>;

const GY = GARAGE_OFFSET[1];
/** Zona interior del garaje original (pegado a la pared trasera, sin muro lateral). */
export const GARAGE_RECT: R = [-12, 7, 12, 21];
/** Muebles ya incluidos en la imagen del garaje (estantes, bancos, columnas): no se puede construir encima. */
export const BAKED_OBSTACLES: R[] = ([[-11.7, 4.3, 11.7, 6.5], [-11.6, 0.9, -9.0, 4.0], [9.0, 0.9, 11.6, 4.0]] as R[]).map(([a, b, c, d]) => [a, b + GY, c, d + GY]);
/** Carril de entrada de vehículos: de la calle al garaje. Ningún accesorio puede cerrarlo. */
export const ENTRY_LANE: R = [-2.2, -21, 2.2, 7];

export interface WallDef { id: string; rot: Rot; axis: 'x' | 'y'; face: number; range: [number, number]; zones?: string[] }
/** Muros donde se puede colgar decoración. `face` = coordenada de la cara visible del muro. */
export const WALLS: WallDef[] = [
  { id: 'garaje-fondo', rot: 0, axis: 'y', face: 6.52 + GY, range: [-12, 12] },
  { id: 'lote-fondo-izq', rot: 0, axis: 'y', face: 20.52, range: [-24, -12], zones: ['flanco-izquierdo'] },
  { id: 'lote-fondo-der', rot: 0, axis: 'y', face: 20.52, range: [12, 24], zones: ['flanco-derecho'] },
  { id: 'lote-izq', rot: 1, axis: 'x', face: -23.82, range: [-21, 21], zones: ['patio-izquierdo', 'frente-izquierdo', 'flanco-izquierdo'] },
];

export const hasZoneId = (save: Pick<SaveData, 'zones'>, id: string) => (save.zones ?? []).includes(id);

/** Rectángulos jugables: el garaje original más las zonas compradas. */
export function playable(save: Pick<SaveData, 'zones'>): R[] {
  return [GARAGE_RECT, ...ZONES.filter((z) => hasZoneId(save, z.id)).map((z) => z.rect)];
}
/** Plazas de auto en juego (siempre las 5 del garaje; las de zonas solo si se compraron). */
export function slotRects(save: Pick<SaveData, 'zones'>): R[] {
  const out: R[] = [];
  for (let i = 0; i < TOTAL_SLOTS; i++) {
    const z = zoneOfSlot(i); if (z && !hasZoneId(save, z.id)) continue;
    out.push([SLOT_WORLD[i][0] - SLOT_HALF[0], SLOT_WORLD[i][1] - SLOT_HALF[1], SLOT_WORLD[i][0] + SLOT_HALF[0], SLOT_WORLD[i][1] + SLOT_HALF[1]]);
  }
  return out;
}

export function footprint(def: Pick<ItemDef, 'w' | 'd'>, x: number, y: number, rot: Rot): R {
  const w = rot % 2 === 0 ? def.w : def.d, d = rot % 2 === 0 ? def.d : def.w;
  return [x - w / 2, y - d / 2, x + w / 2, y + d / 2];
}
export const overlap = (a: R, b: R, gap = 0) => a[0] < b[2] + gap && a[2] > b[0] - gap && a[1] < b[3] + gap && a[3] > b[1] - gap;
const pointIn = (px: number, py: number, r: R) => px >= r[0] - 1e-6 && px <= r[2] + 1e-6 && py >= r[1] - 1e-6 && py <= r[3] + 1e-6;
/** ¿El rectángulo cabe dentro de la unión de áreas jugables? (se muestrea el borde cada 0.25 m) */
export function insideUnion(r: R, areas: R[]): boolean {
  const xs: number[] = [], ys: number[] = [];
  for (let x = r[0]; x < r[2]; x += 0.25) xs.push(x); xs.push(r[2]);
  for (let y = r[1]; y < r[3]; y += 0.25) ys.push(y); ys.push(r[3]);
  const ins = (px: number, py: number) => areas.some((a) => pointIn(px, py, a));
  for (const x of xs) for (const y of ys) if (!ins(x, y)) return false;
  return true;
}

export interface Verdict { ok: boolean; reason: string; x: number; y: number; rot: Rot; slot?: number }

/** Plaza (índice estable) cuyo centro está a menos de `tol` metros de (x, y), o -1. */
export function slotIndexAt(x: number, y: number, tol = 0.6): number {
  for (let i = 0; i < TOTAL_SLOTS; i++) if (Math.hypot(SLOT_WORLD[i][0] - x, SLOT_WORLD[i][1] - y) <= tol) return i;
  return -1;
}
/** Plaza más cercana (para que la Bahía se acople sola). */
export function nearestSlot(x: number, y: number, maxDist = 3.5): number {
  let b = -1, bd = maxDist;
  for (let i = 0; i < TOTAL_SLOTS; i++) { const d = Math.hypot(SLOT_WORLD[i][0] - x, SLOT_WORLD[i][1] - y); if (d < bd) { bd = d; b = i; } }
  return b;
}
/** Recorrido de un auto de cliente hasta una plaza: calle -> carril de entrada -> pasillo -> plaza. Se usa para animar y para reservar el camino. */
export function bayPath(slot: number): [number, number][] {
  const [bx, by] = SLOT_WORLD[slot];
  const cy = by < -7 ? -7 : 7;           // pasillo libre entre filas de plazas
  return [[0, -27], [0, cy], [bx, cy], [bx, by]];
}
/** Zonas que deben quedar libres para que el auto llegue a la bahía (el carril de entrada ya está reservado aparte). */
export function bayRoute(slot: number): R[] {
  const p = bayPath(slot), h = 1.2;
  return [
    [Math.min(p[1][0], p[2][0]) - h, p[1][1] - h, Math.max(p[1][0], p[2][0]) + h, p[1][1] + h],
    [p[2][0] - h, Math.min(p[2][1], p[3][1]) - h, p[2][0] + h, Math.max(p[2][1], p[3][1]) + h],
  ];
}

/** Intenta colgar un accesorio de pared cerca de (px, py): elige el muro más cercano y ajusta posición y rotación. */
export function snapWall(def: ItemDef, px: number, py: number, save: Pick<SaveData, 'zones'>): { wall: WallDef; x: number; y: number; rot: Rot } | null {
  let best: { wall: WallDef; x: number; y: number; rot: Rot; dist: number } | null = null;
  for (const w of WALLS) {
    if (w.zones && !w.zones.some((z) => hasZoneId(save, z))) continue;
    const half = def.w / 2;
    const along = w.axis === 'y' ? px : py, dist = Math.abs((w.axis === 'y' ? py : px) - w.face);
    const a = Math.min(Math.max(along, w.range[0] + half), w.range[1] - half);
    const x = w.axis === 'y' ? a : w.face + (w.rot === 1 ? def.d / 2 : -def.d / 2);
    const y = w.axis === 'y' ? w.face - def.d / 2 : a;
    const dd = dist + Math.abs(along - a) * 0.5;
    if (!best || dd < best.dist) best = { wall: w, x, y, rot: w.rot, dist: dd };
  }
  return best && best.dist < 6 ? best : null;
}

/** Valida una colocación. `others` = accesorios ya colocados (sin el que se está moviendo). */
export function validate(def: ItemDef, x: number, y: number, rot: Rot, save: LayoutSave, others: Placed[], getDef: (id: string) => ItemDef | undefined): Verdict {
  const bad = (reason: string): Verdict => ({ ok: false, reason, x, y, rot });
  const fp = footprint(def, x, y, rot);
  if (def.kind === 'wall') {
    const wall = WALLS.find((w) => w.rot === rot && (!w.zones || w.zones.some((z) => hasZoneId(save, z))) &&
      (w.axis === 'y' ? Math.abs(fp[3] - w.face) < 0.02 && fp[0] >= w.range[0] - 1e-6 && fp[2] <= w.range[1] + 1e-6 : Math.abs(fp[0] - w.face) < 0.02 && fp[1] >= w.range[0] - 1e-6 && fp[3] <= w.range[1] + 1e-6));
    if (!wall) return bad('Va pegado a un muro');
    for (const o of others) { const od = getDef(o.item); if (od?.kind === 'wall' && overlap(fp, footprint(od, o.x, o.y, o.rot), -0.01)) return bad('Hay otro accesorio de pared aquí'); }
    return { ok: true, reason: '', x, y, rot };
  }
  if (def.special === 'bay') {
    // Bahía de Servicio: se acopla a una plaza de auto desbloqueada, libre de carros propios y de otra bahía
    const i = slotIndexAt(x, y);
    if (i < 0) return bad('La bahía va sobre una plaza de auto');
    if (!isSlotUnlocked(save as SaveData, i)) return bad('Esa plaza está bloqueada');
    if (save.cars.some((c) => c.slot === i)) return bad('Hay un carro tuyo en esa plaza: retíralo primero');
    if (others.some((o) => getDef(o.item)?.special === 'bay' && o.slot === i)) return bad('Ya hay una bahía en esa plaza');
    const route = bayRoute(i);
    for (const o of others) { const od = getDef(o.item); if (od && od.kind === 'floor' && od.special !== 'bay') { const f = footprint(od, o.x, o.y, o.rot); if (route.some((r) => overlap(f, r, -0.02))) return bad('Hay un objeto en el camino de la bahía'); } }
    return { ok: true, reason: '', x: SLOT_WORLD[i][0], y: SLOT_WORLD[i][1], rot: 0, slot: i };
  }
  if (!insideUnion(fp, playable(save))) return bad('Fuera de tu terreno');
  if (BAKED_OBSTACLES.some((b) => overlap(fp, b, -0.02))) return bad('Hay equipo del garaje aquí');
  if (overlap(fp, ENTRY_LANE, -0.02)) return bad('Bloquea la entrada de vehículos');
  if (slotRects(save).some((s) => overlap(fp, s, -0.02))) return bad('Ocupa una plaza de auto');
  for (const o of others) {
    const od = getDef(o.item); if (od?.kind !== 'floor') continue;
    if (od.special === 'bay') { if (o.slot !== undefined && bayRoute(o.slot).some((r) => overlap(fp, r, -0.02))) return bad('Bloquea el camino de una bahía'); continue; }
    if (overlap(fp, footprint(od, o.x, o.y, o.rot), 0.04)) return bad('Choca con otro objeto');
  }
  return { ok: true, reason: '', x, y, rot };
}

/** Ajuste a cuadrícula invisible (0.25 m). */
export const snapGrid = (v: number, on: boolean) => (on ? Math.round(v / 0.25) * 0.25 : v);
