import { START_MONEY, SELL_RATIO, SLOT_COUNT, TOTAL_SLOTS, SLOT_UNLOCK_COST, getZone, xpForLevel } from '../data/config';
import { ITEMS, getItem, findFloor, findWall, FLOOR_FINISHES, WALL_FINISHES } from '../data/items';
import { LOSS_XP_RATIO, RACE_CD_MS, RACE_COUNTDOWN_MS, FRIEND_MIN_LEVEL, RACE_TIERS, raceEndsAt, simulate, type RaceOpp } from '../data/races';
import { CLIENT_JOBS, CLIENT_CARS_BY_REP, CLIENT_NAMES, ARRIVE_MS, LEAVE_MS, OFFER_EVERY_MS, OFFER_TTL_MS, freshBiz, getClientJob, maxOffers, repLevel, repPayMult, type BizState, type ClientJob } from '../data/clients';
import { PAINTS } from '../data/parts';
import { social, type PublicGarage } from './social';
import { validate, type Placed, type Rot } from './layout';
import { getModel } from '../data/vehicles';
import { getJob } from '../data/jobs';
import { findPaint, findRim } from '../data/parts';
import { LocalSaveStore, isSlotUnlocked, hasZone, type OwnedCar, type SaveData, type SaveStore } from './save';

export interface Toast { id: number; text: string; kind: 'ok' | 'bad' | 'level' }
export interface UIState {
  screen: 'start' | 'game';
  panel: null | 'races' | 'garage' | 'shop' | 'inventory' | 'expand' | 'style' | 'jobs' | 'customize' | 'settings' | 'friends';
  /** pestaña del menú Trabajos */
  jobsTab: 'mine' | 'clients';
  selectedId: string | null;
  /** vista previa de personalización (no guardada) */
  preview: { carId: string; paint: string; rim: string } | null;
  toasts: Toast[];
  /** visitando el garaje de un amigo (solo lectura) */
  visit: null | { userId: string; username: string; garage: PublicGarage };
  /** modo "Editar garaje": borrador sin guardar hasta pulsar Guardar cambios */
  edit: null | { draft: Placed[]; sel: string | null; adding: string | null; snap: boolean; dirty: boolean };
  loaded: boolean;
  now: number;
}
export interface Snapshot { save: SaveData; ui: UIState }

const freshSave = (): SaveData => ({
  v: 1, money: START_MONEY, xp: 0, level: 1,
  cars: [{ id: 'c1', model: 'falcon-gt', paint: 'stock', rim: 'stock', slot: 0 }],
  slotsUnlocked: 2, nextCarId: 2, jobs: {}, totalEarned: 0, jobsDone: 0, tutorialDone: false, zones: [], inventory: {}, placed: [], style: { floor: 'stock', wall: 'stock', owned: [] }, biz: freshBiz(),
});

/** Store único: la escena Phaser y la UI React leen y escriben aquí. Sin estado duplicado. */
export class GameStore {
  private save: SaveData = freshSave();
  private ui: UIState = { screen: 'start', panel: null, selectedId: null, preview: null, toasts: [], jobsTab: 'mine', visit: null, edit: null, loaded: false, now: Date.now() };
  private snap: Snapshot = { save: this.save, ui: this.ui };
  private listeners = new Set<() => void>();
  private toastSeq = 1;
  private persistTimer: number | undefined;
  hasSave = false;

  constructor(private backend: SaveStore = new LocalSaveStore()) {}
  private pendingFlush = () => { if (this.persistTimer) { window.clearTimeout(this.persistTimer); this.persistTimer = undefined; void this.backend.save(this.save); social.publish(this.save); } };

  subscribe = (fn: () => void) => { this.listeners.add(fn); return () => { this.listeners.delete(fn); }; };
  getSnapshot = () => this.snap;

  private emit() {
    this.snap = { save: this.save, ui: this.ui };
    this.listeners.forEach((l) => l());
  }
  setSave(patch: Partial<SaveData>) {
    this.save = { ...this.save, ...patch };
    this.emit();
    window.clearTimeout(this.persistTimer);
    this.persistTimer = window.setTimeout(() => { void this.backend.save(this.save); social.publish(this.save); }, 250);
  }
  private setUI(patch: Partial<UIState>) { this.ui = { ...this.ui, ...patch }; this.emit(); }

