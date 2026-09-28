import type Phaser from 'phaser';
import { partById, resolvePaintColor } from '../../data/parts';
import type { VehicleModel } from '../../data/vehicles';
import type { CarBuild } from '../../core/types';
import { box, iso, poly, shade } from './iso';

// ARTE PROVISIONAL: el auto se dibuja con formas vectoriales por capas (carrocería, cabina,
// body kit, vinilos, escape) según las piezas equipadas. Para usar sprites/arte final,
// sustituye esta función por una que componga imágenes con las mismas piezas de `build`;
// el resto del juego (store, UI, guardado) no necesita cambiar.
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

  const c = iso(L / 2, W / 2, 0);
  g.fillStyle(0x000000, 0.32).fillEllipse(c.x, c.y + 4, (L + W) * 35, (L + W) * 16);

  const wheel = (x: number, y: number) => {
    const p = iso(x, y, Math.max(0.12, 0.3 - drop));
    g.fillStyle(0x111111, 1).fillEllipse(p.x, p.y, rw, rh);
    g.fillStyle(rimColor, 1).fillEllipse(p.x, p.y, rw * 0.56, rh * 0.56);
    g.fillStyle(0x111111, 1).fillCircle(p.x, p.y, 3);
  };
  wheel(L * 0.2, 0); wheel(L * 0.82, 0);

  box(g, 0, 0, bodyZ, L, W, m.bodyH, paint);
  const tinted = build.tint !== 'tint-none';
  box(g, m.cabinStart, 0.12, bodyZ + m.bodyH, m.cabinLen, W - 0.24, m.cabinH, paint, tinted ? [0x18222c, 0x0f171f] : [0x2b4a66, 0x1e3448]);

  if (build.front !== 'front-stock') box(g, -0.08, 0.08, bodyZ, 0.1, W - 0.16, m.bodyH * 0.55, shade(paint, 0.75));
  if (build.skirt !== 'skirt-stock') {
    box(g, 0.15, -0.03, bodyZ, L - 0.3, 0.06, m.bodyH * 0.35, shade(paint, 0.6));
    box(g, 0.15, W - 0.03, bodyZ, L - 0.3, 0.06, m.bodyH * 0.35, shade(paint, 0.6));
  }
  if (build.hood !== 'hood-stock') box(g, L * 0.5, 0.15, bodyZ + m.bodyH, L * 0.22, W - 0.3, 0.05, shade(paint, 0.7));
  if (build.spoiler !== 'spoiler-stock') {
    box(g, L * 0.92, 0.12, bodyZ + m.bodyH + m.cabinH * 0.4, 0.06, W - 0.24, 0.03, 0x1c1c1c);
    box(g, L * 0.9, 0.2, bodyZ + m.bodyH, 0.04, 0.06, m.cabinH * 0.4, 0x1c1c1c);
    box(g, L * 0.9, W - 0.26, bodyZ + m.bodyH, 0.04, 0.06, m.cabinH * 0.4, 0x1c1c1c);
  }

  const stripe = partById(build.stripe);
  if (stripe?.color !== undefined) {
    poly(g, [[0.05, W / 2 - 0.08, bodyZ + m.bodyH + 0.01], [L - 0.05, W / 2 - 0.08, bodyZ + m.bodyH + 0.01],
      [L - 0.05, W / 2 + 0.08, bodyZ + m.bodyH + 0.01], [0.05, W / 2 + 0.08, bodyZ + m.bodyH + 0.01]], stripe.color);
  }

  poly(g, [[L, 0.1, bodyZ + 0.18], [L, 0.42, bodyZ + 0.18], [L, 0.42, bodyZ + 0.28], [L, 0.1, bodyZ + 0.28]], 0xfff2a8);
  poly(g, [[L, W - 0.42, bodyZ + 0.18], [L, W - 0.1, bodyZ + 0.18], [L, W - 0.1, bodyZ + 0.28], [L, W - 0.42, bodyZ + 0.28]], 0xfff2a8);

  wheel(L * 0.2, W); wheel(L * 0.82, W);

  if (build.exhaust !== 'exhaust-stock') {
    const p = iso(-0.02, W * 0.25, bodyZ + 0.05);
    g.fillStyle(0xcccccc, 1).fillCircle(p.x, p.y, 5);
  }
}
