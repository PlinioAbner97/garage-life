import Phaser from 'phaser';
export type P3 = [number, number, number];
export const iso = (x: number, y: number, z = 0) => new Phaser.Math.Vector2((x - y) * 32, (x + y) * 16 - z * 32);
export const shade = (c: number, f: number) => {
  const ch = (v: number) => Math.min(255, Math.round(v * f));
  return (ch((c >> 16) & 255) << 16) | (ch((c >> 8) & 255) << 8) | ch(c & 255);
};
type G = Phaser.GameObjects.Graphics;
export function poly(g: G, pts: P3[], color: number, alpha = 1) {
  g.fillStyle(color, alpha);
  g.fillPoints(pts.map((p) => iso(...p)), true);
}
export function box(g: G, x: number, y: number, z: number, dx: number, dy: number, dz: number, color: number, sides?: [number, number]) {
  const [r, l] = sides ?? [shade(color, 0.8), shade(color, 0.6)];
  poly(g, [[x + dx, y, z], [x + dx, y + dy, z], [x + dx, y + dy, z + dz], [x + dx, y, z + dz]], r);
  poly(g, [[x, y + dy, z], [x + dx, y + dy, z], [x + dx, y + dy, z + dz], [x, y + dy, z + dz]], l);
  poly(g, [[x, y, z + dz], [x + dx, y, z + dz], [x + dx, y + dy, z + dz], [x, y + dy, z + dz]], color);
}
