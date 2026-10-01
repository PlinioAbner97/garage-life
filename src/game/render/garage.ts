import type Phaser from 'phaser';
import { box, iso, outline, poly, shadowBlob } from './iso';

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

// Arte vectorial propio del taller, en capas (piso/elevadores/iluminación/almacenamiento
// se redibujan por separado). Fase 1: más detalle, profundidad y sombras — misma arquitectura.
export function drawShell(g: Phaser.GameObjects.Graphics) {
  const N = GRID, H = 3.6;
  // paredes con degradado (3 franjas) en vez de color plano, más zócalo oscuro
  const wallBack: [number, number][] = [[0, H * 0.45], [H * 0.45, H * 0.8], [H * 0.8, H]];
  const backShades = [0x273653, 0x2b3a5c, 0x324268];
  wallBack.forEach(([z0, z1], i) => poly(g, [[0, 0, z0], [N, 0, z0], [N, 0, z1], [0, 0, z1]], backShades[i]));
  const sideShades = [0x1e2a44, 0x22304e, 0x283858];
  wallBack.forEach(([z0, z1], i) => poly(g, [[0, 0, z0], [0, N, z0], [0, N, z1], [0, 0, z1]], sideShades[i]));
  poly(g, [[0, 0, 0], [N, 0, 0], [N, 0, 0.12], [0, 0, 0.12]], 0x121829);
  poly(g, [[0, 0, 0], [0, N, 0], [0, N, 0.12], [0, 0, 0.12]], 0x0f1422);
  poly(g, [[0, 0, H], [N, 0, H], [N, 0, H + 0.1], [0, 0, H + 0.1]], 0x161e33);

  // puerta de garaje enmarcada (marco + hojas con paneles) en vez de un rectángulo plano
  box(g, -0.08, 2, 0, 0.1, 4, 2.7, 0x5d667a);
  box(g, -0.08, 6, 0, 0.1, 0.12, 2.7, 0x5d667a);
  poly(g, [[0, 2, 0], [0, 6, 0], [0, 6, 2.6], [0, 2, 2.6]], 0x8f99ad);
  g.lineStyle(2, 0x5d667a, 0.9);
  for (let k = 1; k < 6; k++) { const a = iso(0, 2, k * 0.43), b = iso(0, 6, k * 0.43); g.lineBetween(a.x, a.y, b.x, b.y); }
  g.fillStyle(0x3a4155, 0.5).fillRect(iso(0, 3.9, 1.3).x - 2, iso(0, 3.9, 1.3).y - 10, 4, 20);

  // ventana con marco y vidrio a dos tonos (brillo diagonal)
  box(g, -0.06, 6, 1.35, 0.08, 2.55, 1.5, 0x4a536b);
  poly(g, [[0, 6.1, 1.45], [0, 8.45, 1.45], [0, 8.45, 2.75], [0, 6.1, 2.75]], 0x7fb8e6);
  poly(g, [[0, 6.1, 1.45], [0, 7.2, 1.45], [0, 8.45, 2.75], [0, 7.35, 2.75]], 0xb9e2ff);

  // letrero de neón con panel de fondo y halo
  box(g, -0.05, 1.3, 2.9, 0.05, 3.2, 0.42, 0x1a1f2b);
  poly(g, [[0, 1.5, 3], [0, 4.5, 3], [0, 4.5, 3.3], [0, 1.5, 3.3]], 0xff4d6d);
  const neon = iso(0, 3, 3.15);
  g.fillStyle(0xff4d6d, 0.18).fillEllipse(neon.x, neon.y, 180, 60);

  // franja de contacto piso-pared (oclusión ambiental)
  g.fillStyle(0x000000, 0.28);
  for (let x = 0; x < N; x++) { const a = iso(x, 0.05, 0.02), b = iso(x + 1, 0.05, 0.02); g.fillTriangle(a.x, a.y, b.x, b.y, b.x, b.y - 6); }
}