  /** Cambia de backend (modo local o cuenta en la nube) y carga esa partida. Si la cuenta es nueva y había partida local, la migra. */
  async useBackend(b: SaveStore, migrateFrom?: SaveStore) {
    this.pendingFlush();
    this.backend = b; this.save = freshSave(); this.hasSave = false;
    this.setUI({ loaded: false, visit: null, edit: null, screen: 'start', panel: null, selectedId: null, preview: null });
    let d = await b.load();
    if (!d && migrateFrom) {
      const local = await migrateFrom.load();
      if (local) { try { await b.save(local); await migrateFrom.clear(); d = local; } catch { /* se queda local */ } }
    }
    if (d) { this.save = { ...freshSave(), ...d, zones: d.zones ?? [], inventory: d.inventory ?? {}, placed: d.placed ?? [], style: { floor: 'stock', wall: 'stock', owned: [], ...d.style }, biz: { ...freshBiz(), ...d.biz } }; this.hasSave = true; }
    this.setUI({ loaded: true });
  }
  /** Guarda de inmediato (al cerrar o ocultar la app). */
  flush() { this.pendingFlush(); }

  toast(text: string, kind: Toast['kind'] = 'ok') {
    const t = { id: this.toastSeq++, text, kind };
    this.setUI({ toasts: [...this.ui.toasts, t].slice(-4) });
    window.setTimeout(() => this.setUI({ toasts: this.ui.toasts.filter((x) => x.id !== t.id) }), 3200);
  }

  // ---- visitas a garajes de amigos
  async visit(userId: string, username: string): Promise<boolean> {
    const garage = await social.fetchGarage(userId);
    if (!garage) { this.toast(`${username} aún no ha abierto su garaje`, 'bad'); return false; }
    this.setUI({ visit: { userId, username, garage }, panel: null, edit: null, selectedId: null, preview: null });
    return true;
  }
  leaveVisit() { this.setUI({ visit: null }); }

