import type Phaser from 'phaser';
import { box, iso, poly } from './iso';

export const GRID = 10;
export const ACTIVE_ANCHOR = { x: 2.6, y: 2.6 };
export const TOOL_CABINET = { x: 8.3, y: 3.0 };
export const TIRE_RACK = { x: 8.6, y: 6.3 };
export const BARREL = { x: 8.6, y: 1.2 };
export const STORAGE_SLOTS = [
  { x: 1.0, y: 8.7 }, { x: 2.9, y: 8.7 }, { x: 4.8, y: 8.7 }, { x: 6.7, y: 8.7 },
];
const LIFT_BAYS = [
  { x: 2.4, y: 2.4, w: 4.2, h: 2.6 },
  { x: 2.2, y: 5.6, w: 2.0, h: 1.1 },
  { x: 4.6, y: 5.6, w: 2.0, h: 1.1 },
];

// ARTE PROVISIONAL del taller (formas vectoriales isométricas), dividido en capas
// para poder redibujar solo lo que cambia (piso, elevadores, iluminación, almacenamiento).
export function drawShell(g: Phaser.GameObjects.Graphics) {
  const N = GRID, H = 3.6;
  poly(g, [[0, 0, 0], [N, 0, 0], [N, 0, H], [0, 0, H]], 0x2b3a55);
  poly(g, [[0, 0, 0], [0, N, 0], [0, N, H], [0, 0, H]], 0x22304a);
  poly(g, [[0, 2, 0], [0, 6, 0], [0, 6, 2.6], [0, 2, 2.6]], 0x8892a6);
  g.lineStyle(2, 0x5d667a, 1);
  for (let k = 1; k < 6; k++) { const a = iso(0, 2, k * 0.43), b = iso(0, 6, k * 0.43); g.lineBetween(a.x, a.y, b.x, b.y); }
  poly(g, [[6, 0, 1.4], [8.5, 0, 1.4], [8.5, 0, 2.8], [6, 0, 2.8]], 0x9ad1ff);
  poly(g, [[1.5, 0, 3], [4.5, 0, 3], [4.5, 0, 3.3], [1.5, 0, 3.3]], 0xff4d6d);
}

export function drawDecor(g: Phaser.GameObjects.Graphics) {
  box(g, TIRE_RACK.x, TIRE_RACK.y, 0, 0.8, 1.2, 0.9, 0xc0392b);
  box(g, TOOL_CABINET.x, TOOL_CABINET.y, 0, 0.8, 0.8, 1.1, 0x1a1a1a);
  box(g, TOOL_CABINET.x, TOOL_CABINET.y, 1.1, 0.8, 0.8, 0.15, 0x2a6f3f);
  box(g, BARREL.x, BARREL.y, 0, 0.7, 0.7, 1.0, 0x2c7fb8);
  box(g, 0.3, 8.6, 0, 0.9, 1.0, 0.9, 0x8b5a2b);
}

export function drawFloor(g: Phaser.GameObjects.Graphics, tier: number) {
  const N = GRID;
  const palettes: [number, number][] = [[0x3d4351, 0x4a5060], [0x33506b, 0x3f6484]];
  const [a, b] = palettes[Math.min(tier, palettes.length - 1)];
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) poly(g, [[i, j, 0], [i + 1, j, 0], [i + 1, j + 1, 0], [i, j + 1, 0]], (i + j) % 2 ? a : b);
}

export function drawLifts(g: Phaser.GameObjects.Graphics, count: number) {
  LIFT_BAYS.slice(0, Math.max(1, Math.min(count, LIFT_BAYS.length))).forEach((bay, i) => {
    const h = i === 0 ? 0.12 : 0.08, legW = i === 0 ? 0.25 : 0.16, legH = i === 0 ? 2.3 : 1.3;
    box(g, bay.x, bay.y, 0, bay.w, bay.h, h, 0x6b7385);
    box(g, bay.x, bay.y, h, legW, legW, legH, 0xffc21a);
    box(g, bay.x + bay.w - legW, bay.y, h, legW, legW, legH, 0xffc21a);
  });
}

export function drawLighting(g: Phaser.GameObjects.Graphics, tier: number) {
  const c = iso(4.5, 3.7, 0);
  if (tier >= 1) { g.fillStyle(0xfff4d6, 0.14); g.fillEllipse(c.x, c.y - 40, 420, 220); }
  if (tier >= 2) {
    g.fillStyle(0x4dd0ff, 0.12); g.fillEllipse(c.x - 60, c.y - 20, 300, 160);
    g.fillStyle(0xff4d9e, 0.1); g.fillEllipse(c.x + 80, c.y - 10, 260, 140);
  }
}

export function drawStorageSlot(g: Phaser.GameObjects.Graphics, pos: { x: number; y: number }, filled: boolean, locked: boolean, color: number) {
  box(g, pos.x, pos.y, 0, 1.5, 0.85, 0.06, locked ? 0x1c2029 : filled ? 0x394153 : 0x262c39);
  if (filled) {
    const c = iso(pos.x + 0.75, pos.y + 0.42, 0.3);
    g.fillStyle(color, 1).fillEllipse(c.x, c.y, 34, 20);
    g.fillStyle(0x0c0f16, 0.4).fillEllipse(c.x, c.y + 10, 38, 12);
  }
  if (locked) { const c = iso(pos.x + 0.75, pos.y + 0.42, 0.35); g.fillStyle(0x000000, 0.4).fillCircle(c.x, c.y, 11); }
}
