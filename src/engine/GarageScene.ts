import Phaser from 'phaser';
import { store, type Snapshot } from '../core/store';
import { FUTURE_ZONES, SLOT_COUNT, SLOT_HALF, SLOT_UNLOCK_COST, SLOT_WORLD, TOTAL_SLOTS, ZONES, zoneOfSlot, type ZoneDef } from '../data/config';
import { hasZone, isSlotUnlocked } from '../core/save';
import { getModel } from '../data/vehicles';
import { findPaint, findRim } from '../data/parts';
import { getJob } from '../data/jobs';
import { dpr, TEXT_RES } from './dpr';
import { CarPainter, type PainterMap } from './recolor';
import { ITEMS, getItem, type ItemDef } from '../data/items';
import { itemUrl } from '../data/itemAssets';
import itemsInfo from '../assets/items/items_info.json';
import { findFloor, findWall } from '../data/items';
import { GARAGE_RECT, footprint, snapWall, snapGrid, validate, type Placed, type Rot, type Verdict } from '../core/layout';
import { ASSETS, BG, LOT, PROJ, STREETS, SPRITE_INFO, SPRITE_KEYS, SPRITE_SCALE } from './assets';

// Mundo = garaje original (BG, vista inicial) dentro del lote completo (LOT) y las calles (STREETS).
const WW = BG.w, HH = BG.h, CX = BG.x + BG.w / 2, CY = BG.y + BG.h / 2;
type Pt = { x: number; y: number };
interface ItemRot { ax: number; ay: number; w: number; h: number }
const ITEM_INFO = itemsInfo as unknown as Record<string, { rots: ItemRot[] }>;
interface PlacedView { img?: Phaser.GameObjects.Image; sig: string }
/** Proyección ortográfica de la cámara de Blender: mundo (x,y,z) -> píxel del render. */
const project = (x: number, y: number, z = 0): Pt => ({
  x: PROJ.origin[0] + x * PROJ.x[0] + y * PROJ.y[0] + z * PROJ.z[0],
  y: PROJ.origin[1] + x * PROJ.x[1] + y * PROJ.y[1] + z * PROJ.z[1],
});
/** Inversa sobre el piso (z = 0): píxel del mundo -> metros (x, y) de Blender. */
const unproject = (px: number, py: number): Pt => {
  const dx = px - PROJ.origin[0], dy = py - PROJ.origin[1];
  const det = PROJ.x[0] * PROJ.y[1] - PROJ.x[1] * PROJ.y[0];
  return { x: (dx * PROJ.y[1] - dy * PROJ.y[0]) / det, y: (PROJ.x[0] * dy - PROJ.x[1] * dx) / det };
};
const inRect = (g: Pt, r: [number, number, number, number]) => g.x >= r[0] && g.x <= r[2] && g.y >= r[1] && g.y <= r[3];
const rectCorners = (r: [number, number, number, number]): Pt[] => [[r[0], r[1]], [r[2], r[1]], [r[2], r[3]], [r[0], r[3]]].map(([x, y]) => project(x, y));
/** Plaza usable: las del garaje original siempre se dibujan; las de una zona solo si la zona es del jugador. */
const slotInPlay = (save: Snapshot['save'], i: number) => { const z = zoneOfSlot(i); return !z || hasZone(save, z.id); };
const slotCost = (i: number) => (i < SLOT_COUNT ? SLOT_UNLOCK_COST[i] : zoneOfSlot(i)!.cost);

interface CarView {
  sprite: Phaser.GameObjects.Image; texKey: string; model: string; slot: number;
  bar: Phaser.GameObjects.Graphics; icon: Phaser.GameObjects.Text; tag: Phaser.GameObjects.Text;
}

export class GarageScene extends Phaser.Scene {
  private painters!: PainterMap;
  private cars = new Map<string, CarView>();
  private slotGfx!: Phaser.GameObjects.Graphics;
  private slotTexts: Phaser.GameObjects.Text[] = [];
  private ring!: Phaser.GameObjects.Graphics;
  private dragged = false;
  private unsub?: () => void;
  private fitZoom = 1;
  private minZoom = 0.1;
  private lotFit = 0.2;
  private zoneGfx!: Phaser.GameObjects.Graphics;
  private zoneTexts = new Map<string, Phaser.GameObjects.Text>();
  private zoneCount = -1;
  private ready = false;
  private visiting = false;
  private styleGfx!: Phaser.GameObjects.Graphics;
  private styleSig = '';
  // modo edición
  private placedViews = new Map<string, PlacedView>();
  private editGfx!: Phaser.GameObjects.Graphics;
  private ghostImg?: Phaser.GameObjects.Image;
  private editRot: Rot = 0;
  private editDrag: null | { uid: string | null; dx: number; dy: number } = null;
  private ghostPos: (Verdict & { fp: [number, number, number, number] }) | null = null;

