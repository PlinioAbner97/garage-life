import { useSyncExternalStore } from 'react';
import { xpForPurchase, WORK_REWARD } from './economy';
import { todayKey, weekKey } from './dates';
import { generateOffer, jobSatisfaction as jobSatisfactionCalc, jobProgress as jobProgressCalc, offerToActiveJob, finalizeJob } from './jobs';
import { exhibitionScore } from './stats';
import { localSave, type SaveRepository } from './save';
import type { ActiveJob, CarBuild, CounterType, GameState, JobTask, RaceRegistration, TaskQuality } from './types';
import { UPGRADES, upgradeById, type UpgradeCategory } from '../data/upgrades';
import { STOCK_PART_IDS, partById, type PartCategory } from '../data/parts';
import { taskById } from '../data/taskCatalog';
import { DAILY_MISSIONS, WEEKLY_MISSIONS, missionById } from '../data/missions';
import { VEHICLES, vehicleById } from '../data/vehicles';
import { zoneById } from '../data/zones';
import { generateUsedListings } from '../data/usedMarket';
import { raceById, meetupById } from '../data/racing';

export { jobProgressCalc as jobProgress, jobSatisfactionCalc as jobSatisfaction };

export const repository: SaveRepository = localSave; // cambiar aquí por Supabase en el futuro
const SAVE_VERSION = 4;
const MAX_OFFERS = 3;

const stockBuild = (): CarBuild => ({
  paint: 'paint-red', rims: 'rims-silver', suspension: 'susp-street',
  front: 'front-stock', skirt: 'skirt-stock', spoiler: 'spoiler-stock', hood: 'hood-stock',
  tint: 'tint-none', stripe: 'stripe-none', exhaust: 'exhaust-stock', engine: 'engine-stock',
  facing: 1,
});

const zeroCounters = (): Record<CounterType, number> => ({
  repairs_completed: 0, mods_installed: 0, money_earned: 0, clients_served: 0,
  jobs_completed: 0, special_clients_served: 0, restorations_completed: 0,
  zones_visited: 0, zones_unlocked: 0, vehicles_bought: 0, parts_bought: 0,
  events_attended: 0, race_registrations: 0,
});

const defaults = (): GameState => {
  const wk = weekKey();
  return {
    version: SAVE_VERSION, money: 1500, xp: 0, reputation: 0, selectedUid: 'car-1',
    cars: [{ uid: 'car-1', modelId: VEHICLES[0].id, build: stockBuild() }],
    ownedPartIds: [...STOCK_PART_IDS],
    ownedUpgradeIds: [],
    offers: [], activeJobs: [], jobHistory: [],
    dailyKey: todayKey(), weeklyKey: wk,
    dailyCounters: zeroCounters(), weeklyCounters: zeroCounters(),
    dailyClaimed: [], weeklyClaimed: [],
    unlockedZoneIds: [], visitedZoneIds: [],
    usedMarketWeekKey: wk, usedMarketListings: generateUsedListings(wk), usedMarketPurchasedIds: [],
    raceRegistrations: [], meetupLastAttended: {},
  };
};

