/**
 * Concesionario: zona aparte con su propia cámara (render de Blender `dealer_bg`, cámara GL_DEALER_CAMERA_V9, 1920x1080).
 * Los autos que se muestran son SIEMPRE los de `VEHICLES` (nunca los de referencia del .blend), uno por plaza, en orden.
 * Para añadir un auto nuevo al juego basta con añadirlo a vehicles.ts: ocupará la siguiente plaza libre.
 */
export const DEALER_SIZE: [number, number] = [1920, 1080];
/** Proyección de la cámara del concesionario (misma convención que PROJ del garaje: metros -> px del render). */
export const DEALER_PROJ = { origin: [976.6, 540.7], x: [24.18, 6.37], y: [17.98, -8.56], z: [0, -28.18] };
/** Escala de los sprites de autos respecto al garaje (la cámara del concesionario abarca más terreno). */
export const DEALER_CAR_SCALE = 0.39;
/** Centro (metros) de cada plaza de exhibición (GL_DEALER_SLOT_01..10_CAR_ANCHOR). Se llenan en este orden. */
export const DEALER_SLOTS: [number, number][] = [
  [-23, -13], [-13, -13], [-3, -13], [7, -13], [17, -13],
  [-23, -1], [-13, -1], [-3, -1], [7, -1], [17, -1],
];
/** Media dimensión de la plaza (m) para dibujar el resaltado. */
export const DEALER_PAD_HALF: [number, number] = [3.95, 4.6];
export const dealerProject = (x: number, y: number, z = 0): [number, number] => [
  DEALER_PROJ.origin[0] + x * DEALER_PROJ.x[0] + y * DEALER_PROJ.y[0] + z * DEALER_PROJ.z[0],
  DEALER_PROJ.origin[1] + x * DEALER_PROJ.x[1] + y * DEALER_PROJ.y[1] + z * DEALER_PROJ.z[1],
];