  constructor() { super('garage'); }

  preload() {
    this.load.image('bg', ASSETS.bg);
    this.load.image('lot-a', ASSETS.lotA);
    this.load.image('lot-b', ASSETS.lotB);
    this.load.image('streets', ASSETS.streets);
    ITEMS.forEach((it) => [0, 1, 2, 3].forEach((r) => { const u = itemUrl(it.id, r); if (u) this.load.image(`item:${it.id}:${r}`, u); }));
    SPRITE_KEYS.forEach((k) => {
      this.load.image(`${k}-beauty`, ASSETS[k].beauty);
      this.load.image(`${k}-mask`, ASSETS[k].mask);
    });
  }

  create() {
    this.painters = {} as PainterMap;
    SPRITE_KEYS.forEach((k) => {
      this.painters[k] = new CarPainter(
        this.textures.get(`${k}-beauty`).getSourceImage() as HTMLImageElement,
        this.textures.get(`${k}-mask`).getSourceImage() as HTMLImageElement,
      );
    });
    this.add.image(STREETS.x, STREETS.y, 'streets').setOrigin(0).setScale(STREETS.scale).setDepth(-3);
    this.add.image(LOT.x, LOT.y, 'lot-a').setOrigin(0).setDepth(-2);
    this.add.image(LOT.x + LOT.w / 2, LOT.y, 'lot-b').setOrigin(0).setDepth(-2);
    this.add.image(BG.x, BG.y, 'bg').setOrigin(0).setDepth(0);
    this.styleGfx = this.add.graphics().setDepth(0.3).setBlendMode(Phaser.BlendModes.MULTIPLY);
    this.zoneGfx = this.add.graphics().setDepth(0.5);
    this.slotGfx = this.add.graphics().setDepth(1);
    this.ring = this.add.graphics().setDepth(2);
    this.editGfx = this.add.graphics().setDepth(950);
    this.buildSlotLabels();

    const cam = this.cameras.main;
    cam.setBounds(STREETS.x - 100, STREETS.y - 100, STREETS.w + 200, STREETS.h + 200);
    this.refit();
    this.scale.on('resize', () => this.refit(true));
    this.setupInput();

    this.unsub = store.subscribe(() => this.sync(store.getSnapshot()));
    this.events.once('shutdown', () => this.unsub?.());
    this.ready = true;
    this.sync(store.getSnapshot());
    this.time.addEvent({ delay: 500, loop: true, callback: () => store.tick() });
  }

  // ---------- cámara
  private refit(onlyIfFitted = false) {
    const cam = this.cameras.main;
    const z = Math.min(this.scale.width / WW, this.scale.height / HH) * 1.02;
    const wasFitted = Math.abs(cam.zoom - this.fitZoom) < 0.001;
    this.fitZoom = z;
    this.lotFit = Math.min(this.scale.width / LOT.w, this.scale.height / LOT.h) * 0.98;
    this.minZoom = this.lotFit * 0.8;
    if (!onlyIfFitted || wasFitted) {
      // en pantalla vertical sobra espacio bajo el garaje: se sube el garaje y se muestra el terreno de abajo
      const portrait = this.scale.height > this.scale.width * 1.2;
      // límites con holgura vertical: en pantallas altas el mundo es más bajo que la vista y la cámara quedaría fija
      const padY = Math.max(100, this.scale.height / this.minZoom * 0.5);
      cam.setBounds(STREETS.x - 100, STREETS.y - padY, STREETS.w + 200, STREETS.h + padY * 2);
      cam.setZoom(z); cam.centerOn(CX, CY + (portrait ? (this.scale.height / z) * 0.24 : 0));
    }
  }
  focusOn(x: number, y: number, zoom = Math.max(this.fitZoom * 1.7, dpr())) {
    const cam = this.cameras.main;
    cam.pan(x, y, 450, 'Sine.easeInOut'); cam.zoomTo(zoom, 450, 'Sine.easeInOut');
  }
  /** Alterna entre el garaje (vista inicial) y el lote completo con todas las zonas. */
  resetView() {
    const cam = this.cameras.main;
    if (Math.abs(cam.zoom - this.fitZoom) < 0.01 * this.fitZoom && this.lotFit < this.fitZoom * 0.9) {
      cam.pan(LOT.x + LOT.w / 2, LOT.y + LOT.h / 2, 500, 'Sine.easeInOut'); cam.zoomTo(this.lotFit, 500, 'Sine.easeInOut');
    } else { cam.pan(CX, CY + (this.scale.height > this.scale.width * 1.2 ? (this.scale.height / this.fitZoom) * 0.24 : 0), 400, 'Sine.easeInOut'); cam.zoomTo(this.fitZoom, 400, 'Sine.easeInOut'); }
  }
  zoomBy(f: number) {
    const cam = this.cameras.main;
    cam.zoomTo(Phaser.Math.Clamp(cam.zoom * f, this.minZoom, this.fitZoom * 3.5), 180);
  }