export function drawDecor(g: Phaser.GameObjects.Graphics) {
  // estante + llantas apiladas (círculos con aro interior) en vez de una caja lisa
  box(g, TIRE_RACK.x - 0.1, TIRE_RACK.y - 0.1, 0, 1.0, 1.4, 0.15, 0x3a3f4d);
  [0, 1, 2].forEach((i) => {
    const p = iso(TIRE_RACK.x + 0.4, TIRE_RACK.y + 0.7, 0.2 + i * 0.32);
    g.fillStyle(0x15171c, 1).fillEllipse(p.x, p.y, 46, 26);
    g.fillStyle(0x2a2d34, 1).fillEllipse(p.x, p.y, 26, 15);
  });
  shadowBlob(g, iso(TIRE_RACK.x + 0.4, TIRE_RACK.y + 0.7, 0).x, iso(TIRE_RACK.x + 0.4, TIRE_RACK.y + 0.7, 0).y + 6, 40, 16);

  // gabinete de herramientas con puertas, tiradores y cajón
  box(g, TOOL_CABINET.x, TOOL_CABINET.y, 0, 0.8, 0.8, 1.1, 0x1a1a1a);
  box(g, TOOL_CABINET.x, TOOL_CABINET.y, 1.1, 0.8, 0.8, 0.15, 0x2a6f3f);
  outline(g, [[TOOL_CABINET.x, TOOL_CABINET.y, 0], [TOOL_CABINET.x + 0.8, TOOL_CABINET.y, 0], [TOOL_CABINET.x + 0.8, TOOL_CABINET.y, 1.1], [TOOL_CABINET.x, TOOL_CABINET.y, 1.1]], 0x000000, 0.4, 1);
  const handle = iso(TOOL_CABINET.x + 0.8, TOOL_CABINET.y + 0.15, 0.6);
  g.fillStyle(0xcfd4de, 1).fillRect(handle.x - 1, handle.y - 10, 3, 18);
  shadowBlob(g, iso(TOOL_CABINET.x + 0.4, TOOL_CABINET.y + 0.4, 0).x, iso(TOOL_CABINET.x + 0.4, TOOL_CABINET.y + 0.4, 0).y + 6, 34, 14);

  // tambor con borde superior y franja de advertencia
  box(g, BARREL.x, BARREL.y, 0, 0.7, 0.7, 1.0, 0x2c7fb8);
  const bt = iso(BARREL.x + 0.35, BARREL.y + 0.35, 1.0);
  g.fillStyle(0x1e5a85, 1).fillEllipse(bt.x, bt.y, 34, 16);
  g.fillStyle(0xffc21a, 0.85).fillRect(iso(BARREL.x, BARREL.y + 0.35, 0.55).x, iso(BARREL.x, BARREL.y + 0.35, 0.55).y - 4, 30, 8);
  shadowBlob(g, iso(BARREL.x + 0.35, BARREL.y + 0.35, 0).x, iso(BARREL.x + 0.35, BARREL.y + 0.35, 0).y + 6, 30, 13);

  // banco de trabajo con pegboard de herramientas colgadas y piezas sobre la mesa
  box(g, 0.3, 8.6, 0, 0.9, 1.0, 0.9, 0x8b5a2b);
  box(g, 0.25, 8.55, 0.9, 1.0, 0.1, 0.7, 0x5d4327);
  const peg = (dx: number, dy: number, w: number, h: number, c: number) => {
    const p = iso(0.4 + dx, 8.6 + dy, 1.05);
    g.fillStyle(c, 1).fillRect(p.x - w / 2, p.y, w, h);
  };
  peg(0.05, 0.05, 3, 22, 0xb0b6c2); peg(0.25, 0.05, 14, 4, 0xb0b6c2); peg(0.5, 0.05, 3, 16, 0xc0392b);
  box(g, 0.35, 8.65, 0.9, 0.18, 0.18, 0.12, 0xffc21a);
  box(g, 0.6, 8.7, 0.9, 0.22, 0.14, 0.08, 0xd7263d);
  shadowBlob(g, iso(0.75, 9.1, 0).x, iso(0.75, 9.1, 0).y + 6, 36, 15);

  // manchas de aceite en el piso (detalle de textura)
  [[5.2, 2.1], [7.4, 6.4], [1.6, 5.0]].forEach(([x, y]) => {
    const p = iso(x, y, 0.005);
    g.fillStyle(0x05060a, 0.22).fillEllipse(p.x, p.y, 46, 20);
  });
}

export function drawFloor(g: Phaser.GameObjects.Graphics, tier: number) {
  const N = GRID;
  const palettes: [number, number][] = [[0x3d4351, 0x4a5060], [0x33506b, 0x3f6484]];
  const [a, b] = palettes[Math.min(tier, palettes.length - 1)];
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) poly(g, [[i, j, 0], [i + 1, j, 0], [i + 1, j + 1, 0], [i, j + 1, 0]], (i + j) % 2 ? a : b);
  // líneas de señalización (zona de trabajo) para dar lectura de "piso de taller real"
  g.lineStyle(2, 0xffc21a, 0.55);
  const seg = (x0: number, y0: number, x1: number, y1: number) => { const p0 = iso(x0, y0, 0.01), p1 = iso(x1, y1, 0.01); g.lineBetween(p0.x, p0.y, p1.x, p1.y); };
  seg(2.1, 2.1, 6.9, 2.1); seg(2.1, 2.1, 2.1, 5.3); seg(6.9, 2.1, 6.9, 5.3); seg(2.1, 5.3, 6.9, 5.3);
}

