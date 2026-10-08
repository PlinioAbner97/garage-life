import { START_MONEY, SELL_RATIO, SLOT_COUNT, SLOT_UNLOCK_COST, xpForLevel } from '../data/config';
import { getModel } from '../data/vehicles';
import { getJob } from '../data/jobs';
import { findPaint, findRim } from '../data/parts';
import { LocalSaveStore, type OwnedCar, type SaveData, type SaveStore } from './save';

export interface Toast { id: number; text: string; kind: 'ok' | 'bad' | 'level' }
export interface UIState {
  screen: 'start' | 'game';
  panel: null | 'garage' | 'shop' | 'jobs' | 'customize' | 'settings';
  selectedId: string | null;
  /** vista previa de personalización (no guardada) */
  preview: { carId: string; paint: string; rim: string } | null;
  toasts: Toast[];
  loaded: boolean;
  now: number;
}
export interface Snapshot { save: SaveData; ui: UIState }

const freshSave = (): SaveData => ({
  v: 1, money: START_MONEY, xp: 0, level: 1,
  cars: [{ id: 'c1', model: 'falcon-gt', paint: 'stock', rim: 'stock', slot: 0 }],
  slotsUnlocked: 2, nextCarId: 2, jobs: {}, totalEarned: 0, jobsDone: 0, tutorialDone: false,
});

/** Store único: la escena Phaser y la UI React leen y escriben aquí. Sin estado duplicado. */
export class GameStore {
  private save: SaveData = freshSave();
  private ui: UIState = { screen: 'start', panel: null, selectedId: null, preview: null, toasts: [], loaded: false, now: Date.now() };
  private snap: Snapshot = { save: this.save, ui: this.ui };
  private listeners = new Set<() => void>();
  private toastSeq = 1;
  private persistTimer: number | undefined;
  hasSave = false;

  constructor(private backend: SaveStore = new LocalSaveStore()) {}
  private pendingFlush = () => { if (this.persistTimer) { window.clearTimeout(this.persistTimer); this.persistTimer = undefined; void this.backend.save(this.save); } };

  subscribe = (fn: () => void) => { this.listeners.add(fn); return () => { this.listeners.delete(fn); }; };
  getSnapshot = () => this.snap;

  private emit() {
    this.snap = { save: this.save, ui: this.ui };
    this.listeners.forEach((l) => l());
  }
  private setSave(patch: Partial<SaveData>) {
    this.save = { ...this.save, ...patch };
    this.emit();
    window.clearTimeout(this.persistTimer);
    this.persistTimer = window.setTimeout(() => void this.backend.save(this.save), 250);
  }
  private setUI(patch: Partial<UIState>) { this.ui = { ...this.ui, ...patch }; this.emit(); }

  /** Cambia de backend (modo local o cuenta en la nube) y carga esa partida. Si la cuenta es nueva y había partida local, la migra. */
  async useBackend(b: SaveStore, migrateFrom?: SaveStore) {
    this.pendingFlush();
    this.backend = b; this.save = freshSave(); this.hasSave = false;
    this.setUI({ loaded: false, screen: 'start', panel: null, selectedId: null, preview: null });
    let d = await b.load();
    if (!d && migrateFrom) {
      const local = await migrateFrom.load();
      if (local) { try { await b.save(local); await migrateFrom.clear(); d = local; } catch { /* se queda local */ } }
    }
    if (d) { this.save = d; this.hasSave = true; }
    this.setUI({ loaded: true });
  }
  /** Guarda de inmediato (al cerrar o ocultar la app). */
  flush() { this.pendingFlush(); }

  toast(text: string, kind: Toast['kind'] = 'ok') {
    const t = { id: this.toastSeq++, text, kind };
    this.setUI({ toasts: [...this.ui.toasts, t].slice(-4) });
    window.setTimeout(() => this.setUI({ toasts: this.ui.toasts.filter((x) => x.id !== t.id) }), 3200);
  }

  // ---- navegación
  startGame(newGame: boolean) {
    if (newGame) { this.save = freshSave(); void this.backend.save(this.save); }
    this.setUI({ screen: 'game', panel: null, selectedId: null, preview: null });
    this.tick();
  }
  toMenu() { this.hasSave = true; this.setUI({ screen: 'start', panel: null, selectedId: null }); }
  openPanel(p: UIState['panel']) { this.setUI({ panel: p, preview: p === 'customize' ? this.ui.preview : null }); }
  setPreview(pv: UIState['preview']) { this.setUI({ preview: pv }); }
  selectCar(id: string | null) { this.setUI({ selectedId: id }); }
  dismissTutorial() { if (!this.save.tutorialDone) this.setSave({ tutorialDone: true }); }

  // ---- economía
  private grant(money: number, xp: number) {
    let { level } = this.save; let total = this.save.xp + xp;
    let leveled = false;
    while (total >= xpForLevel(level)) { total -= xpForLevel(level); level++; leveled = true; }
    this.setSave({ money: this.save.money + money, xp: total, level, totalEarned: this.save.totalEarned + Math.max(0, money) });
    if (leveled) this.toast(`¡Subiste al nivel ${level}!`, 'level');
  }
  canAfford(n: number) { return this.save.money >= n; }