  // ---- navegación
  startGame(newGame: boolean) {
    if (newGame) { this.save = freshSave(); void this.backend.save(this.save); }
    this.setUI({ screen: 'game', edit: null, panel: null, selectedId: null, preview: null });
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
    const bays = this.baySlots();
    for (let i = 0; i < TOTAL_SLOTS; i++) if (isSlotUnlocked(this.save, i) && !used.has(i) && !bays.has(i)) return i;
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
    if (slot < 0 || slot >= TOTAL_SLOTS || !isSlotUnlocked(this.save, slot)) return;
    if (this.baySlots().has(slot)) { this.toast('Esa plaza es una Bahía de Servicio. Retírala en Editar garaje para usarla.', 'bad'); return; }
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

  /** Compra una zona de expansión física del lote. */
  buyZone(id: string): boolean {
    const z = getZone(id);
    if (hasZone(this.save, id)) return false;
    if (this.save.level < z.minLevel) { this.toast(`Requiere nivel ${z.minLevel}`, 'bad'); return false; }
    if (z.requires && !hasZone(this.save, z.requires)) { this.toast(`Primero compra: ${getZone(z.requires).name}`, 'bad'); return false; }
    if (!this.canAfford(z.cost)) { this.toast('No tienes suficiente dinero', 'bad'); return false; }
    this.setSave({ money: this.save.money - z.cost, zones: [...(this.save.zones ?? []), id] });
    this.grant(0, Math.round(z.cost / 30));
    this.toast(`¡${z.name} desbloqueada!`, 'level');
    return true;
  }


  // ---- accesorios del taller
  lastBuy: Record<string, number> = {};
  private uidSeq = 1;
  owned(id: string) { return this.save.inventory?.[id] ?? 0; }
  placedCount(id: string, list: Placed[] = this.save.placed ?? []) { return list.filter((p) => p.item === id).length; }
  /** unidades libres para colocar (comprados - colocados en el borrador/guardado) */
  available(id: string) { return this.owned(id) - this.placedCount(id, this.ui.edit?.draft ?? this.save.placed ?? []); }
  buyItem(id: string): boolean {
    const it = getItem(id); if (!it) return false;
    const now = Date.now();
    if (now - (this.lastBuy[id] ?? 0) < 350) return false; // evita doble toque
    if (it.minLevel && this.save.level < it.minLevel) { this.toast(`Requiere nivel ${it.minLevel}`, 'bad'); return false; }
    if (!this.canAfford(it.price)) { this.toast('No tienes suficiente dinero', 'bad'); return false; }
    this.lastBuy[id] = now;
    this.setSave({ money: this.save.money - it.price, inventory: { ...(this.save.inventory ?? {}), [id]: this.owned(id) + 1 } });
    this.grant(0, Math.round(it.price / 60));
    this.toast(`Compraste: ${it.name}`);
    return true;
  }
  private getDef = (id: string) => getItem(id);
  private setEdit(patch: Partial<NonNullable<UIState['edit']>>) { if (this.ui.edit) this.setUI({ edit: { ...this.ui.edit, ...patch } }); }
  enterEdit() { this.setUI({ panel: null, selectedId: null, edit: { draft: [...(this.save.placed ?? [])], sel: null, adding: null, snap: true, dirty: false } }); }
  editSelect(uid: string | null) { this.setEdit({ sel: uid, adding: null }); }
  editAdd(itemId: string) {
    if (!this.ui.edit) this.enterEdit();
    if (this.available(itemId) <= 0) { this.toast('No tienes unidades libres de ese accesorio', 'bad'); return; }
    this.setUI({ panel: null, edit: { ...this.ui.edit!, sel: null, adding: itemId } });
  }
  editCancelAdd() { this.setEdit({ adding: null }); }
  editSnap(on: boolean) { this.setEdit({ snap: on }); }
  /** coloca una unidad nueva del inventario (ya validada por la escena; se revalida aquí) */
  editPlace(itemId: string, x: number, y: number, rot: Rot): boolean {
    const e = this.ui.edit, def = getItem(itemId); if (!e || !def) return false;
    if (this.available(itemId) <= 0) return false;
    const v = validate(def, x, y, rot, this.save, e.draft, this.getDef);
    if (!v.ok) { this.toast(v.reason, 'bad'); return false; }
    const uid = `o${Date.now().toString(36)}${this.uidSeq++}`;
    this.setUI({ edit: { ...e, draft: [...e.draft, { uid, item: itemId, x: v.x, y: v.y, rot: v.rot, ...(v.slot !== undefined ? { slot: v.slot } : {}) }], sel: uid, adding: null, dirty: true } });
    return true;
  }
  editMove(uid: string, x: number, y: number, rot: Rot): boolean {
    const e = this.ui.edit; if (!e) return false;
    const cur = e.draft.find((p) => p.uid === uid), def = cur && getItem(cur.item); if (!cur || !def) return false;
    if (this.bayLocked(uid)) { this.toast('Esa bahía tiene un trabajo activo. Termínalo para moverla.', 'bad'); return false; }
    const v = validate(def, x, y, rot, this.save, e.draft.filter((p) => p.uid !== uid), this.getDef);
    if (!v.ok) { this.toast(v.reason, 'bad'); return false; }
    this.setUI({ edit: { ...e, draft: e.draft.map((p) => (p.uid === uid ? { ...p, x: v.x, y: v.y, rot: v.rot, ...(v.slot !== undefined ? { slot: v.slot } : {}) } : p)), dirty: true } });
    return true;
  }
  /** devuelve el accesorio al inventario (sin cobro ni reembolso) */
  editStow(uid: string) {
    const e = this.ui.edit; if (!e) return;
    if (this.bayLocked(uid)) { this.toast('Esa bahía tiene un trabajo activo. Termínalo para retirarla.', 'bad'); return; }
    this.setUI({ edit: { ...e, draft: e.draft.filter((p) => p.uid !== uid), sel: null, dirty: true } });
  }
  editSave() {
    const e = this.ui.edit; if (!e) return;
    const ok: Placed[] = [];
    // una bahía con trabajo activo nunca desaparece, aunque el borrador la haya quitado
    const keep = (this.save.placed ?? []).filter((p) => this.bayLocked(p.uid) && !e.draft.some((d) => d.uid === p.uid));
    for (const p of [...e.draft, ...keep]) {
      const def = getItem(p.item); if (!def || ok.filter((o) => o.item === p.item).length >= this.owned(p.item)) continue;
      if (validate(def, p.x, p.y, p.rot, this.save, ok, this.getDef).ok) ok.push(p);
    }
    const hadRec = this.hasEquip('reception');
    this.setSave({ placed: ok });
    if (!hadRec && this.hasEquip('reception') && !(this.save.biz?.nextOfferAt)) this.setSave({ biz: { ...(this.save.biz ?? freshBiz()), nextOfferAt: Date.now() + 4000 } });
    this.setUI({ edit: null });
    this.toast('Cambios del garaje guardados');
  }
  editCancel() { this.setUI({ edit: null }); }

  // ---- acabados
  hasFinish(kind: 'floor' | 'wall', id: string) { const f = findOf(kind, id); return !f.price || (this.save.style?.owned ?? []).includes(`${kind}:${id}`); }
  setFinish(kind: 'floor' | 'wall', id: string): boolean {
    const list = kind === 'floor' ? FLOOR_FINISHES : WALL_FINISHES, f = list.find((x) => x.id === id); if (!f) return false;
    const st = this.save.style ?? {}; const owned = st.owned ?? [];
    if (!this.hasFinish(kind, id)) {
      if (this.save.level < f.minLevel) { this.toast(`Requiere nivel ${f.minLevel}`, 'bad'); return false; }
      if (!this.canAfford(f.price)) { this.toast('No tienes suficiente dinero', 'bad'); return false; }
      this.setSave({ money: this.save.money - f.price, style: { ...st, [kind]: id, owned: [...owned, `${kind}:${id}`] } });
      this.toast(`Acabado aplicado: ${f.name}`); return true;
    }
    this.setSave({ style: { ...st, [kind]: id, owned } });
    return true;
  }


  // ---- negocio de clientes (Recepción + Bahías de Servicio)
  private getBiz(): BizState { return this.save.biz ?? freshBiz(); }
  private setBiz(patch: Partial<BizState>) { this.setSave({ biz: { ...this.getBiz(), ...patch } }); }
  private patchJob(id: string, patch: Partial<ClientJob>) { this.setBiz({ jobs: this.getBiz().jobs.map((j) => (j.id === id ? { ...j, ...patch } : j)) }); }
  /** equipo instalado y guardado en el taller (no cuenta el borrador del editor) */
  hasEquip(itemId: string) { return (this.save.placed ?? []).some((p) => p.item === itemId); }
  bays(): Placed[] { return (this.save.placed ?? []).filter((p) => getItem(p.item)?.special === 'bay'); }
  /** plazas reservadas por una Bahía de Servicio instalada */
  baySlots(): Set<number> { return new Set(this.bays().map((b) => b.slot).filter((n): n is number => n !== undefined)); }
  private bayJob(uid: string) { return this.getBiz().jobs.find((j) => j.bay === uid && j.state !== 'offered'); }
  bayLocked(uid: string) { return !!this.bayJob(uid); }
  freeBays(): Placed[] { return this.bays().filter((b) => !this.bayJob(b.uid)); }
  repLevel() { return repLevel(this.getBiz().rep); }
  /** ¿Por qué no se puede aceptar? ('' = se puede) */
  cantAccept(j: ClientJob): string {
    const def = getClientJob(j.jobId);
    if (!this.hasEquip('reception')) return 'Necesitas la Recepción instalada';
    if (this.repLevel() < def.minRep) return 'Requiere más reputación';
    if (def.needs && !this.hasEquip(def.needs)) return `Requiere: ${getItem(def.needs)?.name ?? def.needs}`;
    if (this.freeBays().length === 0) return this.bays().length ? 'Todas tus bahías están ocupadas' : 'Necesitas una Bahía de Servicio';
    return '';
  }
  acceptClient(id: string): boolean {
    const j = this.getBiz().jobs.find((x) => x.id === id);
    if (!j || j.state !== 'offered') return false;
    const why = this.cantAccept(j); if (why) { this.toast(why, 'bad'); return false; }
    const bay = this.freeBays()[0];
    this.patchJob(id, { state: 'arriving', bay: bay.uid, acceptedAt: Date.now() });
    this.toast(`${j.client} viene hacia tu taller`);
    return true;
  }
  startRepair(id: string): boolean {
    const j = this.getBiz().jobs.find((x) => x.id === id);
    if (!j || j.state !== 'waiting') return false;
    const now = Date.now();
    this.patchJob(id, { state: 'repairing', startedAt: now, endsAt: now + j.seconds * 1000 });
    return true;
  }
  /** Cobra un trabajo terminado. El indicador `claimed` se guarda en la misma operación: no se puede cobrar dos veces. */
  claimClient(id: string): boolean {
    const j = this.getBiz().jobs.find((x) => x.id === id);
    if (!j || j.state !== 'ready' || j.claimed) return false;
    const b = this.getBiz();
    this.setBiz({ jobs: b.jobs.map((x) => (x.id === id ? { ...x, claimed: true, state: 'leaving', leaveAt: Date.now() } : x)), done: b.done + 1, rep: b.rep + getClientJob(j.jobId).repPts });
    const before = repLevel(b.rep), after = repLevel(b.rep + getClientJob(j.jobId).repPts);
    this.grant(j.pay, j.xp);
    this.toast(`${getClientJob(j.jobId).icon} ${j.client}: +$${j.pay.toLocaleString('es')}  +${j.xp} XP`);
    if (after > before) this.toast(`¡Tu taller subió de reputación!`, 'level');
    return true;
  }
  // ---- carreras
  raceCooldown(carId: string) { return Math.max(0, (this.save.raceCd?.[carId] ?? 0) - Date.now()); }
  startRace(carId: string, opp: RaceOpp): boolean {
    const car = this.save.cars.find((c) => c.id === carId);
    if (!car) return false;
    if (this.save.race) { this.toast('Ya tienes una carrera en curso', 'bad'); return false; }
    const tier = opp.tier ? RACE_TIERS.find((t) => t.id === opp.tier) : undefined;
    if (opp.kind === 'ai' && (!tier || this.save.level < tier.minLevel)) { this.toast('Aún no tienes el nivel para esa categoría', 'bad'); return false; }
    if (opp.kind === 'friend' && this.save.level < FRIEND_MIN_LEVEL) { this.toast(`Duelos con amigos desde el nivel ${FRIEND_MIN_LEVEL}`, 'bad'); return false; }
    if (this.save.jobs[carId]) { this.toast('Ese auto está en un trabajo', 'bad'); return false; }
    if (this.raceCooldown(carId) > 0) { this.toast('Ese auto está descansando entre carreras', 'bad'); return false; }
    if (this.save.money < opp.fee) { this.toast('No te alcanza para la cuota de inscripción', 'bad'); return false; }
    const r = simulate(car.model, opp);
    const id = (this.save.raceCount ?? 0) + 1;
    this.setSave({ money: this.save.money - opp.fee, raceCount: id, race: { id, carId, model: car.model, paint: car.paint, rim: car.rim, opp, myT: r.myT, oppT: r.oppT, startedAt: Date.now(), win: r.win } });
    return true;
  }
  /** Cobra la carrera terminada. El estado se borra en la misma operación: no se puede cobrar dos veces. */
  claimRace(): boolean {
    const r = this.save.race; if (!r || Date.now() < raceEndsAt(r)) return false;
    const cd = { ...(this.save.raceCd ?? {}), [r.carId]: Date.now() + RACE_CD_MS };
    this.setSave({ race: undefined, raceCd: cd, raceWins: (this.save.raceWins ?? 0) + (r.win ? 1 : 0) });
    if (r.win) { this.grant(r.opp.prize, r.opp.xp); this.toast(`🏁 ¡Ganaste! +$${r.opp.prize.toLocaleString('es')}  +${r.opp.xp} XP`, 'level'); }
    else { const xp = Math.round(r.opp.xp * LOSS_XP_RATIO); this.grant(0, xp); this.toast(`Perdiste la carrera · +${xp} XP`, 'bad'); }
    return true;
  }
  setJobsTab(t: 'mine' | 'clients') { this.setUI({ jobsTab: t }); }
  private makeOffer(now: number): ClientJob {
    const b = this.getBiz(), rep = repLevel(b.rep);
    const pool = CLIENT_JOBS.filter((d) => d.minRep <= rep);
    const def = pool[Math.floor(Math.random() * pool.length)];
    const cars = CLIENT_CARS_BY_REP[rep - 1] ?? ['falcon-gt'];
    const paints = PAINTS.filter((p) => p.minLevel <= 2);
    const jit = 0.92 + Math.random() * 0.16;
    return {
      id: `k${b.nextId}`, client: CLIENT_NAMES[Math.floor(Math.random() * CLIENT_NAMES.length)], model: cars[Math.floor(Math.random() * cars.length)],
      paint: paints[Math.floor(Math.random() * paints.length)].id, rim: 'stock', jobId: def.id,
      pay: Math.round((def.pay * repPayMult(rep) * jit) / 10) * 10, xp: def.xp, seconds: def.seconds, state: 'offered', offeredAt: now,
    };
  }
  /** Avanza el negocio con el reloj: llegada, listo, salida, expiración y nuevas solicitudes. Todo basado en marcas de tiempo (seguro al recargar). */
  private tickBiz(now: number) {
    const b = this.getBiz(); let jobs = b.jobs; let changed = false; let next = b.nextOfferAt; let nextId = b.nextId;
    const upd = (fn: (j: ClientJob) => ClientJob | null) => { const out: ClientJob[] = []; for (const j of jobs) { const r = fn(j); if (r !== j) changed = true; if (r) out.push(r); } jobs = out; };
    upd((j) => {
      if (j.state === 'arriving' && now >= (j.acceptedAt ?? 0) + ARRIVE_MS) { this.toast(`El auto de ${j.client} llegó a la bahía`); return { ...j, state: 'waiting' }; }
      if (j.state === 'repairing' && now >= (j.endsAt ?? 0)) { this.toast(`${getClientJob(j.jobId).icon} Trabajo de ${j.client} listo para cobrar`); return { ...j, state: 'ready' }; }
      if (j.state === 'leaving' && now >= (j.leaveAt ?? 0) + LEAVE_MS) return null;
      if (j.state === 'offered' && now >= j.offeredAt + OFFER_TTL_MS) return null;
      return j;
    });
    if (this.hasEquip('reception')) {
      const offers = jobs.filter((j) => j.state === 'offered').length;
      if (next === 0) { next = now + 4000; changed = true; }
      else if (now >= next) {
        if (offers < maxOffers(repLevel(b.rep), b.recLevel ?? 1)) { const o = this.makeOffer(now); o.id = `k${nextId++}`; jobs = [...jobs, o]; this.toast(`🚗 Nuevo cliente: ${o.client} · ${getClientJob(o.jobId).name}`); }
        next = now + OFFER_EVERY_MS; changed = true;
      }
    }
    if (changed) this.setBiz({ jobs, nextOfferAt: next, nextId });
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
    this.tickBiz(now);
    this.setUI({ now });
  }

  async resetAll() {
    await this.backend.clear(); this.save = freshSave(); this.hasSave = false;
    this.setUI({ screen: 'start', panel: null, selectedId: null });
  }
}

const findOf = (kind: 'floor' | 'wall', id: string) => (kind === 'floor' ? findFloor(id) : findWall(id));
void ITEMS;
export const store = new GameStore();
window.addEventListener('pagehide', () => store.flush());
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') store.flush(); });
// Gancho de pruebas: solo con ?debug en la URL.
if (typeof location !== 'undefined' && /[?&]debug\b/.test(location.search)) (window as unknown as { __gl: GameStore }).__gl = store;
