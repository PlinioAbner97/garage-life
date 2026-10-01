import { hashString, mulberry32, pick } from '../core/rng';
import { VEHICLES } from './vehicles';

export type Condition = 'excellent' | 'good' | 'fair' | 'needs_repair';
export const CONDITION_LABEL: Record<Condition, string> = {
  excellent: 'Excelente', good: 'Buena', fair: 'Regular', needs_repair: 'Necesita reparación',
};
export const CONDITION_MULT: Record<Condition, number> = { excellent: 0.95, good: 0.8, fair: 0.65, needs_repair: 0.45 };
const CONDITIONS: Condition[] = ['excellent', 'good', 'fair', 'needs_repair'];

export interface UsedListing { id: string; weekKey: string; modelId: string; condition: Condition; price: number }

// Genera el inventario del mercado usado de forma determinista a partir de la semana actual:
// misma lista si el jugador recarga la página en la misma semana, distinta la semana siguiente.
export function generateUsedListings(weekKey: string, count = 4): UsedListing[] {
  const rand = mulberry32(hashString('used:' + weekKey));
  const listings: UsedListing[] = [];
  for (let i = 0; i < count; i++) {
    const model = pick(rand, VEHICLES);
    const condition = pick(rand, CONDITIONS);
    const price = Math.round(Math.max(model.price, 800) * CONDITION_MULT[condition]);
    listings.push({ id: `used-${weekKey}-${i}`, weekKey, modelId: model.id, condition, price });
  }
  return listings;
}
