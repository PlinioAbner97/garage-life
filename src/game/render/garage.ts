import type Phaser from 'phaser';
import { box, iso, poly } from './iso';
export const GRID = 10;
// ARTE PROVISIONAL del taller (formas vectoriales isométricas).
export function drawGarage(g: Phaser.GameObjects.Graphics) {
  const N = GRID, H = 3.6;
  poly(g, [[0, 0, 0], [N, 0, 0], [N, 0, H], [0, 0, H]], 0x2b3a55);
  poly(g, [[0, 0, 0], [0, N, 0], [0, N, H], [0, 0, H]], 0x22304a);
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++)
    poly(g, [[i, j, 0], [i + 1, j, 0], [i + 1, j + 1, 0], [i, j + 1, 0]], (i + j) % 2 ? 0x4a5060 : 0x3d4351);
  // puerta de garaje (pared x=0)
  poly(g, [[0, 2, 0], [0, 6, 0], [0, 6, 2.6], [0, 2, 2.6]], 0x8892a6);
  g.lineStyle(2, 0x5d667a, 1);
  for (let k = 1; k < 6; k++) { const a = iso(0, 2, k * 0.43), b = iso(0, 6, k * 0.43); g.lineBetween(a.x, a.y, b.x, b.y); }
  // ventana y letrero de neón (pared y=0)
  poly(g, [[6, 0, 1.4], [8.5, 0, 1.4], [8.5, 0, 2.8], [6, 0, 2.8]], 0x9ad1ff);
  poly(g, [[1.5, 0, 3], [4.5, 0, 3], [4.5, 0, 3.3], [1.5, 0, 3.3]], 0xff4d6d);
  // elevador
  box(g, 2.5, 2.5, 0, 4.2, 2.6, 0.12, 0x6b7385);
  box(g, 2.5, 2.5, 0.12, 0.25, 0.25, 2.3, 0xffc21a);
  box(g, 6.45, 2.5, 0.12, 0.25, 0.25, 2.3, 0xffc21a);
  // decoración: banco de trabajo, caja de herramientas, llantas, barril
  box(g, 0.3, 3.2, 0, 0.9, 2.6, 0.9, 0x8b5a2b);
  box(g, 0.4, 7.2, 0, 0.9, 1.4, 0.9, 0xc0392b);
  box(g, 8.3, 3.2, 0, 0.8, 0.8, 0.5, 0x1a1a1a); box(g, 8.3, 3.2, 0.5, 0.8, 0.8, 0.5, 0x222222);
  box(g, 8.5, 1.2, 0, 0.7, 0.7, 1.0, 0x2c7fb8);
}
