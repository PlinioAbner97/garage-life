import { useSyncExternalStore } from 'react';
import { MODELS, PAINTS, RIMS } from '../data/catalog';
import { WORK_REWARD, xpForPurchase } from './economy';
import { localSave, type SaveRepository } from './save';
import type { GameState } from './types';

export const repository: SaveRepository = localSave; // cambiar aquí por Supabase en el futuro

const defaults = (): GameState => ({
  money: 1000, xp: 0, selectedUid: null,
  cars: [{ uid: 'car-1', modelId: MODELS[0].id, paint: PAINTS[0].color, rims: RIMS[0].color }],
  ownedPaints: [PAINTS[0].color, PAINTS[1].color],
  ownedRims: [RIMS[0].color, RIMS[1].color],
});

let state: GameState = defaults();
const listeners = new Set<() => void>();
export const getState = () => state;
export const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };
export const useGame = () => useSyncExternalStore(subscribe, getState);

function set(p: Partial<GameState>) {
  state = { ...state, ...p };
  listeners.forEach((l) => l());
  void repository.save(state);
}
export async function hydrate() {
  const saved = await repository.load();
  if (saved) state = { ...defaults(), ...saved };
}
const patchCar = (uid: string, p: Partial<GameState['cars'][number]>) =>
  state.cars.map((c) => (c.uid === uid ? { ...c, ...p } : c));

export type ShopKind = 'paint' | 'rims' | 'car';

export const actions = {
  select: (uid: string | null) => set({ selectedUid: uid }),
  setPaint: (color: number) => {
    if (state.selectedUid && state.ownedPaints.includes(color)) set({ cars: patchCar(state.selectedUid, { paint: color }) });
  },
  setRims: (color: number) => {
    if (state.selectedUid && state.ownedRims.includes(color)) set({ cars: patchCar(state.selectedUid, { rims: color }) });
  },
  work: () => set({ money: state.money + WORK_REWARD.money, xp: state.xp + WORK_REWARD.xp }),
  reset: () => set(defaults()),
  buy: (kind: ShopKind, key: string): string => {
    let price = 0, owned = false, name = '';
    if (kind === 'car') {
      const m = MODELS.find((x) => x.id === key);
      if (!m) return 'Artículo no encontrado';
      price = m.price; name = m.name; owned = state.cars.some((c) => c.modelId === key);
    } else {
      const s = (kind === 'paint' ? PAINTS : RIMS).find((x) => String(x.color) === key);
      if (!s) return 'Artículo no encontrado';
      price = s.price; name = s.name;
      owned = (kind === 'paint' ? state.ownedPaints : state.ownedRims).includes(s.color);
    }
    if (owned) return 'Ya lo tienes';
    if (state.money < price) return 'Dinero insuficiente';
    const money = state.money - price, xp = state.xp + xpForPurchase(price);
    if (kind === 'car') {
      set({ money, xp, cars: [...state.cars, { uid: 'car-' + Date.now().toString(36), modelId: key, paint: state.ownedPaints[0], rims: state.ownedRims[0] }] });
    } else if (kind === 'paint') set({ money, xp, ownedPaints: [...state.ownedPaints, Number(key)] });
    else set({ money, xp, ownedRims: [...state.ownedRims, Number(key)] });
    return `Compraste ${name}`;
  },
};