// Migración: conserva todo lo reconocible de un guardado anterior (v2 con talleres/vehículos/piezas)
// y solo completa con valores por defecto los campos nuevos de clientes/misiones.
// Si el guardado es de una versión muy antigua o corrupta, conserva dinero/XP y reinicia el resto.
function migrate(raw: unknown): GameState {
  const d = defaults();
  if (!raw || typeof raw !== 'object') return d;
  const r = raw as Partial<GameState> & Record<string, unknown>;
  if (typeof r.version !== 'number' || r.version < 2) {
    if (typeof r.money === 'number') d.money = Math.max(d.money, r.money);
    if (typeof r.xp === 'number') d.xp = r.xp;
    return d;
  }
  return {
    ...d,
    ...r,
    version: SAVE_VERSION,
    money: Number.isFinite(r.money) ? Math.max(0, r.money as number) : d.money,
    xp: Number.isFinite(r.xp) ? Math.max(0, r.xp as number) : d.xp,
    reputation: Number.isFinite(r.reputation) ? Math.max(0, r.reputation as number) : d.reputation,
    cars: Array.isArray(r.cars) && r.cars.length ? r.cars : d.cars,
    selectedUid: typeof r.selectedUid === 'string' ? r.selectedUid : d.selectedUid,
    ownedPartIds: Array.isArray(r.ownedPartIds) ? r.ownedPartIds : d.ownedPartIds,
    ownedUpgradeIds: Array.isArray(r.ownedUpgradeIds) ? r.ownedUpgradeIds : d.ownedUpgradeIds,
    offers: Array.isArray(r.offers) ? r.offers : d.offers,
    activeJobs: Array.isArray(r.activeJobs) ? r.activeJobs : d.activeJobs,
    jobHistory: Array.isArray(r.jobHistory) ? r.jobHistory : d.jobHistory,
    dailyKey: typeof r.dailyKey === 'string' ? r.dailyKey : d.dailyKey,
    weeklyKey: typeof r.weeklyKey === 'string' ? r.weeklyKey : d.weeklyKey,
    dailyCounters: { ...d.dailyCounters, ...(r.dailyCounters ?? {}) },
    weeklyCounters: { ...d.weeklyCounters, ...(r.weeklyCounters ?? {}) },
    dailyClaimed: Array.isArray(r.dailyClaimed) ? r.dailyClaimed : d.dailyClaimed,
    weeklyClaimed: Array.isArray(r.weeklyClaimed) ? r.weeklyClaimed : d.weeklyClaimed,
    unlockedZoneIds: Array.isArray(r.unlockedZoneIds) ? r.unlockedZoneIds : d.unlockedZoneIds,
    visitedZoneIds: Array.isArray(r.visitedZoneIds) ? r.visitedZoneIds : d.visitedZoneIds,
    usedMarketWeekKey: typeof r.usedMarketWeekKey === 'string' ? r.usedMarketWeekKey : d.usedMarketWeekKey,
    usedMarketListings: Array.isArray(r.usedMarketListings) ? r.usedMarketListings : d.usedMarketListings,
    usedMarketPurchasedIds: Array.isArray(r.usedMarketPurchasedIds) ? r.usedMarketPurchasedIds : d.usedMarketPurchasedIds,
    raceRegistrations: Array.isArray(r.raceRegistrations) ? r.raceRegistrations : d.raceRegistrations,
    meetupLastAttended: r.meetupLastAttended ?? d.meetupLastAttended,
  };
}

let state: GameState = defaults();
let preview: { uid: string; category: PartCategory; value: string } | null = null;
let focusedJobId: string | null = null;
let currentScene: 'garage' | 'city' = 'garage';
const listeners = new Set<() => void>();

export const getState = () => state;
export const getPreview = () => preview;
export const getFocusedJobId = () => focusedJobId;
export const getCurrentScene = () => currentScene;
export const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };
export const useGame = () => useSyncExternalStore(subscribe, getState);
export const usePreview = () => useSyncExternalStore(subscribe, getPreview);
export const useFocusedJobId = () => useSyncExternalStore(subscribe, getFocusedJobId);
export const useCurrentScene = () => useSyncExternalStore(subscribe, getCurrentScene);

function emit() { listeners.forEach((l) => l()); }
function set(p: Partial<GameState>) { state = { ...state, ...p }; emit(); void repository.save(state); }

