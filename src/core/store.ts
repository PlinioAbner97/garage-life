import { useSyncExternalStore } from 'react';
import { xpForPurchase, WORK_REWARD } from './economy';
import { localSave, type SaveRepository } from './save';
import type { CarBuild, GameState } from './types';
import { STOCK_PART_IDS, partById, type PartCategory } from '../data/parts';
import { UPGRADES, upgradeById, type UpgradeCategory } from '../data/upgrades';
import { VEHICLES, vehicleById } from '../data/vehicles';

export const repository: SaveRepository = localSave; // cambiar aquí por Supabase en el futuro
const SAVE_VERSION = 2;

const stockBuild = (): CarBuild => ({
  paint: 'paint-red', rims: 'rims-silver', suspension: 'susp-street',
  front: 'front-stock', skirt: 'skirt-stock', spoiler: 'spoiler-stock', hood: 'hood-stock',
  tint: 'tint-none', stripe: 'stripe-none', exhaust: 'exhaust-stock', engine: 'engine-stock',
  facing: 1,
});

const defaults = (): GameState => ({
  version: SAVE_VERSION, money: 1500, xp: 0, selectedUid: 'car-1',
  cars: [{ uid: 'car-1', modelId: VEHICLES[0].id, build: stockBuild() }],
  ownedPartIds: [...STOCK_PART_IDS],
  ownedUpgradeIds: [],
});

// Migración: si el guardado es de una versión anterior o tiene forma inesperada,
// conserva dinero y XP cuando existan y reinicia el resto de forma segura,
// para no romper el juego con datos de una estructura antigua.
function migrate(raw: unknown): GameState {
  if (raw && typeof raw === 'object' && (raw as GameState).version === SAVE_VERSION) return raw as GameState;
  const legacy = raw as Partial<{ money: number; xp: number }> | null;
  const d = defaults();
  if (legacy && typeof legacy.money === 'number') d.money = Math.max(d.money, legacy.money);
  if (legacy && typeof legacy.xp === 'number') d.xp = legacy.xp;
  return d;
}

export interface PreviewState { uid: string; category: PartCategory; value: string }
let state: GameState = defaults();
let preview: PreviewState | null = null;
const listeners = new Set<() => void>();

export const getState = () => state;
export const getPreview = () => preview;
export const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };
export const useGame = () => useSyncExternalStore(subscribe, getState);
export const usePreview = () => useSyncExternalStore(subscribe, getPreview);

function emit() { listeners.forEach((l) => l()); }
function set(p: Partial<GameState>) { state = { ...state, ...p }; emit(); void repository.save(state); }
export async function hydrate() { const saved = await repository.load(); state = migrate(saved); }

const patchCar = (uid: string, p: Partial<CarBuild>) =>
  state.cars.map((c) => (c.uid === uid ? { ...c, build: { ...c.build, ...p } } : c));

export const level = () => 1 + Math.floor(Math.sqrt(state.xp / 25));
export const activeCar = () => state.cars.find((c) => c.uid === state.selectedUid) ?? state.cars[0];

const tierOf = (cat: UpgradeCategory) =>
  Math.max(0, ...UPGRADES.filter((u) => u.category === cat && state.ownedUpgradeIds.includes(u.id)).map((u) => u.tier));
export const garageCapacity = () =>
  2 + UPGRADES.filter((u) => u.category === 'capacity' && state.ownedUpgradeIds.includes(u.id)).reduce((s, u) => s + u.tier, 0);
export const liftCount = () => 1 + tierOf('lift');
export const lightingTier = () => tierOf('lighting');
export const floorTier = () => tierOf('floor');

export const actions = {
  switchActiveCar: (uid: string) => {
    if (state.cars.some((c) => c.uid === uid)) { state = { ...state, selectedUid: uid }; preview = null; emit(); void repository.save(state); }
  },
  setPreview: (category: PartCategory, value: string | null) => {
    preview = value ? { uid: state.selectedUid, category, value } : null;
    emit();
  },
  toggleFacing: () => set({ cars: patchCar(state.selectedUid, { facing: activeCar().build.facing === 1 ? -1 : 1 }) }),
  equipPart: (category: PartCategory, id: string): string => {
    const part = partById(id);
    if (!part) return 'Pieza no encontrada';
    if (part.price > 0 && !state.ownedPartIds.includes(id)) return 'No posees esta pieza';
    preview = null;
    set({ cars: patchCar(state.selectedUid, { [category]: id } as Partial<CarBuild>) });
    return `${part.name} equipada`;
  },
  setCustomPaint: (hexColor: number) => {
    preview = null;
    set({ cars: patchCar(state.selectedUid, { paint: 'custom:' + hexColor.toString(16).padStart(6, '0') }) });
  },
  buyPart: (id: string): string => {
    const part = partById(id);
    if (!part) return 'Pieza no encontrada';
    if (state.ownedPartIds.includes(id)) return 'Ya tienes esta pieza';
    if (level() < part.unlockLevel) return `Requiere nivel ${part.unlockLevel}`;
    if (state.money < part.price) return 'Dinero insuficiente';
    preview = null;
    const money = state.money - part.price, xp = state.xp + xpForPurchase(part.price);
    set({ money, xp, ownedPartIds: [...state.ownedPartIds, id], cars: patchCar(state.selectedUid, { [part.category]: id } as Partial<CarBuild>) });
    return `Compraste e instalaste ${part.name}`;
  },
  buyVehicle: (modelId: string): string => {
    const m = vehicleById(modelId);
    if (state.cars.some((c) => c.modelId === modelId)) return 'Ya tienes este vehículo';
    if (level() < m.unlockLevel) return `Requiere nivel ${m.unlockLevel}`;
    if (state.cars.length >= garageCapacity()) return 'Necesitas más espacio en el taller';
    if (state.money < m.price) return 'Dinero insuficiente';
    const uid = 'car-' + Date.now().toString(36);
    const money = state.money - m.price, xp = state.xp + xpForPurchase(m.price);
    set({ money, xp, cars: [...state.cars, { uid, modelId, build: stockBuild() }], selectedUid: uid });
    return `${m.brand} ${m.name} se unió a tu colección`;
  },
  buyUpgrade: (id: string): string => {
    const u = upgradeById(id);
    if (!u) return 'Mejora no encontrada';
    if (state.ownedUpgradeIds.includes(id)) return 'Ya tienes esta mejora';
    if (level() < u.unlockLevel) return `Requiere nivel ${u.unlockLevel}`;
    if (state.money < u.price) return 'Dinero insuficiente';
    const money = state.money - u.price, xp = state.xp + xpForPurchase(u.price);
    set({ money, xp, ownedUpgradeIds: [...state.ownedUpgradeIds, id] });
    return `Instalado: ${u.name}`;
  },
  work: () => set({ money: state.money + WORK_REWARD.money, xp: state.xp + WORK_REWARD.xp }),
};
