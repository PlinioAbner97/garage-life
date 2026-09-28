import type Phaser from 'phaser';
import type { VehicleModel } from '../../data/catalog';
import { box, iso, poly } from './iso';
// ARTE PROVISIONAL: carro dibujado con formas vectoriales. Para usar sprites reales,
// reemplaza esta función por una que cree/tiña imágenes; el resto del juego no cambia.
export function drawCar(g: Phaser.GameObjects.Graphics, m: VehicleModel, paint: number, rims: number) {
  g.clear();
  const L = m.length, W = m.width;
  const c = iso(L / 2, W / 2, 0);
  g.fillStyle(0x000000, 0.3).fillEllipse(c.x, c.y + 4, (L + W) * 34, (L + W) * 16);
  const wheel = (x: number, y: number) => {
    const p = iso(x, y, 0.3);
    g.fillStyle(0x111111, 1).fillEllipse(p.x, p.y, 26, 30);
    g.fillStyle(rims, 1).fillEllipse(p.x, p.y, 15, 17);
    g.fillStyle(0x111111, 1).fillCircle(p.x, p.y, 3);
  };
  wheel(L * 0.22, 0); wheel(L * 0.8, 0);
  box(g, 0, 0, 0.22, L, W, m.bodyH, paint);
  box(g, m.cabinStart, 0.12, 0.22 + m.bodyH, m.cabinLen, W - 0.24, m.cabinH, paint, [0x2b4a66, 0x1e3448]);
  poly(g, [[L, 0.1, 0.4], [L, 0.42, 0.4], [L, 0.42, 0.5], [L, 0.1, 0.5]], 0xfff2a8);
  poly(g, [[L, W - 0.42, 0.4], [L, W - 0.1, 0.4], [L, W - 0.1, 0.5], [L, W - 0.42, 0.5]], 0xfff2a8);
  wheel(L * 0.22, W); wheel(L * 0.8, W);
}