  private setupInput() {
    const cam = this.cameras.main;
    let last: Pt | null = null; let startPt: Pt | null = null;
    let pinch = 0;
    this.input.addPointer(1);
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      last = { x: p.x, y: p.y }; startPt = { x: p.x, y: p.y }; this.dragged = false; this.editDrag = null;
      if (store.getSnapshot().ui.edit && !this.input.pointer2.isDown) this.editDown(p);
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      const p1 = this.input.pointer1, p2 = this.input.pointer2;
      if (p1.isDown && p2.isDown) {
        const d = Phaser.Math.Distance.Between(p1.x, p1.y, p2.x, p2.y);
        if (pinch) cam.setZoom(Phaser.Math.Clamp(cam.zoom * (d / pinch), this.minZoom, this.fitZoom * 3.5));
        pinch = d; this.dragged = true; return;
      }
      pinch = 0;
      if (this.editDrag && p.isDown) { this.editMoveTo(p); this.dragged = true; return; }
      if (!p.isDown || !last || !startPt) return;
      if (!this.dragged && Phaser.Math.Distance.Between(p.x, p.y, startPt.x, startPt.y) < 7) return;
      this.dragged = true;
      cam.scrollX -= (p.x - last.x) / cam.zoom; cam.scrollY -= (p.y - last.y) / cam.zoom;
      last = { x: p.x, y: p.y };
    });
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => {
      pinch = 0; last = null;
      if (this.editDrag) { this.editUp(); this.time.delayedCall(30, () => (this.dragged = false)); return; }
      if (store.getSnapshot().ui.edit) { this.editTapEmpty(); return; }
      if (this.dragged) { this.time.delayedCall(30, () => (this.dragged = false)); return; }
      this.handleTap(p);
    });
    this.input.on('wheel', (_p: unknown, _o: unknown, _dx: number, dy: number) => this.zoomBy(dy > 0 ? 0.9 : 1.1));
  }

  /** Tap sobre el mundo: autos (pixel-perfect, de adelante hacia atrás) o plazas. */
  private handleTap(p: Phaser.Input.Pointer) {
    const s = store.getSnapshot();
    if (s.ui.edit || s.ui.visit) return;
    const world = this.cameras.main.getWorldPoint(p.x, p.y);
    const hits = this.input.hitTestPointer(p).filter((o): o is Phaser.GameObjects.Image => o instanceof Phaser.GameObjects.Image && o.getData('carId'));
    hits.sort((a, b) => b.depth - a.depth);
    if (hits.length) {
      const id = hits[0].getData('carId') as string;
      const job = s.save.jobs[id];
      if (job && job.done) { store.collectJob(id); return; }
      store.selectCar(id); store.dismissTutorial();
      return;
    }
    // plaza más cercana en pantalla
    let best = -1, bd = 1e9;
    for (let i = 0; i < TOTAL_SLOTS; i++) {
      if (!slotInPlay(s.save, i)) continue;
      const c = project(SLOT_WORLD[i][0], SLOT_WORLD[i][1]);
      const d = Phaser.Math.Distance.Between(world.x, world.y, c.x, c.y);
      if (d < bd) { bd = d; best = i; }
    }
    if (best < 0 || bd >= 150) {
      // zonas bloqueadas: tocar el terreno muestra qué cuesta y qué requiere
      const g = unproject(world.x, world.y);
      const z = ZONES.find((zz) => !hasZone(s.save, zz.id) && inRect(g, zz.rect));
      if (z) { this.zoneHint(z, s); return; }
      if (FUTURE_ZONES.some((f) => inRect(g, f.rect))) { store.toast('Esta área estará disponible en una próxima actualización', 'bad'); return; }
    }
    if (best >= 0 && bd < 150) {
      const occupied = s.save.cars.find((c) => c.slot === best);
      if (!isSlotUnlocked(s.save, best)) { store.openPanel('shop'); store.toast(`Plaza bloqueada: $${slotCost(best).toLocaleString('es')} en la tienda`, 'bad'); return; }
      if (occupied) { store.selectCar(occupied.id); return; }
      if (s.ui.selectedId) { store.moveCar(s.ui.selectedId, best); return; }
      store.openPanel('shop');
      return;
    }
    store.selectCar(null);
  }

  // ---------- plazas
  private slotCorners(i: number, hw = SLOT_HALF[0], hl = SLOT_HALF[1]): Phaser.Math.Vector2[] {
    const [cx, cy] = SLOT_WORLD[i];
    return [[-hw, -hl], [hw, -hl], [hw, hl], [-hw, hl]].map(([dx, dy]) => { const p = project(cx + dx, cy + dy); return new Phaser.Math.Vector2(p.x, p.y); });
  }
  private buildSlotLabels() {
    for (let i = 0; i < TOTAL_SLOTS; i++) {
      const c = project(SLOT_WORLD[i][0], SLOT_WORLD[i][1]);
      const t = this.add.text(c.x, c.y, '', { fontFamily: 'Fredoka, system-ui', fontSize: '26px', color: '#ffffff', stroke: '#0b1020', strokeThickness: 6, align: 'center' })
        .setOrigin(0.5).setDepth(3).setResolution(TEXT_RES);
      this.slotTexts.push(t);
    }
  }
  private drawSlots(s: Snapshot) {
    const g = this.slotGfx; g.clear();
    const occupied = new Set(s.save.cars.map((c) => c.slot));
    for (let i = 0; i < TOTAL_SLOTS; i++) {
      const t = this.slotTexts[i];
      if (!slotInPlay(s.save, i)) { t.setText(''); continue; }
      const pts = this.slotCorners(i);
      const locked = !isSlotUnlocked(s.save, i);
      const free = !locked && !occupied.has(i);
      if (locked) {
        g.fillStyle(0x05070f, 0.55); g.fillPoints(pts, true);
        g.lineStyle(3, 0x6b7390, 0.7); g.strokePoints(pts, true);
        t.setText(`🔒\n$${slotCost(i).toLocaleString('es')}`).setAlpha(0.95);
      } else if (free) {
        const moving = !!s.ui.selectedId;
        g.fillStyle(moving ? 0x38e08a : 0xffffff, moving ? 0.22 : 0.08); g.fillPoints(pts, true);
        g.lineStyle(4, moving ? 0x38e08a : 0xffffff, moving ? 0.95 : 0.4); g.strokePoints(pts, true);
        t.setText(moving ? 'Mover aquí' : '＋ Libre').setAlpha(moving ? 1 : 0.8);
      } else t.setText('');
    }
  }

  // ---------- zonas del lote
  private zoneHint(z: ZoneDef, s: Snapshot) {
    store.openPanel('shop');
    const need = s.save.level < z.minLevel ? `nivel ${z.minLevel}` : z.requires && !hasZone(s.save, z.requires) ? `comprar antes: ${ZONES.find((q) => q.id === z.requires)!.name}` : '';
    store.toast(`${z.name}: $${z.cost.toLocaleString('es')}${need ? ` · requiere ${need}` : ''}`, 'bad');
  }
  private zoneLabel(id: string, text: string, g: Pt) {
    let t = this.zoneTexts.get(id);
    if (!t) {
      t = this.add.text(0, 0, '', { fontFamily: 'Fredoka, system-ui', fontSize: '34px', color: '#ffffff', stroke: '#0b1020', strokeThickness: 7, align: 'center' })
        .setOrigin(0.5).setDepth(3).setResolution(TEXT_RES);
      this.zoneTexts.set(id, t);
    }
    const c = project((g.x), (g.y)); t.setPosition(c.x, c.y).setText(text);
  }
  /** Oscurece las zonas bloqueadas y rotula costo y requisitos; las compradas quedan limpias. */
  private drawZones(s: Snapshot) {
    const g = this.zoneGfx; g.clear();
    for (const z of ZONES) {
      const own = hasZone(s.save, z.id); const t = this.zoneTexts.get(z.id);
      const centre = { x: (z.rect[0] + z.rect[2]) / 2, y: (z.rect[1] + z.rect[3]) / 2 };
      if (own) { t?.setText(''); continue; }
      const pts = rectCorners(z.rect);
      const lvl = s.save.level < z.minLevel; const pre = !!z.requires && !hasZone(s.save, z.requires);
      const ready = !lvl && !pre;
      g.fillStyle(0x05070f, ready ? 0.38 : 0.6); g.fillPoints(pts, true);
      g.lineStyle(4, ready ? 0xffb02e : 0x6b7390, ready ? 0.95 : 0.7); g.strokePoints(pts, true);
      const req = lvl ? `Nivel ${z.minLevel}` : pre ? `Antes: ${ZONES.find((q) => q.id === z.requires)!.name}` : 'Disponible';
      this.zoneLabel(z.id, `🔒 ${z.name}\n$${z.cost.toLocaleString('es')} · ${req}`, centre);
    }
    for (const f of FUTURE_ZONES) {
      const pts = rectCorners(f.rect);
      g.fillStyle(0x05070f, 0.72); g.fillPoints(pts, true);
      g.lineStyle(3, 0x44506e, 0.6); g.strokePoints(pts, true);
      this.zoneLabel(f.id, `${f.name}\n${f.note}`, { x: (f.rect[0] + f.rect[2]) / 2, y: (f.rect[1] + f.rect[3]) / 2 });
    }
    // al desbloquear una zona nueva, la cámara se acerca a ella
    const n = (s.save.zones ?? []).length;
    if (this.zoneCount >= 0 && n > this.zoneCount) {
      const last = ZONES.find((q) => q.id === (s.save.zones ?? [])[n - 1]);
      if (last) { const c = project((last.rect[0] + last.rect[2]) / 2, (last.rect[1] + last.rect[3]) / 2); this.focusOn(c.x, c.y, Math.min(this.fitZoom, this.cameras.main.zoom * 1.3)); }
    }
    this.zoneCount = n;
  }

  // ---------- sincronización con el store
  private texFor(model: string, paint: string, rim: string) {
    const m = getModel(model); const key = `car:${m.spriteKey}:${paint}:${rim}`;
    if (!this.textures.exists(key)) {
      const canvas = this.painters[m.spriteKey].render(findPaint(paint).hex, findRim(rim).hex);
      this.textures.addCanvas(key, canvas);
    }
    return key;
  }

  /** Vista de solo lectura del garaje de un amigo: misma escena con sus autos, zonas, accesorios y acabados. */
  private visitSnap(s: Snapshot): Snapshot {
    const g = s.ui.visit!.garage;
    const save: Snapshot['save'] = {
      v: 1, money: 0, xp: 0, level: g.level, slotsUnlocked: g.slotsUnlocked, nextCarId: 0, jobs: {}, totalEarned: 0, jobsDone: 0, tutorialDone: true,
      cars: g.cars.map((c, i) => ({ id: `v${i}`, ...c })), zones: g.zones, placed: g.placed, style: g.style,
    };
    return { save, ui: { ...s.ui, selectedId: null, edit: null, preview: null, jobs: undefined } as Snapshot['ui'] };
  }

  private sync(s0: Snapshot) {
    let s = s0;
    if (!this.ready || s.ui.screen !== 'game') { if (this.ready) this.sprites(false); return; }
    const visiting = !!s.ui.visit;
    if (visiting !== this.visiting) {
      this.visiting = visiting; this.zoneCount = -1; this.styleSig = ''; this.ghostPos = null; this.editDrag = null;
      for (const v of this.placedViews.values()) v.img?.destroy(); this.placedViews.clear();
      const cam = this.cameras.main; cam.pan(CX, CY, 400, 'Sine.easeInOut'); cam.zoomTo(this.fitZoom, 400, 'Sine.easeInOut');
    }
    if (visiting) s = this.visitSnap(s);
    this.sprites(true);
    this.drawStyle(s);
    this.drawZones(s);
    this.drawSlots(s);
    if (visiting) { this.slotGfx.clear(); this.slotTexts.forEach((t) => t.setText('')); this.zoneTexts.forEach((t) => t.setText('')); }
    const seen = new Set<string>();
    for (const car of s.save.cars) {
      seen.add(car.id);
      const m = getModel(car.model); const info = SPRITE_INFO[m.spriteKey];
      const pv = s.ui.preview && s.ui.preview.carId === car.id ? s.ui.preview : null;
      const key = this.texFor(car.model, pv ? pv.paint : car.paint, pv ? pv.rim : car.rim);
      let v = this.cars.get(car.id);
      if (!v) {
        const sprite = this.add.image(0, 0, key).setOrigin(0).setData('carId', car.id);
        sprite.setInteractive({ pixelPerfect: true, alphaTolerance: 30 });
        const bar = this.add.graphics().setDepth(900);
        const icon = this.add.text(0, 0, '', { fontSize: '44px' }).setOrigin(0.5).setDepth(901).setResolution(TEXT_RES);
        const tag = this.add.text(0, 0, '', { fontFamily: 'Fredoka, system-ui', fontSize: '22px', color: '#fff', stroke: '#0b1020', strokeThickness: 5 }).setOrigin(0.5).setDepth(901).setResolution(TEXT_RES);
        v = { sprite, texKey: key, model: car.model, slot: -1, bar, icon, tag };
        this.cars.set(car.id, v);
      }
      if (v.texKey !== key) { v.sprite.setTexture(key); v.texKey = key; }
      const [sx, sy] = SLOT_WORLD[car.slot]; const [ax, ay] = info.anchorWorld;
      const d = { x: (sx - ax) * PROJ.x[0] + (sy - ay) * PROJ.y[0], y: (sx - ax) * PROJ.x[1] + (sy - ay) * PROJ.y[1] };
      const px = info.box[0] + d.x, py = info.box[1] + d.y;
      const c = project(sx, sy);
      const k = SPRITE_SCALE[m.spriteKey];
      v.sprite.setScale(k);
      // escala desde el centro de la plaza en el piso (el auto "se encoge" sin flotar)
      if (v.slot !== car.slot || v.model !== car.model) { v.sprite.setPosition(c.x + (px - c.x) * k, c.y + (py - c.y) * k); v.slot = car.slot; v.model = car.model; }
      v.sprite.setDepth(10 + c.y / 10);
      v.bar.setPosition(c.x, c.y - 215); v.icon.setPosition(c.x, c.y - 262); v.tag.setPosition(c.x, c.y + 120);
      v.tag.setText(m.name);
    }
    for (const [id, v] of this.cars) if (!seen.has(id)) { [v.sprite, v.bar, v.icon, v.tag].forEach((o) => o.destroy()); this.cars.delete(id); }
    this.drawOverlays(s);
    this.syncPlaced(s);
  }

  private sprites(visible: boolean) { this.cars.forEach((v) => [v.sprite, v.bar, v.icon, v.tag].forEach((o) => o.setVisible(visible))); this.slotGfx.setVisible(visible); this.ring.setVisible(visible); this.slotTexts.forEach((t) => t.setVisible(visible)); }

  private drawOverlays(s: Snapshot) {
    this.ring.clear();
    for (const car of s.save.cars) {
      const v = this.cars.get(car.id); if (!v) continue;
      const job = s.save.jobs[car.id];
      v.bar.clear(); v.icon.setText('').setScale(1);
      if (job) {
        const def = getJob(job.jobId);
        if (job.done || s.ui.now >= job.endsAt) { v.icon.setText('💰').setScale(1 + 0.12 * Math.sin(s.ui.now / 160)); v.tag.setText('¡Toca para cobrar!'); }
        else {
          const total = def.seconds * 1000, left = job.endsAt - s.ui.now, f = 1 - left / total;
          v.bar.fillStyle(0x05070f, 0.8); v.bar.fillRoundedRect(-70, 0, 140, 18, 9);
          v.bar.fillStyle(0xffb020, 1); v.bar.fillRoundedRect(-68, 2, Math.max(8, 136 * f), 14, 7);
          v.icon.setText(def.icon);
          v.tag.setText(`${def.name} · ${Math.ceil(left / 1000)}s`);
        }
      } else v.tag.setText(getModel(car.model).name);
      if (s.ui.selectedId === car.id) {
        const pts = this.slotCorners(car.slot, 1.9, 3.5);
        this.ring.lineStyle(6, 0xffb020, 1); this.ring.strokePoints(pts, true);
        this.ring.fillStyle(0xffb020, 0.14); this.ring.fillPoints(pts, true);
      }
    }
  }

  update() {
    // animación del cobro y refresco de timers sin esperar al tick
    const s = store.getSnapshot();
    if (s.ui.screen === 'game' && this.ready && !s.ui.visit) this.drawOverlays(s);
  }

  /** Acabados: tinte MULTIPLY sobre el suelo y los muros del garaje (debajo de autos y accesorios). */
  private drawStyle(s: Snapshot) {
    const fl = s.save.style?.floor ?? 'stock', wl = s.save.style?.wall ?? 'stock', sig = fl + wl + (s.save.zones ?? []).join(',');
    if (sig === this.styleSig) return; this.styleSig = sig;
    const g = this.styleGfx; g.clear();
    const quad = (pts: [number, number, number][], hex: number) => {
      if (hex === 0xffffff) return;
      g.fillStyle(hex, 1); g.fillPoints(pts.map(([x, y, z]) => { const q = project(x, y, z); return new Phaser.Math.Vector2(q.x, q.y); }), true);
    };
    const [x0, y0, x1, y1] = GARAGE_RECT, H = 3.7, fy = y1 - 0.48, rx = x1 - 0.2;
    const flHex = findFloor(fl).hex;
    for (const r of [GARAGE_RECT, ...ZONES.filter((z) => hasZone(s.save, z.id)).map((z) => z.rect)]) quad([[r[0], r[1], 0], [r[2], r[1], 0], [r[2], r[3], 0], [r[0], r[3], 0]], flHex);
    quad([[x0, fy, 0], [x1, fy, 0], [x1, fy, H], [x0, fy, H]], findWall(wl).hex);
    quad([[rx, y0, 0], [rx, fy, 0], [rx, fy, H], [rx, y0, H]], findWall(wl).hex);
  }

  // ---------- accesorios y modo "Editar garaje"
  private itemSig = (p: Placed) => `${p.item}:${p.x}:${p.y}:${p.rot}`;
  private syncPlaced(s: Snapshot) {
    const list = s.ui.edit ? s.ui.edit.draft : s.save.placed ?? [];
    const seen = new Set<string>();
    for (const p of list) {
      seen.add(p.uid);
      const def = getItem(p.item); if (!def) continue;
      let v = this.placedViews.get(p.uid);
      const sig = this.itemSig(p);
      if (v && v.sig === sig) continue;
      v?.img?.destroy();
      v = { sig };
      const tex = `item:${p.item}:${p.rot}`, info = ITEM_INFO[p.item]?.rots[p.rot];
      if (info && this.textures.exists(tex)) {
        const c = project(p.x, p.y);
        v.img = this.add.image(c.x - info.ax, c.y - info.ay, tex).setOrigin(0).setDepth(this.itemDepth(def, p));
      }
      this.placedViews.set(p.uid, v);
    }
    for (const [uid, v] of this.placedViews) if (!seen.has(uid)) { v.img?.destroy(); this.placedViews.delete(uid); }
    this.drawEdit(s);
  }
  private itemDepth(def: ItemDef, p: { x: number; y: number }) { return def.kind === 'wall' ? 4 : 5 + project(p.x, p.y + 0.0).y / 1000; }
  private poly(fp: [number, number, number, number], color: number, a: number) {
    const pts = rectCorners(fp).map((q) => new Phaser.Math.Vector2(q.x, q.y));
    this.editGfx.fillStyle(color, a); this.editGfx.fillPoints(pts, true);
    this.editGfx.lineStyle(4, color, 0.95); this.editGfx.strokePoints(pts, true);
  }
  /** Cuadrícula tenue, resaltado de la selección y vista previa (fantasma) con color de validez. */
  private drawEdit(s: Snapshot) {
    const g = this.editGfx; g.clear();
    this.ghostImg?.destroy(); this.ghostImg = undefined;
    const e = s.ui.edit; if (!e) return;
    const sel = e.draft.find((p) => p.uid === e.sel), selDef = sel && getItem(sel.item);
    if (sel && selDef && !(this.ghostPos && this.editDrag?.uid === sel.uid)) this.poly(footprint(selDef, sel.x, sel.y, sel.rot), 0xffb020, 0.18);
    const gp = this.ghostPos; if (!gp) return;
    const id = e.adding ?? (this.editDrag?.uid ? e.draft.find((p) => p.uid === this.editDrag!.uid)?.item : undefined);
    const def = id ? getItem(id) : undefined; if (!def) return;
    const col = gp.ok ? 0x38e08a : 0xff4d6a;
    this.poly(gp.fp, col, 0.28);
    const tex = `item:${def.id}:${gp.rot}`, info = ITEM_INFO[def.id]?.rots[gp.rot];
    if (info && this.textures.exists(tex)) { const c = project(gp.x, gp.y); this.ghostImg = this.add.image(c.x - info.ax, c.y - info.ay, tex).setOrigin(0).setAlpha(0.7).setDepth(949); }
  }
  private pointerToGround(p: Phaser.Input.Pointer): Pt { const w = this.cameras.main.getWorldPoint(p.x, p.y); return unproject(w.x, w.y); }
  private editVerdict(def: ItemDef, gx: number, gy: number, rot: Rot, ignoreUid: string | null): Verdict & { fp: [number, number, number, number] } {
    const s = store.getSnapshot(), others = s.ui.edit!.draft.filter((q) => q.uid !== ignoreUid), snap = s.ui.edit!.snap;
    let x = snapGrid(gx, snap), y = snapGrid(gy, snap), r = rot;
    if (def.kind === 'wall') {
      const w = snapWall(def, gx, gy, s.save);
      if (!w) { const fp0 = footprint(def, x, y, r); return { ok: false, reason: 'Va pegado a un muro', x, y, rot: r, fp: fp0 }; }
      x = w.x; y = w.y; r = w.rot;
    }
    const v = validate(def, x, y, r, s.save, others, getItem);
    return { ...v, x, y, rot: r, fp: footprint(def, x, y, r) };
  }
  private editDown(p: Phaser.Input.Pointer) {
    const e = store.getSnapshot().ui.edit!; const g = this.pointerToGround(p);
    if (e.adding) {
      const def = getItem(e.adding)!; this.editDrag = { uid: null, dx: 0, dy: 0 };
      this.ghostPos = this.editVerdict(def, g.x, g.y, this.editRot, null); this.drawEdit(store.getSnapshot()); return;
    }
    let hit: Placed | undefined, best = 1e9;
    for (const q of e.draft) {
      const d = getItem(q.item)!, fp = footprint(d, q.x, q.y, q.rot);
      const pad = 0.25;
      if (g.x >= fp[0] - pad && g.x <= fp[2] + pad && g.y >= fp[1] - pad && g.y <= fp[3] + pad) {
        const dist = Math.hypot(g.x - q.x, g.y - q.y); if (dist < best) { best = dist; hit = q; }
      }
    }
    if (hit) { store.editSelect(hit.uid); this.editDrag = { uid: hit.uid, dx: hit.x - g.x, dy: hit.y - g.y }; this.editRot = hit.rot; }
  }
  private editMoveTo(p: Phaser.Input.Pointer) {
    const d = this.editDrag!; const e = store.getSnapshot().ui.edit; if (!e) return;
    const g = this.pointerToGround(p);
    const id = d.uid ? e.draft.find((q) => q.uid === d.uid)?.item : e.adding; const def = id ? getItem(id) : undefined; if (!def) return;
    this.ghostPos = this.editVerdict(def, g.x + d.dx, g.y + d.dy, this.editRot, d.uid);
    this.drawEdit(store.getSnapshot());
  }
  private editUp() {
    const d = this.editDrag!, gp = this.ghostPos; this.editDrag = null; this.ghostPos = null;
    const e = store.getSnapshot().ui.edit; if (!e || !gp) { this.drawEdit(store.getSnapshot()); return; }
    if (d.uid) { if (gp.ok) store.editMove(d.uid, gp.x, gp.y, gp.rot); else store.toast(gp.reason, 'bad'); }
    else if (e.adding) { if (gp.ok) { store.editPlace(e.adding, gp.x, gp.y, gp.rot); this.editRot = 0; } else store.toast(gp.reason, 'bad'); }
    this.drawEdit(store.getSnapshot());
  }
  private editTapEmpty() { const e = store.getSnapshot().ui.edit; if (e?.sel) store.editSelect(null); }
  /** Botón Rotar: gira 90° la selección o el accesorio que se va a colocar. */
  editRotate() {
    const s = store.getSnapshot(), e = s.ui.edit; if (!e) return;
    const cur = e.draft.find((q) => q.uid === e.sel), def = e.adding ? getItem(e.adding) : cur ? getItem(cur.item) : undefined;
    if (!def) return;
    if (def.kind === 'wall') { store.toast('Los accesorios de pared se orientan solos según el muro', 'bad'); return; }
    const nr = (((cur ? cur.rot : this.editRot) + 1) % 4) as Rot;
    if (cur) store.editMove(cur.uid, cur.x, cur.y, nr); else { this.editRot = nr; }
  }

  focusCar(id: string) {
    const car = store.getSnapshot().save.cars.find((c) => c.id === id); if (!car) return;
    const c = project(SLOT_WORLD[car.slot][0], SLOT_WORLD[car.slot][1], 0.8);
    this.focusOn(c.x, c.y - 40);
  }
}
