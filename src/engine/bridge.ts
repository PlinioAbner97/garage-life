import type { GarageScene } from './GarageScene';
/** Puente mínimo UI -> escena (cámara). El estado del juego NO pasa por aquí: vive en core/store. */
export const bridge: { scene: GarageScene | null } = { scene: null };
