import Phaser from 'phaser';
import { actions, getState, subscribe } from '../core/store';
import { modelById, type VehicleModel } from '../data/catalog';
import { bus } from './bus';
import { drawCar } from './render/car';
import { drawGarage } from './render/garage';
import { iso } from './render/iso';

interface CarView { root: Phaser.GameObjects.Container; gfx: Phaser.GameObjects.Graphics; ring: Phaser.GameObjects.Graphics; key: string }
const SLOTS = [{ x: 3.1, y: 3.1 }, { x: 3.1, y: 6.6 }];

export class GarageScene extends Phaser.Scene {
  private views = new Map<string, CarView>();
  private lastPinch = 0;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: Record<string, Phaser.Input.Keyboard.Key>;
  constructor() { super('garage'); }

  create() {
    drawGarage(this.add.graphics());
    const cam = this.cameras.main;
    cam.setBackgroundColor(0x11141c);
    this.recenter();
    this.input.addPointer(1);

    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      const a = this.input.pointer1, b = this.input.pointer2;
      if (a.isDown && b.isDown) { // pellizco táctil
        const d = Phaser.Math.Distance.Between(a.x, a.y, b.x, b.y);
        if (this.lastPinch) this.setZoom(cam.zoom * (d / this.lastPinch));
        this.lastPinch = d; return;
      }
      this.lastPinch = 0;
      if (p.isDown) { cam.scrollX -= (p.x - p.prevPosition.x) / cam.zoom; cam.scrollY -= (p.y - p.prevPosition.y) / cam.zoom; }
    });
    this.input.on('pointerup', (p: Phaser.Input.Pointer, over: unknown[]) => {
      this.lastPinch = 0;
      if (over.length === 0 && p.getDistance() < 8) actions.select(null);
    });
    this.input.on('wheel', (_p: unknown, _o: unknown, _dx: number, dy: number) => this.setZoom(cam.zoom * (dy > 0 ? 0.9 : 1.1)));

    const kb = this.input.keyboard!;
    this.cursors = kb.createCursorKeys();
    this.wasd = kb.addKeys('W,A,S,D') as Record<string, Phaser.Input.Keyboard.Key>;
    kb.on('keydown', (e: KeyboardEvent) => {
      if (e.key === '+' || e.key === '=') this.setZoom(cam.zoom * 1.15);
      if (e.key === '-') this.setZoom(cam.zoom / 1.15);
    });

    const zoomIn = () => this.setZoom(cam.zoom * 1.2), zoomOut = () => this.setZoom(cam.zoom / 1.2), re = () => this.recenter();
    bus.on('zoom-in', zoomIn); bus.on('zoom-out', zoomOut); bus.on('recenter', re);
    const unsub = subscribe(() => this.sync());
    this.sync();
    this.events.once('shutdown', () => { unsub(); bus.off('zoom-in', zoomIn); bus.off('zoom-out', zoomOut); bus.off('recenter', re); });
  }

  update(_t: number, dt: number) {
    const cam = this.cameras.main, s = (0.5 * dt) / cam.zoom;
    if (this.cursors.left.isDown || this.wasd.A.isDown) cam.scrollX -= s;
    if (this.cursors.right.isDown || this.wasd.D.isDown) cam.scrollX += s;
    if (this.cursors.up.isDown || this.wasd.W.isDown) cam.scrollY -= s;
    if (this.cursors.down.isDown || this.wasd.S.isDown) cam.scrollY += s;
  }

  private setZoom(z: number) { this.cameras.main.setZoom(Phaser.Math.Clamp(z, 0.4, 2.5)); }
  private recenter() {
    const cam = this.cameras.main;
    cam.setZoom(Phaser.Math.Clamp(this.scale.width / 700, 0.5, 1.3));
    cam.centerOn(0, 150);
  }

  private makeView(uid: string, m: VehicleModel, i: number): CarView {
    const p = iso(SLOTS[i % SLOTS.length].x, SLOTS[i % SLOTS.length].y, i === 0 ? 0.12 : 0);
    const c = iso(m.length / 2, m.width / 2, 0);
    const ring = this.add.graphics().lineStyle(3, 0x4dd0ff, 1).strokeEllipse(c.x, c.y + 4, (m.length + m.width) * 38, (m.length + m.width) * 19).setVisible(false);
    const gfx = this.add.graphics();
    const zone = this.add.zone(c.x, c.y - 18, 190, 100).setInteractive({ useHandCursor: true });
    zone.on('pointerup', (ptr: Phaser.Input.Pointer) => { if (ptr.getDistance() < 8) actions.select(uid); });
    const root = this.add.container(p.x, p.y, [ring, gfx, zone]).setDepth(p.y);
    return { root, gfx, ring, key: '' };
  }

  private sync() {
    const s = getState();
    s.cars.forEach((car, i) => {
      const m = modelById(car.modelId);
      let v = this.views.get(car.uid);
      if (!v) { v = this.makeView(car.uid, m, i); this.views.set(car.uid, v); }
      const key = `${car.paint}-${car.rims}`;
      if (v.key !== key) { drawCar(v.gfx, m, car.paint, car.rims); v.key = key; }
      v.ring.setVisible(s.selectedUid === car.uid);
    });
  }
}
