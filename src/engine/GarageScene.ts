import Phaser from 'phaser';
import { store, type Snapshot } from '../core/store';
import { SLOT_COUNT, SLOT_UNLOCK_COST, SLOT_WORLD } from '../data/config';
import { getModel } from '../data/vehicles';
import { findPaint, findRim } from '../data/parts';
import { getJob } from '../data/jobs';
import { dpr, TEXT_RES } from './dpr';
import { CarPainter, type PainterMap } from './recolor';
import { ASSETS, BG, PROJ, SPRITE_INFO, SPRITE_KEYS, SPRITE_SCALE } from './assets';

// Mundo = imagen de fondo (con margen extra). Centro y tamaño salen de BG.
const WW = BG.w, HH = BG.h, CX = BG.x + BG.w / 2, CY = BG.y + BG.h / 2;
type Pt = { x: number; y: number };
/** Proyección ortográfica de la cámara de Blender: mundo (x,y,z) -> píxel del render. */
const project = (x: number, y: number, z = 0): Pt => ({
  x: PROJ.origin[0] + x * PROJ.x[0] + y * PROJ.y[0] + z * PROJ.z[0],
  y: PROJ.origin[1] + x * PROJ.x[1] + y * PROJ.y[1] + z * PROJ.z[1],
});

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
  private ready = false;

  constructor() { super('garage'); }

  preload() {
    this.load.image('bg', ASSETS.bg);
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
    this.add.image(BG.x, BG.y, 'bg').setOrigin(0).setDepth(0);
    this.slotGfx = this.add.graphics().setDepth(1);
    this.ring = this.add.graphics().setDepth(2);
    this.buildSlotLabels();

    const cam = this.cameras.main;
    cam.setBounds(BG.x - 300, BG.y - 300, WW + 600, HH + 600);
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
    if (!onlyIfFitted || wasFitted) { cam.setZoom(z); cam.centerOn(CX, CY); }
  }
  focusOn(x: number, y: number, zoom = Math.max(this.fitZoom * 1.7, dpr())) {
    const cam = this.cameras.main;
    cam.pan(x, y, 450, 'Sine.easeInOut'); cam.zoomTo(zoom, 450, 'Sine.easeInOut');
  }
  resetView() {
    const cam = this.cameras.main; cam.pan(CX, CY, 400, 'Sine.easeInOut'); cam.zoomTo(this.fitZoom, 400, 'Sine.easeInOut');
  }
  zoomBy(f: number) {
    const cam = this.cameras.main;
    cam.zoomTo(Phaser.Math.Clamp(cam.zoom * f, this.fitZoom * 0.85, this.fitZoom * 3.5), 180);
  }

  private setupInput() {
    const cam = this.cameras.main;
    let last: Pt | null = null; let startPt: Pt | null = null;
    let pinch = 0;
    this.input.addPointer(1);
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => { last = { x: p.x, y: p.y }; startPt = { x: p.x, y: p.y }; this.dragged = false; });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      const p1 = this.input.pointer1, p2 = this.input.pointer2;
      if (p1.isDown && p2.isDown) {
        const d = Phaser.Math.Distance.Between(p1.x, p1.y, p2.x, p2.y);
        if (pinch) cam.setZoom(Phaser.Math.Clamp(cam.zoom * (d / pinch), this.fitZoom * 0.85, this.fitZoom * 3.5));
        pinch = d; this.dragged = true; return;
      }
      pinch = 0;
      if (!p.isDown || !last || !startPt) return;
      if (!this.dragged && Phaser.Math.Distance.Between(p.x, p.y, startPt.x, startPt.y) < 7) return;
      this.dragged = true;
      cam.scrollX -= (p.x - last.x) / cam.zoom; cam.scrollY -= (p.y - last.y) / cam.zoom;
      last = { x: p.x, y: p.y };
    });
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => {
      pinch = 0; last = null;
      if (this.dragged) { this.time.delayedCall(30, () => (this.dragged = false)); return; }
      this.handleTap(p);
    });
    this.input.on('wheel', (_p: unknown, _o: unknown, _dx: number, dy: number) => this.zoomBy(dy > 0 ? 0.9 : 1.1));
  }

  /** Tap sobre el mundo: autos (pixel-perfect, de adelante hacia atrás) o plazas. */
  private handleTap(p: Phaser.Input.Pointer) {
    const s = store.getSnapshot();
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
    for (let i = 0; i < SLOT_COUNT; i++) {
      const c = project(SLOT_WORLD[i][0], SLOT_WORLD[i][1]);
      const d = Phaser.Math.Distance.Between(world.x, world.y, c.x, c.y);
      if (d < bd) { bd = d; best = i; }
    }
    if (best >= 0 && bd < 150) {
      const occupied = s.save.cars.find((c) => c.slot === best);
      if (best >= s.save.slotsUnlocked) { store.openPanel('shop'); store.toast(`Plaza bloqueada: $${SLOT_UNLOCK_COST[best].toLocaleString('es')} en la tienda`, 'bad'); return; }
      if (occupied) { store.selectCar(occupied.id); return; }
      if (s.ui.selectedId) { store.moveCar(s.ui.selectedId, best); return; }
      store.openPanel('shop');
      return;
    }
    store.selectCar(null);
  }

  // ---------- plazas
  private slotCorners(i: number, hw = 1.7, hl = 3.3): Phaser.Math.Vector2[] {
    const [cx, cy] = SLOT_WORLD[i];
    return [[-hw, -hl], [hw, -hl], [hw, hl], [-hw, hl]].map(([dx, dy]) => { const p = project(cx + dx, cy + dy); return new Phaser.Math.Vector2(p.x, p.y); });
  }
  private buildSlotLabels() {
    for (let i = 0; i < SLOT_COUNT; i++) {
      const c = project(SLOT_WORLD[i][0], SLOT_WORLD[i][1]);
      const t = this.add.text(c.x, c.y, '', { fontFamily: 'Fredoka, system-ui', fontSize: '26px', color: '#ffffff', stroke: '#0b1020', strokeThickness: 6, align: 'center' })
        .setOrigin(0.5).setDepth(3).setResolution(TEXT_RES);
      this.slotTexts.push(t);
    }
  }
  private drawSlots(s: Snapshot) {
    const g = this.slotGfx; g.clear();
    const occupied = new Set(s.save.cars.map((c) => c.slot));
    for (let i = 0; i < SLOT_COUNT; i++) {
      const pts = this.slotCorners(i);
      const locked = i >= s.save.slotsUnlocked;
      const free = !locked && !occupied.has(i);
      const t = this.slotTexts[i];
      if (locked) {
        g.fillStyle(0x05070f, 0.55); g.fillPoints(pts, true);
        g.lineStyle(3, 0x6b7390, 0.7); g.strokePoints(pts, true);
        t.setText(`🔒\n$${SLOT_UNLOCK_COST[i].toLocaleString('es')}`).setAlpha(0.95);
      } else if (free) {
        const moving = !!s.ui.selectedId;
        g.fillStyle(moving ? 0x38e08a : 0xffffff, moving ? 0.22 : 0.08); g.fillPoints(pts, true);
        g.lineStyle(4, moving ? 0x38e08a : 0xffffff, moving ? 0.95 : 0.4); g.strokePoints(pts, true);
        t.setText(moving ? 'Mover aquí' : '＋ Libre').setAlpha(moving ? 1 : 0.8);
      } else t.setText('');
    }
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

  private sync(s: Snapshot) {
    if (!this.ready || s.ui.screen !== 'game') { if (this.ready) this.sprites(false); return; }
    this.sprites(true);
    this.drawSlots(s);
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
      if (v.slot !== car.slot) { v.sprite.setPosition(c.x + (px - c.x) * k, c.y + (py - c.y) * k); v.slot = car.slot; }
      v.sprite.setDepth(10 + c.y / 10);
      v.bar.setPosition(c.x, c.y - 215); v.icon.setPosition(c.x, c.y - 262); v.tag.setPosition(c.x, c.y + 120);
      v.tag.setText(m.name);
    }
    for (const [id, v] of this.cars) if (!seen.has(id)) { [v.sprite, v.bar, v.icon, v.tag].forEach((o) => o.destroy()); this.cars.delete(id); }
    this.drawOverlays(s);
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
    if (s.ui.screen === 'game' && this.ready) this.drawOverlays(s);
  }

  focusCar(id: string) {
    const car = store.getSnapshot().save.cars.find((c) => c.id === id); if (!car) return;
    const c = project(SLOT_WORLD[car.slot][0], SLOT_WORLD[car.slot][1], 0.8);
    this.focusOn(c.x, c.y - 40);
  }
}
