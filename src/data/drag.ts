// Simulación de arrancones (estilo CSR2): lanzar en la luz verde, cambiar de marcha en la ventana
// verde del tacómetro y usar nitro una vez. Es una función pura de los controles: el jugador y la IA
// usan exactamente el mismo motor. Todo configurable en las constantes de abajo.
export const DRAG_DIST = 402;                       // ¼ de milla (m)
export const GEARS = 5;
const VMAX = [27, 43, 60, 79, 102];                 // velocidad (m/s) a régimen máximo en cada marcha
const GEAR_MUL = [1.38, 1.16, 1.0, 0.86, 0.74];     // la aceleración baja al subir de marcha
export const REDLINE = 1.0;
export const PERFECT: [number, number] = [0.9, 0.995];
export const GOOD: [number, number] = [0.8, 0.9];
export const NITRO_MS = 2200; export const NITRO_MUL = 1.45;
export const FALSE_START_PENALTY = 1.0;             // s
const DRAG_K = 0.0021;

/** Aceleración base (m/s²) según el rendimiento (0-100): más caro = más rápido. */
export const accelOf = (power: number) => -3.9 + 0.166 * power;
const powerband = (r: number) => (r < 0.25 ? 0.55 + r : r < 0.5 ? 0.8 + (r - 0.25) * 0.8 : r < 1 ? 1 : 0.22);

export type ShiftQuality = 'perfect' | 'good' | 'early' | 'late';
export interface DragSim {
  power: number; t: number; x: number; v: number; gear: number; rpm: number;
  launched: boolean; launchAt: number; shiftLeft: number; boostLeft: number; nitroLeft: number; nitroUsed: boolean;
  finished: boolean; time: number; reaction: number; penalty: number; perfects: number; lastShift: ShiftQuality | null;
}
export const newSim = (power: number): DragSim => ({
  power, t: 0, x: 0, v: 0, gear: 1, rpm: 0.28, launched: false, launchAt: 0, shiftLeft: 0, boostLeft: 0, nitroLeft: 0, nitroUsed: false,
  finished: false, time: 0, reaction: 0, penalty: 0, perfects: 0, lastShift: null,
});
/** Lanza (t = segundos desde la luz verde; negativo = salida en falso). */
export function launch(s: DragSim, reactionS: number) {
  if (s.launched) return; s.launched = true; s.reaction = Math.max(0, reactionS); s.launchAt = Math.max(0, reactionS);
  if (reactionS < 0) s.penalty = FALSE_START_PENALTY;
}
/** Cambia de marcha. Devuelve la calidad (o null si no se puede). */
export function shift(s: DragSim): ShiftQuality | null {
  if (!s.launched || s.finished || s.gear >= GEARS || s.shiftLeft > 0) return null;
  const r = s.rpm; let q: ShiftQuality;
  if (r >= REDLINE - 0.005) q = 'late'; else if (r >= PERFECT[0] && r <= PERFECT[1]) q = 'perfect'; else if (r >= GOOD[0]) q = 'good'; else q = 'early';
  s.shiftLeft = q === 'perfect' ? 0.07 : q === 'good' ? 0.14 : q === 'early' ? 0.22 : 0.18;
  if (q === 'perfect') { s.boostLeft = 1.4; s.perfects++; }
  s.gear++; s.rpm = (s.v / VMAX[s.gear - 1]); s.lastShift = q;
  return q;
}
export function nitro(s: DragSim): boolean { if (!s.launched || s.nitroUsed || s.finished) return false; s.nitroUsed = true; s.nitroLeft = NITRO_MS / 1000; return true; }
export function step(s: DragSim, dt: number) {
  if (s.finished) return;
  s.t += dt;
  if (!s.launched || s.t < s.launchAt) return;
  let a = 0;
  if (s.shiftLeft > 0) s.shiftLeft = Math.max(0, s.shiftLeft - dt);
  else {
    a = accelOf(s.power) * GEAR_MUL[s.gear - 1] * powerband(s.rpm);
    if (s.boostLeft > 0) a *= 1.06;
    if (s.nitroLeft > 0) a *= NITRO_MUL;
  }
  if (s.boostLeft > 0) s.boostLeft -= dt;
  if (s.nitroLeft > 0) s.nitroLeft -= dt;
  a -= DRAG_K * s.v * s.v;
  if (s.v < 1.5 && a < 0.5) a = 0.5;
  const px = s.x; s.v = Math.max(0, s.v + a * dt); s.x += s.v * dt;
  s.rpm = Math.min(REDLINE + 0.02, s.v / VMAX[s.gear - 1]);
  if (s.x >= DRAG_DIST) { const f = (DRAG_DIST - px) / Math.max(1e-6, s.x - px); s.time = s.t - dt + dt * f + s.penalty; s.x = DRAG_DIST; s.finished = true; }
}

export interface Driver { reaction: number; shiftAt: number[]; nitroAt: number }
/** Piloto de IA: reacción y régimen de cambio con error según su habilidad (0 = perfecto). */
export function makeDriver(skillErr: number, rnd: () => number = Math.random): Driver {
  const g = () => (rnd() + rnd() + rnd() - 1.5) / 1.5;
  return { reaction: Math.max(0.1, 0.19 + g() * skillErr * 2.2), shiftAt: Array.from({ length: GEARS - 1 }, () => 0.945 + g() * skillErr), nitroAt: 2.5 + rnd() * 3 };
}
export interface Run { time: number; dt: number; xs: Float32Array; vs: Float32Array; gears: Uint8Array; rpms: Float32Array; nitro: Uint8Array; reaction: number }
/** Corre toda la carrera de un piloto simulado y guarda la pista para poder reproducirla. */
export function runDriver(power: number, d: Driver, dt = 1 / 60): Run {
  const s = newSim(power); const xs: number[] = [], vs: number[] = [], gs: number[] = [], rs: number[] = [], ns: number[] = [];
  launch(s, d.reaction);
  while (!s.finished && s.t < 40) {
    if (s.t >= d.nitroAt) nitro(s);
    if (s.gear < GEARS && s.rpm >= d.shiftAt[s.gear - 1]) shift(s);
    step(s, dt); xs.push(s.x); vs.push(s.v); gs.push(s.gear); rs.push(s.rpm); ns.push(s.nitroLeft > 0 ? 1 : 0);
  }
  return { time: s.time, dt, xs: Float32Array.from(xs), vs: Float32Array.from(vs), gears: Uint8Array.from(gs), rpms: Float32Array.from(rs), nitro: Uint8Array.from(ns), reaction: d.reaction };
}
export const sample = (a: Float32Array, t: number, dt: number) => { const i = Math.min(a.length - 1, Math.max(0, Math.floor(t / dt))); return a[i] ?? 0; };
