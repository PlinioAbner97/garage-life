import Phaser from 'phaser';
import { actions, floorTier, garageCapacity, getDisplayVehicle, getPreview, getState, lightingTier, liftCount, subscribe } from '../core/store';
import type { CarBuild } from '../core/types';
import { resolvePaintColor } from '../data/parts';
import { vehicleById } from '../data/vehicles';
import { bus } from './bus';
import { drawCar } from './render/car';
import {
  ACTIVE_ANCHOR, BARREL, STORAGE_SLOTS, TIRE_RACK, TOOL_CABINET,
  drawDecor, drawFloor, drawLifts, drawLighting, drawShell, drawStorageSlot,
} from './render/garage';
import { iso } from './render/iso';

export class GarageScene extends Phaser.Scene {
  private carGfx!: Phaser.GameObjects.Graphics;
  private carZone!: Phaser.GameObjects.Zone;
  private carAnchor = { x: 0, y: 0 };
  private floorGfx!: Phaser.GameObjects.Graphics;
  private liftsGfx!: Phaser.GameObjects.Graphics;
  private lightGfx!: Phaser.GameObjects.Graphics;
  private storageGfx!: Phaser.GameObjects.Graphics;
  private carKey = '';
  private sig = '';
  private lastPinch = 0;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: Record<string, Phaser.Input.Keyboard.Key>;
  constructor() { super('garage'); }

