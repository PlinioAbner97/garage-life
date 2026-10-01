import type Phaser from 'phaser';
import { partById, resolvePaintColor } from '../../data/parts';
import type { VehicleModel } from '../../data/vehicles';
import type { CarBuild } from '../../core/types';
import { box, iso, outline, poly, shade, shadowBlob } from './iso';

// Arte vectorial propio del auto, por capas según las piezas equipadas (carrocería, cabina
// ahusada con parabrisas/techo/ventanas independientes, parachoques, espejos, luces, body kit).
// Fase 2: más silueta, profundidad y brillo — misma arquitectura (box/poly), mismo `build`.
const RIM_SIZE: Record<string, [number, number]> = { street: [26, 30], sport: [30, 34], wide: [35, 40] };
const SUSPENSION_DROP: Record<string, number> = { 'susp-street': 0, 'susp-sport': 0.06, 'susp-race': 0.11 };

export function drawCar(g: Phaser.GameObjects.Graphics, m: VehicleModel, build: CarBuild) {
  g.clear();
  const L = m.length, W = m.width;
  const paint = resolvePaintColor(build.paint);
  const rimPart = partById(build.rims);
  const rimColor = rimPart?.color ?? 0xc0c0c0;
  const [rw, rh] = RIM_SIZE[rimPart?.rimSize ?? 'street'];
  const drop = SUSPENSION_DROP[build.suspension] ?? 0;
  const bodyZ = 0.22 - drop;
  const topZ = bodyZ + m.bodyH;

  const shadowC = iso(L / 2, W / 2, 0);
  shadowBlob(g, shadowC.x, shadowC.y + 4, (L + W) * 17, (L + W) * 8, 0.4);

  const wheel = (x: number, y: number) => {
    const p = iso(x, y, Math.max(0.12, 0.3 - drop));
    g.fillStyle(0x111111, 1).fillEllipse(p.x, p.y, rw, rh);
    g.fillStyle(rimColor, 1).fillEllipse(p.x, p.y, rw * 0.56, rh * 0.56);
    g.lineStyle(1.5, shade(rimColor, 0.6), 0.8);
    for (let k = 0; k < 3; k++) { const a = (k / 3) * Math.PI; g.lineBetween(p.x - Math.cos(a) * rw * 0.5, p.y - Math.sin(a) * rh * 0.5, p.x + Math.cos(a) * rw * 0.5, p.y + Math.sin(a) * rh * 0.5); }
    g.fillStyle(0x111111, 1).fillCircle(p.x, p.y, 3);
  };
  wheel(L * 0.2, 0); wheel(L * 0.82, 0);

  // carrocería principal + parachoques base (siempre presentes, no solo con body kit)
  box(g, 0, 0, bodyZ, L, W, m.bodyH, paint);
  box(g, -0.04, 0.05, bodyZ, 0.05, W - 0.1, m.bodyH * 0.3, 0x1c1c1c);
  box(g, L - 0.01, 0.05, bodyZ, 0.05, W - 0.1, m.bodyH * 0.3, 0x1c1c1c);
  outline(g, [[0, 0, topZ], [L, 0, topZ], [L, W, topZ], [0, W, topZ]], 0x000000, 0.25, 1);

  // cabina ahusada: parabrisas y luneta inclinados + techo angosto + ventanas laterales + pilar central
  const cs = m.cabinStart, cl = m.cabinLen, ch = m.cabinH, y0 = 0.12, y1 = W - 0.12;
  const rix = Math.min(cl * 0.22, 0.16), riy = Math.min((y1 - y0) * 0.18, 0.1);
  const roofZ = topZ + ch;
  const tinted = build.tint !== 'tint-none';
  const glassSide = tinted ? 0x16202a : 0x2b4a66;
  const glassFace = tinted ? 0x0e161d : 0x1e3448;
  poly(g, [[cs, y0, topZ], [cs, y1, topZ], [cs + rix, y1 - riy, roofZ], [cs + rix, y0 + riy, roofZ]], glassFace, 0.95); // parabrisas
  poly(g, [[cs + cl, y0, topZ], [cs + cl, y1, topZ], [cs + cl - rix, y1 - riy, roofZ], [cs + cl - rix, y0 + riy, roofZ]], shade(glassFace, 0.85), 0.95); // luneta
  poly(g, [[cs, y0, topZ], [cs + cl, y0, topZ], [cs + cl - rix, y0 + riy, roofZ], [cs + rix, y0 + riy, roofZ]], glassSide, 0.95); // ventana lateral
  poly(g, [[cs, y1, topZ], [cs + cl, y1, topZ], [cs + cl - rix, y1 - riy, roofZ], [cs + rix, y1 - riy, roofZ]], shade(glassSide, 0.9), 0.95);
  box(g, cs + cl * 0.5 - 0.025, y0, topZ, 0.05, y1 - y0, ch, shade(paint, 0.8)); // pilar B
  poly(g, [[cs + rix, y0 + riy, roofZ], [cs + cl - rix, y0 + riy, roofZ], [cs + cl - rix, y1 - riy, roofZ], [cs + rix, y1 - riy, roofZ]], shade(paint, 0.92)); // techo
  outline(g, [[cs + rix, y0 + riy, roofZ], [cs + cl - rix, y0 + riy, roofZ], [cs + cl - rix, y1 - riy, roofZ], [cs + rix, y1 - riy, roofZ]], 0x000000, 0.3, 1);

  // espejos laterales
  box(g, cs - 0.1, y0 - 0.06, topZ + ch * 0.45, 0.1, 0.08, 0.06, shade(paint, 0.75));
  box(g, cs - 0.1, y1 - 0.02, topZ + ch * 0.45, 0.1, 0.08, 0.06, shade(paint, 0.75));

  // brillo de pintura (franja translúcida diagonal sobre el capó y el techo)
  poly(g, [[0.15, 0.05, topZ + 0.002], [L - 0.2, 0.15, topZ + 0.002], [L - 0.2, 0.3, topZ + 0.002], [0.15, 0.25, topZ + 0.002]], 0xffffff, 0.08);

  // body kit (igual que antes: solo si está equipado)
  if (build.front !== 'front-stock') box(g, -0.08, 0.08, bodyZ, 0.1, W - 0.16, m.bodyH * 0.55, shade(paint, 0.75));
  if (build.skirt !== 'skirt-stock') {
    box(g, 0.15, -0.03, bodyZ, L - 0.3, 0.06, m.bodyH * 0.35, shade(paint, 0.6));
    box(g, 0.15, W - 0.03, bodyZ, L - 0.3, 0.06, m.bodyH * 0.35, shade(paint, 0.6));
  }
  if (build.hood !== 'hood-stock') box(g, L * 0.5, 0.15, topZ, L * 0.22, W - 0.3, 0.05, shade(paint, 0.7));
  if (build.spoiler !== 'spoiler-stock') {
    box(g, L * 0.92, 0.12, topZ + ch * 0.4, 0.06, W - 0.24, 0.03, 0x1c1c1c);
    box(g, L * 0.9, 0.2, topZ, 0.04, 0.06, ch * 0.4, 0x1c1c1c);
    box(g, L * 0.9, W - 0.26, topZ, 0.04, 0.06, ch * 0.4, 0x1c1c1c);
  }

  const stripe = partById(build.stripe);
  if (stripe?.color !== undefined) {
    poly(g, [[0.05, W / 2 - 0.08, topZ + 0.01], [L - 0.05, W / 2 - 0.08, topZ + 0.01],
      [L - 0.05, W / 2 + 0.08, topZ + 0.01], [0.05, W / 2 + 0.08, topZ + 0.01]], stripe.color);
  }

  // faros delanteros (x=L) y traseros (x=0)
  poly(g, [[L, 0.1, bodyZ + 0.18], [L, 0.42, bodyZ + 0.18], [L, 0.42, bodyZ + 0.28], [L, 0.1, bodyZ + 0.28]], 0xfff2a8);
  poly(g, [[L, W - 0.42, bodyZ + 0.18], [L, W - 0.1, bodyZ + 0.18], [L, W - 0.1, bodyZ + 0.28], [L, W - 0.42, bodyZ + 0.28]], 0xfff2a8);
  poly(g, [[0, 0.1, bodyZ + 0.18], [0, 0.34, bodyZ + 0.18], [0, 0.34, bodyZ + 0.27], [0, 0.1, bodyZ + 0.27]], 0xff4d4d, 0.9);
  poly(g, [[0, W - 0.34, bodyZ + 0.18], [0, W - 0.1, bodyZ + 0.18], [0, W - 0.1, bodyZ + 0.27], [0, W - 0.34, bodyZ + 0.27]], 0xff4d4d, 0.9);

  wheel(L * 0.2, W); wheel(L * 0.82, W);

  if (build.exhaust !== 'exhaust-stock') {
    const p = iso(-0.02, W * 0.25, bodyZ + 0.05);
    g.fillStyle(0xcccccc, 1).fillCircle(p.x, p.y, 5);
  }
}