  // ---- autos
  freeSlot(): number {
    const used = new Set(this.save.cars.map((c) => c.slot));
    for (let i = 0; i < this.save.slotsUnlocked; i++) if (!used.has(i)) return i;
    return -1;
  }
  buyCar(modelId: string): boolean {
    const m = getModel(modelId);
    if (this.save.level < m.minLevel) { this.toast(`Requiere nivel ${m.minLevel}`, 'bad'); return false; }
    if (!this.canAfford(m.price)) { this.toast('No tienes suficiente dinero', 'bad'); return false; }
    const slot = this.freeSlot();
    if (slot < 0) { this.toast('No hay plaza libre. Vende un auto o amplía el garaje.', 'bad'); return false; }
    const id = `c${this.save.nextCarId}`;
    const car: OwnedCar = { id, model: modelId, paint: 'stock', rim: 'stock', slot };
    this.setSave({ money: this.save.money - m.price, cars: [...this.save.cars, car], nextCarId: this.save.nextCarId + 1 });
    this.grant(0, Math.round(m.price / 40));
    this.toast(`Compraste un ${m.name}`);
    this.setUI({ selectedId: id });
    return true;
  }
  sellCar(id: string) {
    const car = this.save.cars.find((c) => c.id === id);
    if (!car) return;
    if (this.save.cars.length <= 1) { this.toast('Necesitas al menos un auto en el taller', 'bad'); return; }
    const m = getModel(car.model);
    const value = Math.round(m.price * SELL_RATIO) + Math.round((findPaint(car.paint).price + findRim(car.rim).price) * 0.3);
    const jobs = { ...this.save.jobs }; delete jobs[id];
    this.setSave({ cars: this.save.cars.filter((c) => c.id !== id), jobs, money: this.save.money + value });
    this.setUI({ selectedId: null });
    this.toast(`Vendiste el ${m.name} por $${value.toLocaleString('es')}`);
  }
  moveCar(id: string, slot: number) {
    if (slot < 0 || slot >= this.save.slotsUnlocked) return;
    const cars = this.save.cars.map((c) => {
      if (c.id === id) return { ...c, slot };
      if (c.slot === slot) return { ...c, slot: this.save.cars.find((x) => x.id === id)!.slot };
      return c;
    });
    this.setSave({ cars });
  }
  applyCustomization(id: string, paintId: string, rimId: string): boolean {
    const car = this.save.cars.find((c) => c.id === id); if (!car) return false;
    const p = findPaint(paintId), r = findRim(rimId);
    const cost = (p.id !== car.paint ? p.price : 0) + (r.id !== car.rim ? r.price : 0);
    if (this.save.level < p.minLevel || this.save.level < r.minLevel) { this.toast('Alguna pieza requiere más nivel', 'bad'); return false; }
    if (!this.canAfford(cost)) { this.toast('No tienes suficiente dinero', 'bad'); return false; }
    if (cost === 0 && p.id === car.paint && r.id === car.rim) return true;
    this.setSave({ money: this.save.money - cost, cars: this.save.cars.map((c) => (c.id === id ? { ...c, paint: p.id, rim: r.id } : c)) });
    this.grant(0, Math.round(cost / 12));
    this.toast(cost ? `Personalización aplicada (-$${cost.toLocaleString('es')})` : 'Personalización aplicada');
    return true;
  }
  unlockSlot(): boolean {
    const i = this.save.slotsUnlocked;
    if (i >= SLOT_COUNT) return false;
    const cost = SLOT_UNLOCK_COST[i];
    if (!this.canAfford(cost)) { this.toast('No tienes suficiente dinero', 'bad'); return false; }
    this.setSave({ money: this.save.money - cost, slotsUnlocked: i + 1 });
    this.grant(0, Math.round(cost / 30));
    this.toast('¡Nueva plaza desbloqueada!');
    return true;
  }

  // ---- trabajos
  startJob(carId: string, jobId: string): boolean {
    const j = getJob(jobId);
    if (this.save.level < j.minLevel) { this.toast(`Requiere nivel ${j.minLevel}`, 'bad'); return false; }
    if (this.save.jobs[carId]) { this.toast('Ese auto ya está ocupado', 'bad'); return false; }
    this.setSave({ jobs: { ...this.save.jobs, [carId]: { jobId, endsAt: Date.now() + j.seconds * 1000, done: false } } });
    return true;
  }
  collectJob(carId: string) {
    const aj = this.save.jobs[carId]; const car = this.save.cars.find((c) => c.id === carId);
    if (!aj || !car || Date.now() < aj.endsAt) return;
    const j = getJob(aj.jobId); const pay = Math.round(j.pay * getModel(car.model).payBonus);
    const jobs = { ...this.save.jobs }; delete jobs[carId];
    this.setSave({ jobs, jobsDone: this.save.jobsDone + 1 });
    this.grant(pay, j.xp);
    this.toast(`${j.icon} ${j.name}: +$${pay.toLocaleString('es')}  +${j.xp} XP`);
  }
  collectAll() {
    Object.keys(this.save.jobs).forEach((id) => this.collectJob(id));
  }
  /** Se llama cada 500 ms: marca trabajos terminados y refresca relojes. */
  tick() {
    const now = Date.now();
    let changed = false; const jobs = { ...this.save.jobs };
    for (const [id, j] of Object.entries(jobs)) if (!j.done && now >= j.endsAt) { jobs[id] = { ...j, done: true }; changed = true; }
    if (changed) this.setSave({ jobs });
    this.setUI({ now });
  }

  async resetAll() {
    await this.backend.clear(); this.save = freshSave(); this.hasSave = false;
    this.setUI({ screen: 'start', panel: null, selectedId: null });
  }
}

export const store = new GameStore();
window.addEventListener('pagehide', () => store.flush());
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') store.flush(); });
