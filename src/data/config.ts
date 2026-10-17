export const START_MONEY = 1500;
export const SLOT_COUNT = 5;
/** El garaje original se mudó al fondo del lote, pegado a la pared trasera y centrado (x 0, y +14 m desde su posición en Blender). */
export const GARAGE_OFFSET: [number, number] = [0, 14];
const GARAGE_SLOTS: [number, number][] = [[-8, 0], [-4, 0], [0, 0], [4, 0], [8, 0]].map(([x, y]) => [x + GARAGE_OFFSET[0], y + GARAGE_OFFSET[1]] as [number, number]);
export const SLOT_UNLOCK_COST = [0, 0, 3000, 10000, 30000];
export const SELL_RATIO = 0.5;
export const xpForLevel = (level: number) => Math.round(80 * Math.pow(level, 1.5));

// ---------------------------------------------------------------------------------------------
// Expansiones del lote (GL_CARTOWN_GARAGE_V8). El lote mide 48 × 42 m (x ±24, y ±21); el garaje original (24 × 14 m)
// está pegado a la pared del fondo (y 7..21) y la entrada de vehículos queda al frente (y -21). Coordenadas = mundo de Blender, en metros.
// Para añadir una zona: una entrada aquí (la escena, la tienda y el guardado la recogen solos).
// ---------------------------------------------------------------------------------------------
export interface ZoneDef {
  id: string; name: string; desc: string;
  /** rectángulo [x0, y0, x1, y1] en metros */
  rect: [number, number, number, number];
  /** costo en GarageCoins y nivel mínimo */
  cost: number; minLevel: number;
  /** zona que debe estar comprada antes (para que las nuevas áreas se conecten con las anteriores) */
  requires?: string;
  /** plazas de auto que añade (x, y de cada una) */
  slots: [number, number][];
}
const row = (cx: number, y: number): [number, number][] => [-8, -4, 0, 4, 8].map((dx) => [cx + dx, y]);
export const ZONES: ZoneDef[] = [
  { id: 'patio-derecho', name: 'Patio derecho', desc: 'El terreno frente al garaje, lado derecho. 5 plazas más.',
    rect: [0, -7, 24, 7], cost: 15000, minLevel: 5, slots: row(12, 0) },
  { id: 'patio-izquierdo', name: 'Patio izquierdo', desc: 'El terreno frente al garaje, lado izquierdo. 5 plazas más.',
    rect: [-24, -7, 0, 7], cost: 22000, minLevel: 6, slots: row(-12, 0) },
  { id: 'flanco-derecho', name: 'Flanco derecho', desc: 'Espacio junto al garaje, a la derecha. 2 plazas más.',
    rect: [12, 7, 24, 21], cost: 35000, minLevel: 8, requires: 'patio-derecho', slots: [[16, 14], [20, 14]] },
  { id: 'flanco-izquierdo', name: 'Flanco izquierdo', desc: 'Espacio junto al garaje, a la izquierda (ya sin muro). 2 plazas más.',
    rect: [-24, 7, -12, 21], cost: 35000, minLevel: 8, requires: 'patio-izquierdo', slots: [[-16, 14], [-20, 14]] },
  { id: 'frente-derecho', name: 'Frente derecho', desc: 'La explanada hasta la calle, lado derecho. 5 plazas más.',
    rect: [0, -21, 24, -7], cost: 60000, minLevel: 10, requires: 'patio-derecho', slots: row(12, -14) },
  { id: 'frente-izquierdo', name: 'Frente izquierdo', desc: 'La explanada hasta la calle, lado izquierdo. 5 plazas más.',
    rect: [-24, -21, 0, -7], cost: 60000, minLevel: 10, requires: 'patio-izquierdo', slots: row(-12, -14) },
];
/** Áreas del lote aún sin uso (ninguna por ahora; el garaje ya no tiene muros laterales que las bloqueen). */
export const FUTURE_ZONES: { id: string; name: string; rect: [number, number, number, number]; note: string }[] = [];
/** Todas las plazas: primero las del garaje original, luego las de cada zona en el orden de ZONES. */
export const SLOT_WORLD: [number, number][] = [...GARAGE_SLOTS, ...ZONES.flatMap((z) => z.slots)];
export const TOTAL_SLOTS = SLOT_WORLD.length;
export const SLOT_HALF: [number, number] = [1.7, 3.3];
export const getZone = (id: string) => ZONES.find((z) => z.id === id)!;
/** Zona a la que pertenece una plaza (las del garaje original no tienen zona). */
export const zoneOfSlot = (i: number): ZoneDef | undefined => {
  let n = GARAGE_SLOTS.length;
  for (const z of ZONES) { if (i >= n && i < n + z.slots.length) return z; n += z.slots.length; }
  return undefined;
};