// Reinicia contadores/reclamos diarios y semanales, y rota el mercado usado,
// si cambió la fecha real del dispositivo (no la sesión del navegador).
function ensurePeriods() {
  const td = todayKey(), wk = weekKey();
  const patch: Partial<GameState> = {};
  if (state.dailyKey !== td) { patch.dailyKey = td; patch.dailyCounters = zeroCounters(); patch.dailyClaimed = []; }
  if (state.weeklyKey !== wk) {
    patch.weeklyKey = wk; patch.weeklyCounters = zeroCounters(); patch.weeklyClaimed = [];
  }
  if (state.usedMarketWeekKey !== wk) {
    patch.usedMarketWeekKey = wk;
    patch.usedMarketListings = generateUsedListings(wk);
    patch.usedMarketPurchasedIds = []; // los autos ya comprados quedan en la colección del jugador, no aquí
  }
  if (Object.keys(patch).length) set(patch);
}

export async function hydrate() { const saved = await repository.load(); state = migrate(saved); ensurePeriods(); }

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

export interface DisplayVehicle { modelId: string; build: CarBuild; isJob: boolean; jobId: string | null; uid: string }
export function getDisplayVehicle(): DisplayVehicle {
  if (focusedJobId) {
    const job = state.activeJobs.find((j) => j.id === focusedJobId);
    if (job) return { modelId: job.vehicleModelId, build: job.carBuild, isJob: true, jobId: job.id, uid: job.id };
  }
  const car = activeCar();
  return { modelId: car.modelId, build: car.build, isJob: false, jobId: null, uid: car.uid };
}

function bumpCounters(patch: Partial<Record<CounterType, number>>) {
  const daily = { ...state.dailyCounters }, weekly = { ...state.weeklyCounters };
  (Object.keys(patch) as CounterType[]).forEach((k) => {
    const v = patch[k] ?? 0;
    daily[k] = (daily[k] ?? 0) + v;
    weekly[k] = (weekly[k] ?? 0) + v;
  });
  return { dailyCounters: daily, weeklyCounters: weekly };
}

