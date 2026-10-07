export const START_MONEY = 1500;
export const SLOT_COUNT = 5;
/** Slots en coordenadas de mundo de Blender (x, y). Cada slot es una plaza entre las líneas amarillas. */
export const SLOT_WORLD: [number, number][] = [[-8, 0], [-4, 0], [0, 0], [4, 0], [8, 0]];
export const SLOT_UNLOCK_COST = [0, 0, 2500, 7500, 20000];
export const SELL_RATIO = 0.5;
export const xpForLevel = (level: number) => Math.round(80 * Math.pow(level, 1.5));
