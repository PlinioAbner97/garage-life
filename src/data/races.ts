// Carreras: duelos simulados contra la IA o contra el mejor auto del garaje de un amigo.
// Todo es configurable aquí. El resultado se calcula al empezar y se guarda: recargar no lo cambia.
import { makeDriver, runDriver } from './drag';

export const RACE_CD_MS = 60000;       // enfriamiento por auto
export const LOSS_XP_RATIO = 0.25;     // XP de consolación al perder

/** Rendimiento de arranque (0-100): sube con el precio del auto. Ver accelOf() en drag.ts. */
export const RACE_POWER: Record<string, number> = { 'falcon-gt': 56, 'kobalt-22': 68, 'akane-rs': 80, 'nami-34': 91, 'shirogane-x': 100 };
export const perf = (model: string) => RACE_POWER[model] ?? 50;
/** Error de habilidad de la IA por categoría (menor = más preciso). */
export const SKILL: Record<string, number> = { street: 0.05, amateur: 0.035, pro: 0.022, elite: 0.012, friend: 0.03 };

export interface RaceOpp {
  kind: 'ai' | 'friend'; name: string; model: string; paint: string; rim: string;
  /** multiplicador de rendimiento del rival (IA); 1 para amigos */
  mul: number; fee: number; prize: number; xp: number; tier?: string;
}
export interface RaceTier { id: string; name: string; icon: string; minLevel: number; fee: number; prize: number; xp: number; opp: { name: string; model: string; paint: string; mul: number } }
export const RACE_TIERS: RaceTier[] = [
  { id: 'street', name: 'Callejera', icon: '🌙', minLevel: 1, fee: 100, prize: 400, xp: 40, opp: { name: 'Rival callejero', model: 'falcon-gt', paint: 'black', mul: 0.9 } },
  { id: 'amateur', name: 'Amateur', icon: '🏁', minLevel: 3, fee: 800, prize: 2800, xp: 150, opp: { name: 'Piloto amateur', model: 'kobalt-22', paint: 'blue', mul: 0.95 } },
  { id: 'pro', name: 'Profesional', icon: '🏆', minLevel: 5, fee: 2500, prize: 6500, xp: 350, opp: { name: 'Piloto pro', model: 'akane-rs', paint: 'red', mul: 1 } },
  { id: 'elite', name: 'Élite', icon: '👑', minLevel: 7, fee: 5000, prize: 11000, xp: 600, opp: { name: 'Campeón', model: 'nami-34', paint: 'white', mul: 1 } },
];
export const FRIEND_MIN_LEVEL = 2;
export const aiOpp = (t: RaceTier): RaceOpp => ({ kind: 'ai', tier: t.id, name: t.opp.name, model: t.opp.model, paint: t.opp.paint, rim: 'stock', mul: t.opp.mul, fee: t.fee, prize: t.prize, xp: t.xp });
/** Duelo con un amigo: premio según el rendimiento de su auto. */
export const friendOpp = (username: string, c: { model: string; paint: string; rim: string }): RaceOpp => {
  const p = perf(c.model);
  return { kind: 'friend', name: username, model: c.model, paint: c.paint, rim: c.rim, mul: 1, fee: Math.round(p * 3), prize: Math.round(p * 15), xp: Math.round(p * 1.2) };
};
export const bestCar = <T extends { model: string }>(cars: T[]): T | undefined => [...cars].sort((a, b) => perf(b.model) - perf(a.model))[0];

export interface RaceResult { myT: number; oppT: number; win: boolean; reaction: number; perfects: number; forfeit?: boolean }
export interface RaceState { id: number; carId: string; model: string; paint: string; rim: string; opp: RaceOpp; startedAt: number; result?: RaceResult }

/** Probabilidad orientativa de ganar contra un rival, suponiendo un jugador promedio (error ~0.05). Determinista. */
const cache = new Map<string, number>();
export function winChance(myModel: string, opp: RaceOpp): number {
  const key = `${myModel}|${opp.model}|${opp.mul}|${opp.tier ?? 'friend'}`; const hit = cache.get(key); if (hit !== undefined) return hit;
  let st = 987654321; const rnd = () => ((st = (st * 1664525 + 1013904223) >>> 0) / 4294967296);
  let w = 0; const N = 80;
  for (let i = 0; i < N; i++) {
    const me = runDriver(perf(myModel), makeDriver(0.05, rnd), 1 / 30), ai = runDriver(perf(opp.model) * opp.mul, makeDriver(SKILL[opp.tier ?? 'friend'], rnd), 1 / 30);
    if (me.time < ai.time) w++;
  }
  const r = w / N; cache.set(key, r); return r;
}
