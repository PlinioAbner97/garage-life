import type Phaser from 'phaser';
import { box, iso, outline, poly, shade, shadowBlob } from './iso';
import type { ZoneDef } from '../../data/zones';

export const CITY_GRID = 20;
export const GARAGE_RETURN = { x: 1.2, y: 1.2 };

// Arte vectorial propio de la ciudad, mismo lenguaje visual que el taller (Fase 5):
// degradados, sombras de contacto y contornos en vez de bloques planos.
// Sin ciclo día/noche ni tráfico animado en esta fase (ver README).
export function drawStreets(g: Phaser.GameObjects.Graphics) {
  const N = CITY_GRID;
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
    poly(g, [[i, j, 0], [i + 1, j, 0], [i + 1, j + 1, 0], [i, j + 1, 0]], (i + j) % 2 ? 0x2c3040 : 0x272b39);
  }
  // avenida principal con acera (bordillo) + carril central punteado + cruce peatonal
  for (let x = 0; x < N; x++) poly(g, [[x, 7, 0.01], [x + 1, 7, 0.01], [x + 1, 9, 0.01], [x, 9, 0.01]], 0x33384a);
  for (let y = 0; y < N; y++) poly(g, [[8, y, 0.01], [10, y, 0.01], [10, y + 1, 0.01], [8, y + 1, 0.01]], 0x33384a);
  g.fillStyle(0x474d63, 1);
  for (let x = 0; x < N; x++) { poly(g, [[x, 6.9, 0.015], [x + 1, 6.9, 0.015], [x + 1, 7, 0.015], [x, 7, 0.015]], 0x474d63); poly(g, [[x, 9, 0.015], [x + 1, 9, 0.015], [x + 1, 9.1, 0.015], [x, 9.1, 0.015]], 0x474d63); }
  g.lineStyle(2, 0xffe066, 0.55);
  for (let x = 0; x < N; x += 2) { const a = iso(x, 7.98, 0.02), b = iso(x + 1, 7.98, 0.02); g.lineBetween(a.x, a.y, b.x, b.y); }
  g.lineStyle(2, 0xd8dce6, 0.4);
  for (let y = 0; y < N; y += 2) { const a = iso(8.98, y, 0.02), b = iso(8.98, y + 1, 0.02); g.lineBetween(a.x, a.y, b.x, b.y); }
  g.fillStyle(0xd8dce6, 0.5);
  for (let k = 0; k < 4; k++) poly(g, [[7.6 + k * 0.3, 7.15, 0.02], [7.75 + k * 0.3, 7.15, 0.02], [7.75 + k * 0.3, 8.85, 0.02], [7.6 + k * 0.3, 8.85, 0.02]], 0xd8dce6);
}

export function drawDecor(g: Phaser.GameObjects.Graphics) {
  const tree = (x: number, y: number) => {
    const base = iso(x + 0.12, y + 0.12, 0);
    shadowBlob(g, base.x, base.y + 4, 24, 10, 0.3);
    box(g, x, y, 0, 0.25, 0.25, 0.5, 0x6b4a2b);
    const c = iso(x + 0.12, y + 0.12, 0.95);
    g.fillStyle(0x1f5f34, 1).fillCircle(c.x, c.y + 3, 23);
    g.fillStyle(0x2f8f4e, 1).fillCircle(c.x, c.y, 21);
    g.fillStyle(0x55c379, 0.55).fillCircle(c.x - 7, c.y - 8, 9);
  };
  const light = (x: number, y: number) => {
    const base = iso(x + 0.05, y + 0.05, 0);
    shadowBlob(g, base.x, base.y + 3, 12, 6, 0.25);
    box(g, x, y, 0, 0.1, 0.1, 1.4, 0x2a2e3a);
    const c = iso(x + 0.05, y + 0.05, 1.5);
    g.fillStyle(0xffe066, 0.9).fillCircle(c.x, c.y, 6);
    g.fillStyle(0xffe066, 0.16).fillCircle(c.x, c.y, 30);
  };
  [[1.5, 3.5], [4.5, 12], [13, 3], [18, 9], [2.5, 17], [17, 15]].forEach(([x, y]) => tree(x, y));
  [[8.4, 5], [8.4, 11], [8.4, 14], [11, 7.4], [4, 7.4], [15, 7.4]].forEach(([x, y]) => light(x, y));
}

