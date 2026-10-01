import type Phaser from 'phaser';
import { box, iso, poly } from './iso';
import type { ZoneDef } from '../../data/zones';

export const CITY_GRID = 20;
export const GARAGE_RETURN = { x: 1.2, y: 1.2 };

// ARTE PROVISIONAL de la ciudad (formas vectoriales isométricas), en el mismo estilo
// que el taller. Sin ciclo día/noche ni tráfico animado en esta fase (ver README).
export function drawStreets(g: Phaser.GameObjects.Graphics) {
  const N = CITY_GRID;
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
    poly(g, [[i, j, 0], [i + 1, j, 0], [i + 1, j + 1, 0], [i, j + 1, 0]], (i + j) % 2 ? 0x2c3040 : 0x272b39);
  }
  g.fillStyle(0x394055, 1);
  for (let x = 0; x < N; x++) poly(g, [[x, 7, 0.01], [x + 1, 7, 0.01], [x + 1, 9, 0.01], [x, 9, 0.01]], 0x394055);
  for (let y = 0; y < N; y++) poly(g, [[8, y, 0.01], [10, y, 0.01], [10, y + 1, 0.01], [8, y + 1, 0.01]], 0x394055);
  g.lineStyle(1, 0xffe066, 0.5);
  for (let x = 0; x < N; x += 2) { const a = iso(x, 7.98, 0.02), b = iso(x + 1, 7.98, 0.02); g.lineBetween(a.x, a.y, b.x, b.y); }
}

export function drawDecor(g: Phaser.GameObjects.Graphics) {
  const tree = (x: number, y: number) => {
    box(g, x, y, 0, 0.25, 0.25, 0.5, 0x6b4a2b);
    const c = iso(x + 0.12, y + 0.12, 0.9);
    g.fillStyle(0x2f8f4e, 1).fillCircle(c.x, c.y, 22);
  };
  const light = (x: number, y: number) => {
    box(g, x, y, 0, 0.1, 0.1, 1.4, 0x2a2e3a);
    const c = iso(x + 0.05, y + 0.05, 1.5);
    g.fillStyle(0xffe066, 0.9).fillCircle(c.x, c.y, 6);
    g.fillStyle(0xffe066, 0.15).fillCircle(c.x, c.y, 26);
  };
  [[1.5, 3.5], [4.5, 12], [13, 3], [18, 9], [2.5, 17], [17, 15]].forEach(([x, y]) => tree(x, y));
  [[8.4, 5], [8.4, 11], [8.4, 14], [11, 7.4], [4, 7.4], [15, 7.4]].forEach(([x, y]) => light(x, y));
}

export function drawGarageReturn(g: Phaser.GameObjects.Graphics) {
  const { x, y } = GARAGE_RETURN;
  box(g, x, y, 0, 2.4, 2, 1.6, 0x394155);
  poly(g, [[x + 0.3, y, 0.2], [x + 1.4, y, 0.2], [x + 1.4, y, 1.2], [x + 0.3, y, 1.2]], 0x8892a6);
}

const RARITY_TEXT_STYLE = { fontFamily: 'system-ui', fontSize: '13px', color: '#eef1f6', align: 'center' as const };

export function drawZoneBuilding(scene: Phaser.Scene, layer: Phaser.GameObjects.Graphics, zone: ZoneDef, unlocked: boolean): { zoneObj: Phaser.GameObjects.Zone; label: Phaser.GameObjects.Text } {
  const w = 2.6, d = 2.2, h = unlocked ? 1.8 : 1.2;
  const color = unlocked ? zone.color : 0x3a3f4d;
  box(layer, zone.x, zone.y, 0, w, d, h, color);
  if (!unlocked) {
    const c = iso(zone.x + w / 2, zone.y + d / 2, h + 0.4);
    layer.fillStyle(0x000000, 0.55).fillCircle(c.x, c.y, 16);
  }
  const labelPos = iso(zone.x + w / 2, zone.y + d / 2, h + 1.1);
  const label = scene.add.text(labelPos.x, labelPos.y, (unlocked ? '' : '🔒 ') + zone.name, RARITY_TEXT_STYLE).setOrigin(0.5, 1);
  label.setShadow(0, 2, '#000000', 3, true, true);
  const zc = iso(zone.x + w / 2, zone.y + d / 2, 0.4);
  const zoneObj = scene.add.zone(zc.x, zc.y, 140, 130).setInteractive({ useHandCursor: true });
  return { zoneObj, label };
}
