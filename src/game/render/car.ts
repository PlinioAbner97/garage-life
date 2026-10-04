import type Phaser from 'phaser';
import { partById, resolvePaintColor } from '../../data/parts';
import type { VehicleModel } from '../../data/vehicles';
import type { CarBuild } from '../../core/types';
import { box, iso, outline, poly, shade, shadowBlob } from './iso';

// Arte vectorial propio del auto, por capas según las piezas equipadas (carrocería, cabina
// ahusada con parabrisas/techo/ventanas independientes, parachoques, espejos, luces, body kit).
// Fase JDM: silueta por segmentos (capó/maletero escalonados + parachoques propios + guardabarros
// ensanchados) en vez de una caja única, para dejar de verse "cuadrado" — misma arquitectura (box/poly).
const RIM_SIZE: Record<string, [number, number]> = { street: [16, 18], sport: [18, 21], wide: [21, 24] };
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
  shadowBlob(g, shadowC.x, shadowC.y + 4, (L + W) * 17, (L + W) * 8, 0.42);

  // llanta con disco de freno, 5 rayos y pinza de freno asomando — look más "real" que 3 líneas
  const wheel = (x: number, y: number) => {
    const p = iso(x, y, Math.max(0.12, 0.3 - drop));
    g.fillStyle(0x0a0a0a, 1).fillEllipse(p.x, p.y, rw, rh); // neumático
    g.fillStyle(0x222225, 1).fillEllipse(p.x, p.y, rw * 0.78, rh * 0.78); // pared lateral
    g.fillStyle(0xd94040, 1).fillCircle(p.x, p.y, rh * 0.24); // pinza de freno
    g.fillStyle(rimColor, 1).fillEllipse(p.x, p.y, rw * 0.58, rh * 0.58); // aro
    g.lineStyle(1.4, shade(rimColor, 0.55), 0.85);
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2;
      g.lineBetween(p.x, p.y, p.x + Math.cos(a) * rw * 0.5, p.y + Math.sin(a) * rh * 0.5);
    }
    g.lineStyle(1, shade(rimColor, 1.25), 0.6).strokeEllipse(p.x, p.y, rw * 0.58, rh * 0.58);
    g.fillStyle(0x111111, 1).fillCircle(p.x, p.y, 2.6);
  };
  wheel(L * 0.2, 0); wheel(L * 0.82, 0); // ruedas traseras (lado oculto), dibujadas ANTES del cuerpo para que éste las tape

  // --- silueta por segmentos: maletero / zócalo medio / cabina / capó, cada extremo con su
  // propio parachoques más bajo y de otro tono — rompe la caja única y sugiere curvatura.
  const noseLen = Math.min(L * 0.13, 0.32);
  const tailLen = Math.min(L * 0.11, 0.28);
  const cabinBack = m.cabinStart;
  const cabinFront = m.cabinStart + m.cabinLen;
  const hoodEnd = L - noseLen;
  const trunkStart = tailLen;
  const deckH = m.bodyH * 0.93;
  const bumpH = m.bodyH * 0.68;
  const bumperColor = shade(paint, 0.4);

  // zócalo/guardabarros bajo toda la cabina (altura completa)
  box(g, cabinBack, 0, bodyZ, cabinFront - cabinBack, W, m.bodyH, paint);
  // capó: escalón hacia el morro (más bajo, tono más claro = catch de luz)
  box(g, cabinFront, 0, bodyZ, Math.max(0.02, hoodEnd - cabinFront), W, deckH, shade(paint, 1.08));
  // maletero: escalón hacia la cola (tono algo más oscuro)
  box(g, trunkStart, 0, bodyZ, Math.max(0.02, cabinBack - trunkStart), W, deckH, shade(paint, 0.94));
  // parachoques delantero y trasero, más bajos y en tono oscuro propio (no pintura)
  box(g, hoodEnd, 0, bodyZ, L - hoodEnd, W, bumpH, bumperColor);
  box(g, 0, 0, bodyZ, trunkStart, W, bumpH, bumperColor);
  // esquinas achaflanadas en los parachoques para sugerir redondeo
  poly(g, [[L, 0.08, bodyZ], [L, W - 0.08, bodyZ], [L - 0.05, W, bodyZ], [L - 0.05, 0, bodyZ]], shade(bumperColor, 0.75), 0.85);
  poly(g, [[0, 0.08, bodyZ], [0, W - 0.08, bodyZ], [0.05, W, bodyZ], [0.05, 0, bodyZ]], shade(bumperColor, 0.75), 0.85);
  // líneas de carácter (separación capó/zócalo y zócalo/maletero) para dar aspecto "paneleado"
  outline(g, [[cabinFront, 0.02, bodyZ + deckH], [cabinFront, W - 0.02, bodyZ + deckH]], 0x000000, 0.22, 1);
  outline(g, [[cabinBack, 0.02, bodyZ + deckH], [cabinBack, W - 0.02, bodyZ + deckH]], 0x000000, 0.22, 1);

  // guardabarros ensanchados sobre cada rueda — look JDM "flared fenders"
  const flare = (cx: number) => {
    const fl = Math.min(L * 0.16, 0.34);
    const x0 = Math.max(0, cx - fl / 2), dx = Math.min(fl, L - x0);
    const fz = bodyZ + m.bodyH * 0.08;
    box(g, x0, -0.025, fz, dx, 0.05, m.bodyH * 0.46, shade(paint, 0.72));
    box(g, x0, W - 0.025, fz, dx, 0.05, m.bodyH * 0.46, shade(paint, 0.72));
  };
  flare(L * 0.2); flare(L * 0.82);

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
  if (build.front !== 'front-stock') box(g, hoodEnd - 0.02, 0.08, bodyZ, 0.1, W - 0.16, bumpH * 0.9, shade(paint, 0.75));
  if (build.skirt !== 'skirt-stock') {
    box(g, trunkStart + 0.02, -0.03, bodyZ, hoodEnd - trunkStart - 0.04, 0.06, m.bodyH * 0.35, shade(paint, 0.6));
    box(g, trunkStart + 0.02, W - 0.03, bodyZ, hoodEnd - trunkStart - 0.04, 0.06, m.bodyH * 0.35, shade(paint, 0.6));
  }
  if (build.hood !== 'hood-stock') box(g, (cabinFront + hoodEnd) / 2 - (hoodEnd - cabinFront) * 0.1, 0.15, bodyZ + deckH, (hoodEnd - cabinFront) * 0.55, W - 0.3, 0.05, shade(paint, 0.7));
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

  // faros delanteros (x=L) y traseros (x=0), ubicados sobre el propio parachoques
  const lz0 = bodyZ + bumpH * 0.32, lz1 = bodyZ + bumpH * 0.88;
  poly(g, [[L, 0.1, lz0], [L, 0.42, lz0], [L, 0.42, lz1], [L, 0.1, lz1]], 0xfff2a8);
  poly(g, [[L, W - 0.42, lz0], [L, W - 0.1, lz0], [L, W - 0.1, lz1], [L, W - 0.42, lz1]], 0xfff2a8);
  poly(g, [[0, 0.1, lz0], [0, 0.34, lz0], [0, 0.34, lz1 * 0.98], [0, 0.1, lz1 * 0.98]], 0xff4d4d, 0.9);
  poly(g, [[0, W - 0.34, lz0], [0, W - 0.1, lz0], [0, W - 0.1, lz1 * 0.98], [0, W - 0.34, lz1 * 0.98]], 0xff4d4d, 0.9);

  wheel(L * 0.2, W); wheel(L * 0.82, W);

  if (build.exhaust !== 'exhaust-stock') {
    const p = iso(-0.02, W * 0.25, bodyZ + 0.05);
    g.fillStyle(0xcccccc, 1).fillCircle(p.x, p.y, 5);
  }
}