export function drawGarageReturn(g: Phaser.GameObjects.Graphics) {
  const { x, y } = GARAGE_RETURN;
  const base = iso(x + 1.2, y + 1, 0);
  shadowBlob(g, base.x, base.y + 6, 60, 26, 0.35);
  box(g, x, y, 0, 2.4, 2, 1.6, 0x394155);
  box(g, x - 0.05, y - 0.05, 1.6, 2.5, 2.1, 0.12, 0x2a3143); // techo con alero
  poly(g, [[x + 0.3, y, 0.2], [x + 1.4, y, 0.2], [x + 1.4, y, 1.2], [x + 0.3, y, 1.2]], 0x8892a6);
  g.lineStyle(1.5, 0x5d667a, 0.8);
  for (let k = 1; k < 3; k++) { const a = iso(x + 0.3, y, 0.2 + k * 0.33), b = iso(x + 1.4, y, 0.2 + k * 0.33); g.lineBetween(a.x, a.y, b.x, b.y); }
  outline(g, [[x, y, 1.6], [x + 2.4, y, 1.6], [x + 2.4, y + 2, 1.6], [x, y + 2, 1.6]], 0x000000, 0.3, 1);
}

const LABEL_STYLE = { fontFamily: 'system-ui', fontSize: '13px', color: '#eef1f6', align: 'center' as const, fontStyle: 'bold' as const };

export function drawZoneBuilding(scene: Phaser.Scene, layer: Phaser.GameObjects.Graphics, zone: ZoneDef, unlocked: boolean): { zoneObj: Phaser.GameObjects.Zone; label: Phaser.GameObjects.Text } {
  const w = 2.6, d = 2.2, h = unlocked ? 1.8 : 1.2;
  const color = unlocked ? zone.color : 0x3a3f4d;
  const base = iso(zone.x + w / 2, zone.y + d / 2, 0);
  shadowBlob(layer, base.x, base.y + 6, w * 24, d * 20, 0.35);
  box(layer, zone.x, zone.y, 0, w, d, h, color);
  // techo con reborde + "letrero" en la fachada frontal para que lea como un local, no un bloque
  box(layer, zone.x - 0.06, zone.y - 0.06, h, w + 0.12, d + 0.12, 0.14, shade(color, 0.6));
  poly(layer, [[zone.x + 0.3, zone.y, h * 0.55], [zone.x + w - 0.3, zone.y, h * 0.55], [zone.x + w - 0.3, zone.y, h * 0.8], [zone.x + 0.3, zone.y, h * 0.8]], unlocked ? 0xfff4d6 : 0x565c6c, 0.85);
  outline(layer, [[zone.x, zone.y, h], [zone.x + w, zone.y, h], [zone.x + w, zone.y + d, h], [zone.x, zone.y + d, h]], 0x000000, 0.3, 1);
  if (!unlocked) {
    const c = iso(zone.x + w / 2, zone.y + d / 2, h + 0.5);
    layer.fillStyle(0x000000, 0.6).fillCircle(c.x, c.y, 17);
    layer.lineStyle(2, 0x8d96a8, 0.8).strokeCircle(c.x, c.y, 17);
  }
  const labelPos = iso(zone.x + w / 2, zone.y + d / 2, h + 1.15);
  const label = scene.add.text(labelPos.x, labelPos.y, (unlocked ? '' : '🔒 ') + zone.name, LABEL_STYLE).setOrigin(0.5, 1);
  label.setShadow(0, 2, '#000000', 4, true, true);
  const zc = iso(zone.x + w / 2, zone.y + d / 2, 0.4);
  const zoneObj = scene.add.zone(zc.x, zc.y, 140, 130).setInteractive({ useHandCursor: true });
  return { zoneObj, label };
}