  create() {
    actions.goToScene('garage');
    const cam = this.cameras.main;
    cam.setBackgroundColor(0x11141c);
    drawShell(this.add.graphics());
    this.floorGfx = this.add.graphics();
    this.liftsGfx = this.add.graphics();
    drawDecor(this.add.graphics());
    this.lightGfx = this.add.graphics();
    this.storageGfx = this.add.graphics();
    void BARREL; void TIRE_RACK;

    STORAGE_SLOTS.forEach((pos) => {
      const c = iso(pos.x + 0.75, pos.y + 0.42, 0.2);
      this.add.zone(c.x, c.y, 100, 70).setInteractive({ useHandCursor: true })
        .on('pointerup', (ptr: Phaser.Input.Pointer) => { if (ptr.getDistance() < 8) bus.emit('open-panel', 'collection'); });
    });

    const toolC = iso(TOOL_CABINET.x + 0.4, TOOL_CABINET.y + 0.4, 0.5);
    this.add.zone(toolC.x, toolC.y, 90, 110).setInteractive({ useHandCursor: true })
      .on('pointerup', (ptr: Phaser.Input.Pointer) => { if (ptr.getDistance() < 8) bus.emit('open-panel', 'workshop'); });

    this.carAnchor = iso(ACTIVE_ANCHOR.x, ACTIVE_ANCHOR.y, 0.12);
    this.carGfx = this.add.graphics().setPosition(this.carAnchor.x, this.carAnchor.y);
    this.carZone = this.add.zone(this.carAnchor.x, this.carAnchor.y, 210, 120).setInteractive({ useHandCursor: true });
    this.carZone.on('pointerup', (ptr: Phaser.Input.Pointer) => {
      if (ptr.getDistance() < 8) bus.emit('open-panel', getDisplayVehicle().isJob ? 'jobs' : 'garage');
    });

    this.recenter();
    this.input.addPointer(1);
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      const a = this.input.pointer1, b = this.input.pointer2;
      if (a.isDown && b.isDown) {
        const d = Phaser.Math.Distance.Between(a.x, a.y, b.x, b.y);
        if (this.lastPinch) this.setZoom(cam.zoom * (d / this.lastPinch));
        this.lastPinch = d; return;
      }
      this.lastPinch = 0;
      if (p.isDown) { cam.scrollX -= (p.x - p.prevPosition.x) / cam.zoom; cam.scrollY -= (p.y - p.prevPosition.y) / cam.zoom; }
    });
    this.input.on('pointerup', () => { this.lastPinch = 0; });
    this.input.on('wheel', (_p: unknown, _o: unknown, _dx: number, dy: number) => this.setZoom(cam.zoom * (dy > 0 ? 0.9 : 1.1)));

    const kb = this.input.keyboard!;
    this.cursors = kb.createCursorKeys();
    this.wasd = kb.addKeys('W,A,S,D') as Record<string, Phaser.Input.Keyboard.Key>;
    kb.on('keydown', (e: KeyboardEvent) => {
      if (e.key === '+' || e.key === '=') this.setZoom(cam.zoom * 1.15);
      if (e.key === '-') this.setZoom(cam.zoom / 1.15);
    });

    const zoomIn = () => this.setZoom(cam.zoom * 1.2), zoomOut = () => this.setZoom(cam.zoom / 1.2), re = () => this.recenter();
    const gotoCity = () => this.scene.start('city');
    bus.on('zoom-in', zoomIn); bus.on('zoom-out', zoomOut); bus.on('recenter', re); bus.on('goto-city', gotoCity);

    const unsub = subscribe(() => this.sync());
    this.sync();
    this.events.once('shutdown', () => { unsub(); bus.off('zoom-in', zoomIn); bus.off('zoom-out', zoomOut); bus.off('recenter', re); bus.off('goto-city', gotoCity); });
  }

  update(_t: number, dt: number) {
    const cam = this.cameras.main, s = (0.5 * dt) / cam.zoom;
    if (this.cursors.left.isDown || this.wasd.A.isDown) cam.scrollX -= s;
    if (this.cursors.right.isDown || this.wasd.D.isDown) cam.scrollX += s;
    if (this.cursors.up.isDown || this.wasd.W.isDown) cam.scrollY -= s;
    if (this.cursors.down.isDown || this.wasd.S.isDown) cam.scrollY += s;
  }

  private setZoom(z: number) { this.cameras.main.setZoom(Phaser.Math.Clamp(z, 0.4, 2.5)); }
  private recenter() { const cam = this.cameras.main; cam.setZoom(Phaser.Math.Clamp(this.scale.width / 700, 0.5, 1.3)); cam.centerOn(70, 170); }

  private sync() {
    const s = getState();
    const disp = getDisplayVehicle();
    const m = vehicleById(disp.modelId);
    const pv = getPreview();
    const build: CarBuild = pv && pv.uid === disp.uid ? { ...disp.build, [pv.category]: pv.value } : disp.build;
    const carKey = JSON.stringify(build) + '|' + disp.modelId + '|' + disp.isJob;
    if (carKey !== this.carKey) {
      drawCar(this.carGfx, m, build);
      this.carGfx.setScale(build.facing, 1);
      const centerLocal = iso(m.length / 2, m.width / 2, 0);
      this.carZone.setPosition(this.carAnchor.x + centerLocal.x, this.carAnchor.y + centerLocal.y - 20);
      this.carKey = carKey;
    }

    const sig = `${liftCount()}|${floorTier()}|${lightingTier()}|${s.cars.length}|${garageCapacity()}|${s.selectedUid}`;
    if (sig !== this.sig) {
      this.floorGfx.clear(); drawFloor(this.floorGfx, floorTier());
      this.liftsGfx.clear(); drawLifts(this.liftsGfx, liftCount());
      this.lightGfx.clear(); drawLighting(this.lightGfx, lightingTier());
      this.storageGfx.clear();
      const others = s.cars.filter((c) => c.uid !== s.selectedUid);
      const cap = garageCapacity();
      STORAGE_SLOTS.forEach((pos, i) => {
        const locked = i >= cap - 1; // -1 porque un auto siempre está en el elevador principal
        const oc = others[i];
        const color = oc ? resolvePaintColor(oc.build.paint) : 0x2a2f3b;
        drawStorageSlot(this.storageGfx, pos, !!oc, locked, color);
      });
      this.sig = sig;
    }
  }
}
