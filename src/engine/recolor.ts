import type { SpriteKey } from '../data/vehicles';

const hexToRgb = (h: string): [number, number, number] => {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const luma = (r: number, g: number, b: number) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

/**
 * Recolorea un render de Blender usando una máscara (R = pintura, G = rines).
 * Conserva sombras y reflejos: el color nuevo se multiplica por el "brillo relativo" del píxel
 * original respecto al promedio de la zona, y los brillos especulares se suman como luz blanca.
 */
export class CarPainter {
  private w: number; private h: number;
  private base: ImageData; private mask: ImageData;
  private ref: { paint: number; rim: number };
  private wgt!: [Float32Array, Float32Array];
  private cache = new Map<string, HTMLCanvasElement>();

  /** Peso de máscara con dilatación de 1 px (evita halos del color original en los bordes). */
  private dilate(ch: 0 | 1) {
    const { w, h } = this; const m = this.mask.data; const out = new Float32Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      let mx = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
        const v = m[(yy * w + xx) * 4 + ch]; if (v > mx) mx = v;
      }
      out[y * w + x] = mx / 255;
    }
    return out;
  }

  constructor(beauty: CanvasImageSource & { width: number; height: number }, maskImg: CanvasImageSource & { width: number; height: number }) {
    this.w = beauty.width; this.h = beauty.height;
    const c = document.createElement('canvas'); c.width = this.w; c.height = this.h;
    const ctx = c.getContext('2d', { willReadFrequently: true })!;
    ctx.drawImage(beauty, 0, 0); this.base = ctx.getImageData(0, 0, this.w, this.h);
    ctx.clearRect(0, 0, this.w, this.h); ctx.drawImage(maskImg, 0, 0); this.mask = ctx.getImageData(0, 0, this.w, this.h);
    this.ref = { paint: this.meanLuma(0), rim: this.meanLuma(1) };
    this.wgt = [this.dilate(0), this.dilate(1)];
  }

  private meanLuma(ch: 0 | 1) {
    let s = 0, n = 0;
    const b = this.base.data, m = this.mask.data;
    for (let i = 0; i < b.length; i += 4) {
      if (m[i + ch] > 200 && b[i + 3] > 200) { s += luma(b[i], b[i + 1], b[i + 2]); n++; }
    }
    return n ? Math.max(s / n, 8) : 128;
  }

  render(paintHex: string | null, rimHex: string | null): HTMLCanvasElement {
    const key = `${paintHex}|${rimHex}`;
    const hit = this.cache.get(key); if (hit) return hit;
    const out = new ImageData(new Uint8ClampedArray(this.base.data), this.w, this.h);
    const o = out.data;
    const tp = paintHex ? hexToRgb(paintHex) : null, tr = rimHex ? hexToRgb(rimHex) : null;
    for (let i = 0; i < o.length; i += 4) {
      if (o[i + 3] === 0) continue;
      const r = o[i], g = o[i + 1], b = o[i + 2];
      const l = luma(r, g, b);
      for (let ch = 0 as 0 | 1; ch < 2; ch = (ch + 1) as 0 | 1) {
        const t = ch === 0 ? tp : tr; if (!t) continue;
        const wgt = this.wgt[ch][i >> 2]; if (wgt < 0.02) continue;
        const shade = l / (ch === 0 ? this.ref.paint : this.ref.rim);
        const k = Math.min(Math.pow(shade, 1.1), 1.6);
        const spec = Math.max(0, shade - 1.2) * 70;
        o[i] = r + (Math.min(255, t[0] * k + spec) - r) * wgt;
        o[i + 1] = g + (Math.min(255, t[1] * k + spec) - g) * wgt;
        o[i + 2] = b + (Math.min(255, t[2] * k + spec) - b) * wgt;
      }
    }
    const c = document.createElement('canvas'); c.width = this.w; c.height = this.h;
    c.getContext('2d')!.putImageData(out, 0, 0);
    this.cache.set(key, c);
    return c;
  }
}

export type PainterMap = Record<SpriteKey, CarPainter>;
