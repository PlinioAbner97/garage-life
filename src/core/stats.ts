import { partById } from '../data/parts';
import type { VehicleModel } from '../data/vehicles';
import type { CarBuild } from './types';

export function carStats(model: VehicleModel, build: CarBuild) {
  const engine = partById(build.engine);
  const susp = partById(build.suspension);
  return {
    power: model.basePower + (engine?.powerBoost ?? 0),
    handling: model.baseHandling + (susp?.handlingBoost ?? 0),
    weight: model.weight,
  };
}

export function carValue(model: VehicleModel, build: CarBuild): number {
  const ids = [build.rims, build.suspension, build.front, build.skirt, build.spoiler, build.hood, build.tint, build.stripe, build.exhaust, build.engine];
  const partsValue = ids.reduce((sum, id) => sum + (partById(id)?.price ?? 0), 0);
  return model.price + partsValue;
}

export function modLevel(build: CarBuild): { count: number; total: number } {
  const stock: Partial<Record<keyof CarBuild, string>> = {
    rims: 'rims-silver', suspension: 'susp-street', front: 'front-stock', skirt: 'skirt-stock',
    spoiler: 'spoiler-stock', hood: 'hood-stock', tint: 'tint-none', stripe: 'stripe-none',
    exhaust: 'exhaust-stock', engine: 'engine-stock',
  };
  const entries = Object.entries(stock) as [keyof CarBuild, string][];
  let count = entries.filter(([k, v]) => build[k] !== v).length;
  if (build.paint !== 'paint-red' && build.paint !== 'paint-white') count++;
  return { count, total: entries.length + 1 };
}

// Puntaje real para los encuentros automotrices: combina el valor de mercado del auto,
// sus estadísticas y su nivel de modificación real (no una recompensa fija/decorativa).
export function exhibitionScore(model: VehicleModel, build: CarBuild): number {
  const stats = carStats(model, build);
  const value = carValue(model, build);
  const mods = modLevel(build);
  return Math.round(value + stats.power * 2 + stats.handling * 2 + mods.count * 50);
}