export const actions = {
  // --- Vehículos, piezas y taller (sistemas existentes, sin cambios de comportamiento) ---
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
    set({ money, xp, ownedPartIds: [...state.ownedPartIds, id], cars: patchCar(state.selectedUid, { [part.category]: id } as Partial<CarBuild>), ...bumpCounters({ parts_bought: 1 }) });
    return `Compraste e instalaste ${part.name}`;
  },
  // Comprar una pieza SIN equiparla automáticamente (tienda de piezas de la ciudad):
  // queda disponible en el inventario para equiparla luego desde cualquier auto.
  buyPartToInventory: (id: string): string => {
    const part = partById(id);
    if (!part) return 'Pieza no encontrada';
    if (state.ownedPartIds.includes(id)) return 'Ya tienes esta pieza';
    if (level() < part.unlockLevel) return `Requiere nivel ${part.unlockLevel}`;
    if (state.money < part.price) return 'Dinero insuficiente';
    const money = state.money - part.price, xp = state.xp + xpForPurchase(part.price);
    set({ money, xp, ownedPartIds: [...state.ownedPartIds, id], ...bumpCounters({ parts_bought: 1 }) });
    return `${part.name} añadida a tu inventario`;
  },
  buyVehicle: (modelId: string): string => {
    const m = vehicleById(modelId);
    if (state.cars.some((c) => c.modelId === modelId)) return 'Ya tienes este vehículo';
    if (level() < m.unlockLevel) return `Requiere nivel ${m.unlockLevel}`;
    if (state.cars.length >= garageCapacity()) return 'Necesitas más espacio en el taller';
    if (state.money < m.price) return 'Dinero insuficiente';
    const uid = 'car-' + Date.now().toString(36);
    const money = state.money - m.price, xp = state.xp + xpForPurchase(m.price);
    set({ money, xp, cars: [...state.cars, { uid, modelId, build: stockBuild() }], selectedUid: uid, ...bumpCounters({ vehicles_bought: 1 }) });
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

  // --- Clientes y órdenes de trabajo ---
  focusJob: (jobId: string | null) => { focusedJobId = jobId; emit(); },

  refreshOffers: (): string => {
    ensurePeriods();
    if (state.offers.length >= MAX_OFFERS) return 'Ya tienes suficientes clientes esperando';
    const toAdd = MAX_OFFERS - state.offers.length;
    const created = [];
    for (let i = 0; i < toAdd; i++) {
      const offer = generateOffer(level(), state.reputation);
      if (offer) created.push(offer);
    }
    if (!created.length) return 'No hay más clientes disponibles por ahora';
    set({ offers: [...state.offers, ...created] });
    return `Llegaron ${created.length} cliente(s) nuevo(s)`;
  },
  rejectOffer: (offerId: string) => set({ offers: state.offers.filter((o) => o.id !== offerId) }),
  acceptOffer: (offerId: string): string => {
    const offer = state.offers.find((o) => o.id === offerId);
    if (!offer) return 'Solicitud no encontrada';
    if (level() < offer.unlockLevel) return `Requiere nivel ${offer.unlockLevel}`;
    if (state.money < offer.materialsCost) return 'No tienes dinero suficiente para los materiales';
    const job = offerToActiveJob(offer);
    set({
      money: state.money - offer.materialsCost,
      offers: state.offers.filter((o) => o.id !== offerId),
      activeJobs: [...state.activeJobs, job],
    });
    return `Aceptaste el trabajo de ${offer.clientName}`;
  },

  startTask: (jobId: string, taskId: string) => {
    const jobs = state.activeJobs.map((j) => {
      if (j.id !== jobId) return j;
      const tasks = j.tasks.map((t) => (t.id === taskId && !t.startAt ? { ...t, startAt: Date.now() } : t));
      return { ...j, tasks };
    });
    set({ activeJobs: jobs });
  },
  chooseTaskPart: (jobId: string, taskId: string, partId: string) => {
    const job = state.activeJobs.find((j) => j.id === jobId);
    const task = job?.tasks.find((t) => t.id === taskId);
    const def = task ? taskById(task.catalogId) : undefined;
    if (!job || !task || !def || !def.partCategory) return;
    const buildPatch: Partial<CarBuild> = { [def.partCategory]: partId, ...(def.bonusFields ?? {}) } as Partial<CarBuild>;
    const jobs = state.activeJobs.map((j) => (j.id !== jobId ? j : {
      ...j,
      carBuild: { ...j.carBuild, ...buildPatch },
      tasks: j.tasks.map((t) => (t.id === taskId ? { ...t, chosenPartId: partId } : t)),
    }));
    set({ activeJobs: jobs });
  },
  finalizeTask: (jobId: string, taskId: string, resultQuality: TaskQuality): string => {
    const job = state.activeJobs.find((j) => j.id === jobId);
    if (!job) return 'Trabajo no encontrado';
    const task = job.tasks.find((t) => t.id === taskId);
    if (!task) return 'Tarea no encontrada';
    if (task.done) return 'Esta tarea ya está terminada';
    if (!task.startAt) return 'Primero inicia la tarea';
    const def = taskById(task.catalogId);
    if (!def) return 'Tarea no encontrada';
    if (def.kind === 'mod' && !task.chosenPartId) return 'Elige qué pieza instalar antes de finalizar';
    const elapsed = (Date.now() - task.startAt) / 1000;
    const quality: TaskQuality = elapsed < def.duration * 0.6 ? (resultQuality === 'perfect' ? 'ok' : resultQuality) : resultQuality;

    const jobs: ActiveJob[] = state.activeJobs.map((j) => {
      if (j.id !== jobId) return j;
      const tasks: JobTask[] = j.tasks.map((t) => (t.id === taskId ? { ...t, done: true, quality } : t));
      const allDone = tasks.every((t) => t.done);
      return { ...j, tasks, status: allDone ? 'ready' : 'active' };
    });

    const counterPatch: Partial<Record<CounterType, number>> = def.kind === 'repair' ? { repairs_completed: 1 } : { mods_installed: 1 };
    set({ activeJobs: jobs, ...bumpCounters(counterPatch) });
    return quality === 'perfect' ? '¡Trabajo perfecto!' : quality === 'ok' ? 'Tarea completada' : 'Tarea completada con errores';
  },
  deliverJob: (jobId: string): string => {
    const job = state.activeJobs.find((j) => j.id === jobId);
    if (!job) return 'Trabajo no encontrado';
    if (job.status !== 'ready') return 'Aún hay tareas pendientes';
    const result = finalizeJob(job);
    const archetype = job.archetypeId;
    const counterPatch: Partial<Record<CounterType, number>> = {
      jobs_completed: 1, money_earned: result.payment, clients_served: 1,
      ...(archetype === 'special' ? { special_clients_served: 1 } : {}),
      ...(archetype === 'collector' ? { restorations_completed: 1 } : {}),
    };
    if (focusedJobId === jobId) focusedJobId = null;
    set({
      money: state.money + result.payment,
      xp: state.xp + result.xp,
      reputation: state.reputation + result.reputation,
      activeJobs: state.activeJobs.filter((j) => j.id !== jobId),
      jobHistory: [result, ...state.jobHistory].slice(0, 30),
      ...bumpCounters(counterPatch),
    });
    return `Entregaste el auto a ${job.clientName}: +$${result.payment}, +${result.xp} XP, +${result.reputation} reputación`;
  },

  // --- Misiones diarias y semanales ---
  checkPeriods: () => ensurePeriods(),
  claimMission: (id: string): string => {
    ensurePeriods();
    const def = missionById(id);
    if (!def) return 'Misión no encontrada';
    const claimed = def.scope === 'daily' ? state.dailyClaimed : state.weeklyClaimed;
    if (claimed.includes(id)) return 'Ya reclamaste esta recompensa';
    const counters = def.scope === 'daily' ? state.dailyCounters : state.weeklyCounters;
    if ((counters[def.type] ?? 0) < def.target) return 'Aún no cumples el objetivo';
    const patch: Partial<GameState> = {
      money: state.money + def.reward.money, xp: state.xp + def.reward.xp, reputation: state.reputation + def.reward.reputation,
    };
    if (def.scope === 'daily') patch.dailyClaimed = [...state.dailyClaimed, id];
    else patch.weeklyClaimed = [...state.weeklyClaimed, id];
    set(patch);
    return `Recompensa reclamada: +$${def.reward.money}, +${def.reward.xp} XP, +${def.reward.reputation} reputación`;
  },

  // --- Ciudad: navegación, zonas, mercado usado, carreras y encuentros ---
  goToScene: (scene: 'garage' | 'city') => { currentScene = scene; emit(); },
  visitZone: (zoneId: string) => {
    if (state.visitedZoneIds.includes(zoneId)) return;
    set({ visitedZoneIds: [...state.visitedZoneIds, zoneId], ...bumpCounters({ zones_visited: 1 }) });
  },
  unlockZone: (zoneId: string): string => {
    const zone = zoneById(zoneId);
    if (!zone) return 'Zona no encontrada';
    if (state.unlockedZoneIds.includes(zoneId)) return 'Esta zona ya está desbloqueada';
    const req = zone.unlock;
    if (req.level && level() < req.level) return `Requiere nivel ${req.level}`;
    if (req.reputation && state.reputation < req.reputation) return `Requiere ${req.reputation} de reputación`;
    if (req.money && state.money < req.money) return `Requiere ${req.money} para la apertura`;
    const patch: Partial<GameState> = { unlockedZoneIds: [...state.unlockedZoneIds, zoneId] };
    if (req.money) patch.money = state.money - req.money;
    set({ ...patch, ...bumpCounters({ zones_unlocked: 1 }) });
    return `${zone.name} desbloqueada`;
  },
  isZoneUnlocked: (zoneId: string): boolean => {
    const zone = zoneById(zoneId);
    if (!zone) return false;
    const req = zone.unlock;
    if (!req.level && !req.reputation && !req.money) return true;
    return state.unlockedZoneIds.includes(zoneId);
  },

  buyUsedListing: (listingId: string): string => {
    const listing = state.usedMarketListings.find((l) => l.id === listingId);
    if (!listing) return 'Este vehículo ya no está disponible (el mercado rotó)';
    if (state.usedMarketPurchasedIds.includes(listingId)) return 'Ya compraste este vehículo';
    const m = vehicleById(listing.modelId);
    if (state.cars.some((c) => c.modelId === listing.modelId)) return 'Ya tienes este modelo en tu colección';
    if (state.cars.length >= garageCapacity()) return 'Necesitas más espacio en el taller';
    if (state.money < listing.price) return 'Dinero insuficiente';
    const uid = 'car-' + Date.now().toString(36);
    const money = state.money - listing.price, xp = state.xp + xpForPurchase(listing.price);
    set({
      money, xp, cars: [...state.cars, { uid, modelId: listing.modelId, build: stockBuild() }], selectedUid: uid,
      usedMarketPurchasedIds: [...state.usedMarketPurchasedIds, listingId],
      ...bumpCounters({ vehicles_bought: 1 }),
    });
    return `Compraste ${m.brand} ${m.name} usado por ${listing.price}`;
  },

  registerRace: (eventId: string, carUid: string): string => {
    const ev = raceById(eventId);
    if (!ev) return 'Evento no encontrado';
    if (level() < ev.unlockLevel) return `Requiere nivel ${ev.unlockLevel}`;
    if (!state.cars.some((c) => c.uid === carUid)) return 'Vehículo no encontrado en tu colección';
    if (state.raceRegistrations.some((r) => r.eventId === eventId && r.carUid === carUid)) return 'Ya estás inscrito con este vehículo';
    if (state.money < ev.entryFee) return 'Dinero insuficiente para la inscripción';
    const reg: RaceRegistration = { id: 'reg-' + Date.now().toString(36), eventId, carUid, registeredAt: Date.now() };
    set({ money: state.money - ev.entryFee, raceRegistrations: [...state.raceRegistrations, reg], ...bumpCounters({ race_registrations: 1 }) });
    return `Inscrito en ${ev.name}. La mecánica de carrera llegará en una próxima actualización.`;
  },
  cancelRaceRegistration: (regId: string) => set({ raceRegistrations: state.raceRegistrations.filter((r) => r.id !== regId) }),

  attendMeetup: (eventId: string, carUid: string): string => {
    ensurePeriods();
    const ev = meetupById(eventId);
    if (!ev) return 'Evento no encontrado';
    if (state.meetupLastAttended[eventId] === state.dailyKey) return 'Ya presentaste un auto aquí hoy, vuelve mañana';
    const car = state.cars.find((c) => c.uid === carUid);
    if (!car) return 'Vehículo no encontrado en tu colección';
    const model = vehicleById(car.modelId);
    const score = exhibitionScore(model, car.build);
    const tier = score >= ev.thresholds.gold ? 'gold' : score >= ev.thresholds.silver ? 'silver' : score >= ev.thresholds.bronze ? 'bronze' : null;
    if (!tier) return `Puntaje ${score}: no alcanza el mínimo (${ev.thresholds.bronze}) para este encuentro`;
    const reward = ev.rewards[tier];
    set({
      money: state.money + reward.money, xp: state.xp + reward.xp, reputation: state.reputation + reward.reputation,
      meetupLastAttended: { ...state.meetupLastAttended, [eventId]: state.dailyKey },
      ...bumpCounters({ events_attended: 1 }),
    });
    const tierLabel = tier === 'gold' ? 'Oro' : tier === 'silver' ? 'Plata' : 'Bronce';
    return `${tierLabel} (puntaje ${score}): +$${reward.money}, +${reward.xp} XP, +${reward.reputation} reputación`;
  },
};

export const missionCatalog = () => ({ daily: DAILY_MISSIONS, weekly: WEEKLY_MISSIONS });
