import Phaser from 'phaser';
import { actions, getState, subscribe } from '../core/store';
import { ZONES } from '../data/zones';
import { bus } from './bus';
import { GARAGE_RETURN, drawDecor, drawGarageReturn, drawStreets, drawZoneBuilding } from './render/city';
import { iso } from './render/iso';

export class CityScene extends Phaser.Scene {
  private buildingsLayer!: Phaser.GameObjects.Graphics;
  private zoneObjects: Phaser.GameObjects.GameObject[] = [];
  private lockSig = '';
  private lastPinch = 0;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: Record<string, Phaser.Input.Keyboard.Key>;
  constructor() { super({ key: 'city', active: false }); }

  create() {
    actions.goToScene('city');
    const cam = this.cameras.main;
    cam.setBackgroundColor(0x181c26);
    drawStreets(this.add.graphics());
    drawDecor(this.add.graphics());
    drawGarageReturn(this.add.graphics());

    const garagePos = iso(GARAGE_RETURN.x + 1.2, GARAGE_RETURN.y + 1, 0.4);
    this.add.zone(garagePos.x, garagePos.y, 150, 120).setInteractive({ useHandCursor: true })
      .on('pointerup', (ptr: Phaser.Input.Pointer) => { if (ptr.getDistance() < 8) bus.emit('goto-garage'); });
    const glabel = iso(GARAGE_RETURN.x + 1.2, GARAGE_RETURN.y + 1, 2.2);
    this.add.text(glabel.x, glabel.y, '🔧 Volver al taller', { fontFamily: 'system-ui', fontSize: '13px', color: '#4dd0ff' })
      .setOrigin(0.5, 1).setShadow(0, 2, '#000000', 3, true, true);

    this.buildingsLayer = this.add.graphics();
    this.buildZones();

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
    const gotoGarage = () => this.scene.start('garage');
    bus.on('zoom-in', zoomIn); bus.on('zoom-out', zoomOut); bus.on('recenter', re); bus.on('goto-garage', gotoGarage);

    const unsub = subscribe(() => this.sync());
    this.sync();
    this.events.once('shutdown', () => {
      unsub(); bus.off('zoom-in', zoomIn); bus.off('zoom-out', zoomOut); bus.off('recenter', re); bus.off('goto-garage', gotoGarage);
    });
  }

  update(_t: number, dt: number) {
    const cam = this.cameras.main, s = (0.6 * dt) / cam.zoom;
    if (this.cursors.left.isDown || this.wasd.A.isDown) cam.scrollX -= s;
    if (this.cursors.right.isDown || this.wasd.D.isDown) cam.scrollX += s;
    if (this.cursors.up.isDown || this.wasd.W.isDown) cam.scrollY -= s;
    if (this.cursors.down.isDown || this.wasd.S.isDown) cam.scrollY += s;
  }

  private setZoom(z: number) { this.cameras.main.setZoom(Phaser.Math.Clamp(z, 0.3, 2)); }
  private recenter() { const cam = this.cameras.main; cam.setZoom(Phaser.Math.Clamp(this.scale.width / 900, 0.35, 1)); cam.centerOn(0, 260); }

  private buildZones() {
    this.zoneObjects.forEach((o) => o.destroy());
    this.zoneObjects = [];
    this.buildingsLayer.clear();
    ZONES.forEach((zone) => {
      const unlocked = actions.isZoneUnlocked(zone.id);
      const { zoneObj, label } = drawZoneBuilding(this, this.buildingsLayer, zone, unlocked);
      zoneObj.on('pointerup', (ptr: Phaser.Input.Pointer) => {
        if (ptr.getDistance() >= 8) return;
        actions.visitZone(zone.id);
        bus.emit('open-panel', unlocked ? zone.id : 'zone-locked:' + zone.id);
      });
      this.zoneObjects.push(zoneObj, label);
    });
  }

  private sync() {
    const s = getState();
    const sig = ZONES.map((z) => (s.unlockedZoneIds.includes(z.id) ? '1' : '0')).join('');
    if (sig !== this.lockSig) { this.buildZones(); this.lockSig = sig; }
  }
}