export function drawLifts(g: Phaser.GameObjects.Graphics, count: number) {
  LIFT_BAYS.slice(0, Math.max(1, Math.min(count, LIFT_BAYS.length))).forEach((bay, i) => {
    const h = i === 0 ? 0.12 : 0.08, legW = i === 0 ? 0.25 : 0.16, legH = i === 0 ? 2.3 : 1.3;
    const cx = iso(bay.x + bay.w / 2, bay.y + bay.h / 2, 0).x, cy = iso(bay.x + bay.w / 2, bay.y + bay.h / 2, 0).y;
    shadowBlob(g, cx, cy + 4, bay.w * 22, bay.h * 16, 0.3);
    box(g, bay.x, bay.y, 0, bay.w, bay.h, h, 0x6b7385);
    outline(g, [[bay.x, bay.y, h], [bay.x + bay.w, bay.y, h], [bay.x + bay.w, bay.y + bay.h, h], [bay.x, bay.y + bay.h, h]], 0x000000, 0.3, 1);
    // franjas de seguridad en el borde de la plataforma principal
    if (i === 0) { g.lineStyle(3, 0xffc21a, 0.8); const p0 = iso(bay.x, bay.y, h + 0.01), p1 = iso(bay.x + bay.w, bay.y, h + 0.01); g.lineBetween(p0.x, p0.y, p1.x, p1.y); }
    box(g, bay.x, bay.y, h, legW, legW, legH, 0xffc21a);
    box(g, bay.x + bay.w - legW, bay.y, h, legW, legW, legH, 0xffc21a);
    if (i === 0) box(g, bay.x + bay.w - legW - 0.35, bay.y, h, 0.3, 0.3, 0.6, 0x4a536b); // caja del motor hidráulico
  });
}

export function drawLighting(g: Phaser.GameObjects.Graphics, tier: number) {
  // luminarias de techo siempre visibles (ambientación base, no solo mejoras)
  [[3.3, 3.7], [6.3, 3.7]].forEach(([x, y]) => {
    const p = iso(x, y, 3.3);
    g.fillStyle(0x0f1422, 1).fillRect(p.x - 18, p.y - 4, 36, 6);
    g.fillStyle(0xfff4d6, 0.5).fillEllipse(p.x, p.y + 3, 22, 8);
  });
  const c = iso(4.5, 3.7, 0);
  g.fillStyle(0xfff4d6, 0.1); g.fillEllipse(c.x, c.y - 40, 360, 190);
  if (tier >= 1) { g.fillStyle(0xfff4d6, 0.14); g.fillEllipse(c.x, c.y - 40, 420, 220); }
  if (tier >= 2) {
    g.fillStyle(0x4dd0ff, 0.12); g.fillEllipse(c.x - 60, c.y - 20, 300, 160);
    g.fillStyle(0xff4d9e, 0.1); g.fillEllipse(c.x + 80, c.y - 10, 260, 140);
  }
}

export function drawStorageSlot(g: Phaser.GameObjects.Graphics, pos: { x: number; y: number }, filled: boolean, locked: boolean, color: number) {
  const base = iso(pos.x + 0.75, pos.y + 0.42, 0);
  shadowBlob(g, base.x, base.y + 6, 42, 16, 0.22);
  box(g, pos.x, pos.y, 0, 1.5, 0.85, 0.06, locked ? 0x1c2029 : filled ? 0x394153 : 0x262c39);
  g.lineStyle(1.5, 0x5d667a, 0.6);
  const p0 = iso(pos.x, pos.y, 0.07), p1 = iso(pos.x + 1.5, pos.y, 0.07), p2 = iso(pos.x + 1.5, pos.y + 0.85, 0.07), p3 = iso(pos.x, pos.y + 0.85, 0.07);
  g.strokePoints([p0, p1, p2, p3, p0], true, true);
  if (filled) {
    const c = iso(pos.x + 0.75, pos.y + 0.42, 0.3);
    g.fillStyle(color, 1).fillEllipse(c.x, c.y, 34, 20);
    g.fillStyle(0x0c0f16, 0.4).fillEllipse(c.x, c.y + 10, 38, 12);
  }
  if (locked) { const c = iso(pos.x + 0.75, pos.y + 0.42, 0.35); g.fillStyle(0x000000, 0.45).fillCircle(c.x, c.y, 11); }
}
