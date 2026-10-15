// Carreras: duelos simulados contra la IA o contra el mejor auto del garaje de un amigo.
// Todo es configurable aquí. El resultado se calcula al empezar y se guarda: recargar no lo cambia.
import { getModel } from './vehicles';

export const RACE_CD_MS = 180000;      // enfriamiento por auto
export const RACE_COUNTDOWN_MS = 3000; // cuenta atrás antes de arrancar
export const RACE_NOISE = 0.1;         // azar: ±10 % en el tiempo
export const LOSS_XP_RATIO = 0.25;     // XP de consolación al perder

/** Rendimiento de un auto (0-100) a partir de sus stats. */
export const perf = (model: string) => { const s = getModel(model).stats; return 0.5 * s.potencia + 0.35 * s.agarre + 0.15 * s.estilo; };
/** Tiempo base (s) de la pista corta para un rendimiento dado. */
export const baseTime = (p: number) => 8 * Math.pow(80 / p, 1.2);

export interface RaceOpp {
  kind: 'ai' | 'friend'; name: string; model: string; paint: string; rim: string;
  /** multiplicador de rendimiento del rival (IA); 1 para amigos */
  mul: number; fee: number; prize: number; xp: number; tier?: string;
}
export interface RaceTier { id: string; name: string; icon: string; minLevel: number; fee: number; prize: number; xp: number; opp: { name: string; model: string; paint: string; mul: number } }
export const RACE_TIERS: RaceTier[] = [
  { id: 'street', name: 'Callejera', icon: '🌙', minLevel: 1, fee: 100, prize: 300, xp: 40, opp: { name: 'Rival callejero', model: 'falcon-gt', paint: 'black', mul: 0.9 } },
  { id: 'amateur', name: 'Amateur', icon: '🏁', minLevel: 3, fee: 400, prize: 1100, xp: 100, opp: { name: 'Piloto amateur', model: 'kobalt-22', paint: 'blue', mul: 0.95 } },
  { id: 'pro', name: 'Profesional', icon: '🏆', minLevel: 5, fee: 1200, prize: 3400, xp: 220, opp: { name: 'Piloto pro', model: 'akane-rs', paint: 'red', mul: 1 } },
  { id: 'elite', name: 'Élite', icon: '👑', minLevel: 7, fee: 3000, prize: 9000, xp: 450, opp: { name: 'Campeón', model: 'nami-34', paint: 'white', mul: 1 } },
];
export const FRIEND_MIN_LEVEL = 2;
export const aiOpp = (t: RaceTier): RaceOpp => ({ kind: 'ai', tier: t.id, name: t.opp.name, model: t.opp.model, paint: t.opp.paint, rim: 'stock', mul: t.opp.mul, fee: t.fee, prize: t.prize, xp: t.xp });
/** Duelo con un amigo: premio según el rendimiento de su auto. */
export const friendOpp = (username: string, c: { model: string; paint: string; rim: string }): RaceOpp => {
  const p = perf(c.model);
  return { kind: 'friend', name: username, model: c.model, paint: c.paint, rim: c.rim, mul: 1, fee: Math.round(p * 3), prize: Math.round(p * 15), xp: Math.round(p * 1.2) };
};
export const bestCar = <T extends { model: string }>(cars: T[]): T | undefined => [...cars].sort((a, b) => perf(b.model) - perf(a.model))[0];

export interface RaceState {
  id: number; carId: string; model: string; paint: string; rim: string; opp: RaceOpp;
  myT: number; oppT: number; startedAt: number; win: boolean;
}
export const raceEndsAt = (r: RaceState) => r.startedAt + RACE_COUNTDOWN_MS + Math.max(r.myT, r.oppT) * 1000;
/** Resuelve la carrera (se llama una sola vez al empezar). */
export function simulate(myModel: string, opp: RaceOpp, rnd: () => number = Math.random): { myT: number; oppT: number; win: boolean } {
  const n = () => 1 + (rnd() * 2 - 1) * RACE_NOISE;
  const myT = baseTime(perf(myModel)) * n(), oppT = baseTime(perf(opp.model) * opp.mul) * n();
  return { myT, oppT, win: myT < oppT };
}
/** Odds orientativas (Monte Carlo corto, determinista) para mostrar en la UI. */
export function winChance(myModel: string, opp: RaceOpp): number {
  let s = 12345; const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  let w = 0; const N = 400; for (let i = 0; i < N; i++) if (simulate(myModel, opp, rnd).win) w++;
  return w / N;
}
