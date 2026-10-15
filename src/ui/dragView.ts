// Vista del arrancón (canvas 2D). Pista isométrica con cámara que sigue al jugador, parallax de ciudad, vallas,
// luces, nitro, humo y líneas de velocidad. La lógica vive en data/drag.ts; aquí solo se dibuja y se leen controles.
import { DRAG_DIST, GEARS, GOOD, PERFECT, REDLINE, launch, makeDriver, newSim, nitro, runDriver, sample, shift, step, type DragSim, type Run, type ShiftQuality } from '../data/drag';
import { SKILL, perf, type RaceOpp, type RaceResult } from '../data/races';

const AX = { x: -0.86, y: 0.51 };   // sentido de la marcha en pantalla (hacia -Y de Blender)
const LN = { x: 0.94, y: 0.34 };    // eje de los carriles
const PPM0 = 12, ROAD0 = 150, LANE0 = 52;   // píxeles por metro, medio ancho de pista y carril (se escalan en pantallas angostas)
const FIXED = 1 / 120;

export interface DragCar { model: string; paint: string; rim: string }
export interface Hooks { carImg: (c: DragCar) => string | undefined; onFinish: (r: RaceResult) => void; onPhase?: (p: 'stage' | 'go' | 'run' | 'done') => void }
interface Particle { x: number; y: number; vx: number; vy: number; life: number; max: number; r: number; c: string }
interface Pop { text: string; color: string; t: number }

export class DragView {
  private ctx: CanvasRenderingContext2D; private w = 0; private h = 0; private dpr = 1;
  private raf = 0; private last = 0; private startAt = 0; private greenAt = 0;
  private sim: DragSim; private ai: Run; private aiNitroAt: number;
  private imgs = new Map<string, HTMLImageElement>();
  private parts: Particle[] = []; private pops: Pop[] = []; private shake = 0; private postX = 0; private postV = 0;
  private done = false; private falseStart = false; private bg: { x: number; w: number; h: number; layer: number; c: string }[] = [];
  private lines = Array.from({ length: 36 }, (_, i) => ({ a: (i * 97) % 360, o: (i * 0.618) % 1, l: 0.4 + ((i * 53) % 10) / 10 }));
  private seed = 1;
  private k = 1; private get ppm() { return PPM0 * this.k; } private get rh() { return ROAD0 * this.k; } private get lane() { return LANE0 * this.k; }
  phase: 'stage' | 'go' | 'run' | 'done' = 'stage';
  constructor(private canvas: HTMLCanvasElement, private me: DragCar, private opp: RaceOpp, private hooks: Hooks) {
    this.ctx = canvas.getContext('2d')!;
    this.sim = newSim(perf(me.model));
    const drv = makeDriver(SKILL[opp.tier ?? 'friend'] ?? 0.03);
    this.aiNitroAt = drv.nitroAt;
    this.ai = runDriver(perf(opp.model) * opp.mul, drv);
    const now = performance.now(); this.startAt = now; this.greenAt = now + 3600 + Math.random() * 1400;
    let s = 7; const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    for (let layer = 0; layer < 2; layer++) for (let i = 0; i < 46; i++) this.bg.push({ x: i * 90 + r() * 40, w: 40 + r() * 70, h: (layer ? 70 : 120) + r() * (layer ? 90 : 180), layer, c: layer ? '#101830' : '#0b1124' });
    this.resize(); this.last = now; this.raf = requestAnimationFrame(this.frame);
  }
  destroy() { cancelAnimationFrame(this.raf); }
  resize() {
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    const r = this.canvas.getBoundingClientRect(); this.w = r.width; this.h = r.height; this.k = Math.min(1, Math.max(0.55, r.width / 820));
    this.canvas.width = Math.round(r.width * this.dpr); this.canvas.height = Math.round(r.height * this.dpr);
  }
  // ----- controles
  get greenIn() { return (this.greenAt - performance.now()) / 1000; }
  /** Botón principal: arrancar (antes de lanzar) o cambiar de marcha. */
  action(): ShiftQuality | 'launch' | 'false' | null {
    if (this.done) return null;
    if (!this.sim.launched) {
      const g = -this.greenIn; // s desde la luz verde
      if (g < 0) { launch(this.sim, -1); this.falseStart = true; this.pop('¡SALIDA EN FALSO! +1.0 s', '#ff4d6a'); return 'false'; }
      launch(this.sim, g); this.pop(g < 0.25 ? '¡Gran salida!' : g < 0.5 ? 'Buena salida' : 'Salida lenta', g < 0.25 ? '#38e08a' : g < 0.5 ? '#ffd24a' : '#ff9a4a'); this.shake = 6;
      for (let i = 0; i < 18; i++) this.smoke(); return 'launch';
    }
    const q = shift(this.sim); if (!q) return null;
    this.pop(q === 'perfect' ? '¡PERFECTO!' : q === 'good' ? 'Bien' : q === 'early' ? 'Muy pronto' : 'Muy tarde', q === 'perfect' ? '#38e08a' : q === 'good' ? '#ffd24a' : '#ff4d6a');
    if (q === 'perfect') this.shake = 5; return q;
  }
  useNitro() { if (nitro(this.sim)) { this.pop('¡NITRO!', '#38c8ff'); this.shake = 8; return true; } return false; }
  get nitroReady() { return this.sim.launched && !this.sim.nitroUsed && !this.sim.finished; }
  get gear() { return this.sim.gear; }
  private pop(text: string, color: string) { this.pops = [{ text, color, t: 0 }]; }
  private smoke() { const p = this.scr(this.sim.x, this.lane); this.parts.push({ x: p.x, y: p.y, vx: (Math.random() - 0.5) * 120 - AX.x * 40, vy: (Math.random() - 0.7) * 80, life: 0, max: 0.8 + Math.random() * 0.6, r: 14 + Math.random() * 16, c: '230,235,255' }); }

  // ----- simulación
  private frame = (now: number) => {
    const dt = Math.min(0.1, (now - this.last) / 1000); this.last = now;
    const g = (now - this.greenAt) / 1000;
    const ph = this.done ? 'done' : this.sim.launched ? 'run' : g >= 0 ? 'go' : 'stage';
    if (ph !== this.phase) { this.phase = ph; this.hooks.onPhase?.(ph); }
    if (g >= 0) {
      if (!this.sim.launched && g > 1.5) { launch(this.sim, g); this.pop('Salida tardía', '#ff9a4a'); }
      let n = 0;
      while (!this.sim.finished && this.sim.t + FIXED <= g && n++ < 3000) {
        step(this.sim, FIXED);
        if (this.sim.finished) { this.postV = this.sim.v; this.postX = DRAG_DIST; this.finish(); }
        if (this.sim.launched && this.sim.nitroLeft > 0 && Math.random() < 0.15) this.flameSpark();
      }
      if (this.sim.finished) { this.postV *= Math.pow(0.5, dt / 1.6); this.postX += this.postV * dt; }
    }
    this.draw(now, g, dt);
    this.raf = requestAnimationFrame(this.frame);
  };
  private finish() {
    if (this.done) return; this.done = true;
    const myT = this.sim.time, oppT = this.ai.time;
    setTimeout(() => this.hooks.onFinish({ myT, oppT, win: myT < oppT, reaction: this.sim.reaction, perfects: this.sim.perfects }), 1400);
  }
  private flameSpark() { const p = this.scr(this.sim.x, this.lane); this.parts.push({ x: p.x - AX.x * 70, y: p.y - 20 - AX.y * 70, vx: -AX.x * 260 + (Math.random() - 0.5) * 60, vy: -AX.y * 260 + (Math.random() - 0.5) * 60, life: 0, max: 0.25, r: 6 + Math.random() * 6, c: '90,190,255' }); }
  private myX() { return this.sim.finished ? this.postX : this.sim.x; }
  private oppX(g: number) { return g <= 0 ? 0 : g >= this.ai.time ? Math.min(DRAG_DIST + (g - this.ai.time) * (this.ai.vs[this.ai.vs.length - 1] * 0.9), DRAG_DIST + 160) : sample(this.ai.xs, g - 0, this.ai.dt); }

  // ----- dibujo
  private anchor() { return { x: this.w * 0.5 + 40 * this.k, y: this.h * 0.44 }; }
  private cam = 0;
  private scr(dist: number, lane: number, up = 0) { const a = this.anchor(), d = (dist - this.cam) * this.ppm; return { x: a.x + AX.x * d + LN.x * lane, y: a.y + AX.y * d + LN.y * lane - up }; }
  private draw(now: number, g: number, dt: number) {
    const c = this.ctx, { w, h } = this; c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    const myX = this.myX(), oppX = this.oppX(g), v = this.sim.finished ? this.postV : this.sim.v;
    this.cam += (myX - this.cam) * Math.min(1, dt * 12);
    this.shake = Math.max(0, this.shake - dt * 22);
    const sx = (Math.random() - 0.5) * this.shake, sy = (Math.random() - 0.5) * this.shake;
    c.save(); c.translate(sx, sy);
    // cielo
    const sky = c.createLinearGradient(0, 0, 0, h); sky.addColorStop(0, '#05070f'); sky.addColorStop(0.55, '#16203f'); sky.addColorStop(1, '#0b1124'); c.fillStyle = sky; c.fillRect(-20, -20, w + 40, h + 40);
    // ciudad con parallax
    for (const b of this.bg) {
      const k = b.layer ? 0.5 : 0.25, span = 46 * 90, px = (((b.x - this.cam * this.ppm * AX.x * -k * 0.2) % span) + span) % span - 120;
      const base = h * (b.layer ? 0.42 : 0.38); c.fillStyle = b.c; c.fillRect(px, base - b.h, b.w, b.h + 40);
      c.fillStyle = b.layer ? 'rgba(255,210,120,.18)' : 'rgba(120,180,255,.12)';
      for (let yy = base - b.h + 10; yy < base - 6; yy += 16) for (let xx = px + 6; xx < px + b.w - 8; xx += 14) if (((xx * 7 + yy * 13) | 0) % 5 < 2) c.fillRect(xx, yy, 5, 7);
    }
    // suelo
    c.fillStyle = '#0a0f20'; c.fillRect(-20, h * 0.4, w + 40, h);
    const hz = c.createLinearGradient(0, h * 0.4, 0, h * 0.62); hz.addColorStop(0, 'rgba(90,130,255,.22)'); hz.addColorStop(1, 'rgba(90,130,255,0)'); c.fillStyle = hz; c.fillRect(-20, h * 0.4, w + 40, h * 0.22);
    // pista
    const R = (Math.hypot(w, h) / this.ppm) * 0.9, d0 = this.cam - R, d1 = this.cam + R;
    const quad = (a: number, b: number, l0: number, l1: number, fill: string) => { const p = [this.scr(a, l0), this.scr(b, l0), this.scr(b, l1), this.scr(a, l1)]; c.fillStyle = fill; c.beginPath(); c.moveTo(p[0].x, p[0].y); for (let i = 1; i < 4; i++) c.lineTo(p[i].x, p[i].y); c.closePath(); c.fill(); };
    quad(d0, d1, -this.rh, this.rh, '#262e4a');
    for (let k = Math.floor(d0 / 12) * 12; k < d1; k += 12) quad(k, k + 6, -this.rh, this.rh, 'rgba(255,255,255,.035)');
    const line = (l: number, col: string, wpx: number) => { const a = this.scr(d0, l), b = this.scr(d1, l); c.strokeStyle = col; c.lineWidth = wpx; c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.stroke(); };
    line(-this.rh, '#ffb020', 5); line(this.rh, '#ffb020', 5);
    for (let k = Math.floor(d0 / 8) * 8; k < d1; k += 8) quad(k, k + 3.5, -2, 2, 'rgba(255,255,255,.55)');
    // línea de salida y meta
    if (d0 < 6 && d1 > -6) { quad(-0.5, 0.5, -this.rh, this.rh, '#f4f6ff'); }
    if (d1 > DRAG_DIST - 6 && d0 < DRAG_DIST + 6) {
      for (let i = 0; i < 12; i++) for (let j = 0; j < 2; j++) quad(DRAG_DIST - 1 + j, DRAG_DIST + j, -this.rh + (i * this.rh * 2) / 12, -this.rh + ((i + 1) * this.rh * 2) / 12, (i + j) % 2 ? '#111' : '#fff');
    }
    // vallas, postes y letreros (detrás de los autos más lejanos primero)
    const side = (l: number, dist: number, hgt: number, col: string) => { const a = this.scr(dist, l), b = this.scr(dist, l, hgt); c.strokeStyle = col; c.lineWidth = 6; c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.stroke(); };
    for (let k = Math.floor(d0 / 10) * 10; k < d1; k += 10) {
      const alt = ((k / 10) | 0) % 2 === 0; side(-this.rh - 14, k, 22, alt ? '#e8eaf5' : '#ff4d6a'); side(this.rh + 14, k, 22, alt ? '#e8eaf5' : '#ff4d6a');
    }
    for (let k = Math.floor(d0 / 50) * 50; k < d1; k += 50) {
      const top = this.scr(k, this.rh + 24, 120); side(this.rh + 24, k, 120, '#6b7390');
      const glow = c.createRadialGradient(top.x, top.y, 2, top.x, top.y, 70); glow.addColorStop(0, 'rgba(255,230,160,.9)'); glow.addColorStop(1, 'rgba(255,230,160,0)'); c.fillStyle = glow; c.beginPath(); c.arc(top.x, top.y, 70, 0, 7); c.fill();
    }
    for (const m of [100, 200, 300]) if (m > d0 && m < d1) { const p = this.scr(m, -this.rh - 40, 70); c.fillStyle = 'rgba(11,16,32,.85)'; c.fillRect(p.x - 34, p.y - 22, 68, 28); c.fillStyle = '#ffb020'; c.font = '700 18px Fredoka, system-ui'; c.textAlign = 'center'; c.fillText(`${m} m`, p.x, p.y - 2); side(-this.rh - 40, m, 70, '#6b7390'); }
    // arco de meta
    if (d1 > DRAG_DIST - 4 && d0 < DRAG_DIST + 4) { side(-this.rh - 6, DRAG_DIST, 150, '#ffb020'); side(this.rh + 6, DRAG_DIST, 150, '#ffb020'); const a = this.scr(DRAG_DIST, -this.rh - 6, 150), b = this.scr(DRAG_DIST, this.rh + 6, 150); c.strokeStyle = '#ffb020'; c.lineWidth = 12; c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.stroke(); const m2 = this.scr(DRAG_DIST, 0, 150); c.fillStyle = '#fff'; c.font = '800 22px Fredoka, system-ui'; c.fillText('META', m2.x, m2.y + 8); }
    // autos (el más abajo en pantalla va delante)
    const cars = [{ x: oppX, lane: -this.lane, car: this.opp as DragCar, me: false }, { x: myX, lane: this.lane, car: this.me, me: true }].map((o) => ({ ...o, p: this.scr(o.x, o.lane) })).sort((a, b) => a.p.y - b.p.y);
    for (const o of cars) this.drawCar(c, o.p, o.car, o.me ? v : g > 0 ? sample(this.ai.vs, g, this.ai.dt) : 0, o.me ? this.sim.nitroLeft > 0 : g > 0 && this.aiNitroOn(g), now);
    // partículas
    for (let i = this.parts.length - 1; i >= 0; i--) { const p = this.parts[i]; p.life += dt; if (p.life > p.max) { this.parts.splice(i, 1); continue; } p.x += p.vx * dt; p.y += p.vy * dt; const a = 1 - p.life / p.max; c.fillStyle = `rgba(${p.c},${a * 0.5})`; c.beginPath(); c.arc(p.x, p.y, p.r * (1 + p.life), 0, 7); c.fill(); }
    // líneas de velocidad (recorren la pantalla en sentido contrario a la marcha)
    if (v > 22) {
      const al = Math.min(0.4, (v - 22) / 110), D = Math.hypot(w, h); c.lineWidth = 2;
      for (let i = 0; i < this.lines.length; i++) {
        const L = this.lines[i], fx = ((i * 7919) % 1000) / 1000, fy = ((i * 6007) % 1000) / 1000, ph = ((L.o + this.cam * 0.0035 * (0.6 + L.l)) % 1 + 1) % 1;
        const off = ph * D * 1.2 - D * 0.1, len = 60 + v * 2.2 * L.l, x = fx * w - AX.x * off, y = fy * h - AX.y * off;
        c.strokeStyle = `rgba(220,235,255,${al * (0.5 + L.l * 0.5)})`; c.beginPath(); c.moveTo(x, y); c.lineTo(x - AX.x * len, y - AX.y * len); c.stroke();
      }
    }
    c.restore();
    // viñeta + nitro
    const vg = c.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.hypot(w, h) * 0.6); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, this.sim.nitroLeft > 0 ? 'rgba(20,120,255,.45)' : 'rgba(0,0,0,.55)'); c.fillStyle = vg; c.fillRect(0, 0, w, h);
    this.drawHud(c, now, g, v);
  }
  private aiNitroOn(g: number) { return g >= this.aiNitroAt && g < this.aiNitroAt + 2.2; }
  private img(car: DragCar) { const u = this.hooks.carImg(car); if (!u) return undefined; let i = this.imgs.get(u); if (!i) { i = new Image(); i.src = u; this.imgs.set(u, i); } return i.complete ? i : undefined; }
  private drawCar(c: CanvasRenderingContext2D, p: { x: number; y: number }, car: DragCar, v: number, nitroOn: boolean, now: number) {
    const bob = Math.sin(now / 55) * Math.min(1.6, v / 30);
    c.fillStyle = 'rgba(0,0,0,.4)'; c.beginPath(); c.ellipse(p.x, p.y + 6, 86 * this.k, 26 * this.k, Math.atan2(AX.y, AX.x), 0, 7); c.fill();
    if (nitroOn) { const fx = p.x - AX.x * 100, fy = p.y - 30 - AX.y * 100; const gr = c.createRadialGradient(fx, fy, 2, fx - AX.x * 70, fy - AX.y * 70, 90); gr.addColorStop(0, 'rgba(210,240,255,.95)'); gr.addColorStop(0.4, 'rgba(60,170,255,.7)'); gr.addColorStop(1, 'rgba(60,170,255,0)'); c.fillStyle = gr; c.beginPath(); c.ellipse(fx - AX.x * 50, fy - AX.y * 50, 90 + Math.random() * 14, 20, Math.atan2(AX.y, AX.x), 0, 7); c.fill(); }
    const im = this.img(car); if (!im) return;
    const W = 250 * this.k, H = (im.naturalHeight / im.naturalWidth) * W;
    c.drawImage(im, p.x - W / 2, p.y - H * 0.62 + bob, W, H);
  }
  private drawHud(c: CanvasRenderingContext2D, now: number, g: number, v: number) {
    const { w, h } = this; c.textAlign = 'center';
    // semáforo
    if (!this.sim.launched || g < 0.6) {
      const n = g >= 0 ? 4 : Math.min(3, Math.floor((now - this.startAt) / 650));
      c.fillStyle = 'rgba(11,16,32,.85)'; c.beginPath(); c.roundRect(w / 2 - 78, 74, 156, 52, 14); c.fill();
      for (let i = 0; i < 3; i++) { const on = n > i && g < 0 || (g >= 0 && false); c.fillStyle = on ? '#ffb020' : '#2b3350'; c.beginPath(); c.arc(w / 2 - 44 + i * 44, 100, 15, 0, 7); c.fill(); }
      if (g >= 0) { c.fillStyle = '#38e08a'; c.shadowColor = '#38e08a'; c.shadowBlur = 24; c.beginPath(); c.arc(w / 2, 100, 20, 0, 7); c.fill(); c.shadowBlur = 0; }
      if (!this.sim.launched) { c.fillStyle = '#fff'; c.font = '600 16px Fredoka, system-ui'; c.fillText(g < 0 ? 'Prepárate…' : '¡TOCA AHORA!', w / 2, 150); }
    }
    // progreso
    const bw = Math.min(360, w - 40), bx = w / 2 - bw / 2, by = 22;
    c.fillStyle = 'rgba(11,16,32,.8)'; c.beginPath(); c.roundRect(bx - 8, by - 8, bw + 16, 50, 12); c.fill();
    const myP = Math.min(1, this.myX() / DRAG_DIST), opP = Math.min(1, this.oppX(g) / DRAG_DIST);
    c.fillStyle = '#2b3350'; c.fillRect(bx, by + 4, bw, 6); c.fillRect(bx, by + 26, bw, 6);
    c.fillStyle = '#ffb020'; c.fillRect(bx, by + 4, bw * myP, 6); c.fillStyle = '#38c8ff'; c.fillRect(bx, by + 26, bw * opP, 6);
    c.fillStyle = '#fff'; c.font = '700 11px Fredoka, system-ui'; c.textAlign = 'left'; c.fillText('TÚ', bx, by); c.fillText(this.opp.name.toUpperCase(), bx, by + 22); c.textAlign = 'center';
    const t = this.sim.launched ? Math.max(0, this.sim.finished ? this.sim.time : this.sim.t + this.sim.penalty) : 0;
    c.fillStyle = '#fff'; c.font = '700 22px Fredoka, system-ui'; c.textAlign = 'left'; c.fillText(`${t.toFixed(2)} s`, 16, 84); c.textAlign = 'center';
    // tacómetro
    const cx = 96, cy = h - 150, R = 78;
    c.fillStyle = 'rgba(11,16,32,.82)'; c.beginPath(); c.arc(cx, cy, R + 12, 0, 7); c.fill();
    const a0 = Math.PI * 0.75, a1 = Math.PI * 2.25, ang = (r: number) => a0 + (a1 - a0) * Math.min(1.04, r) / 1.04;
    const zone = (r0: number, r1: number, col: string) => { c.strokeStyle = col; c.lineWidth = 12; c.beginPath(); c.arc(cx, cy, R - 2, ang(r0), ang(r1)); c.stroke(); };
    zone(0, GOOD[0], '#2f3a5e'); zone(GOOD[0], PERFECT[0], '#ffd24a'); zone(PERFECT[0], PERFECT[1], '#38e08a'); zone(PERFECT[1], REDLINE + 0.04, '#ff4d6a');
    const r = this.sim.launched ? this.sim.rpm : 0.22 + (g >= 0 ? Math.min(0.55, g) : 0.1 * Math.sin(now / 90) + 0.12);
    const na = ang(r); c.strokeStyle = '#fff'; c.lineWidth = 4; c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx + Math.cos(na) * (R - 16), cy + Math.sin(na) * (R - 16)); c.stroke();
    c.fillStyle = '#fff'; c.beginPath(); c.arc(cx, cy, 6, 0, 7); c.fill();
    c.font = '800 34px Fredoka, system-ui'; c.fillText(String(this.sim.gear), cx, cy + 40); c.font = '600 12px Fredoka, system-ui'; c.fillStyle = '#aab'; c.fillText(`MARCHA · ${Math.round(v * 3.6)} km/h`, cx, cy + 58);
    // avisos
    for (let i = this.pops.length - 1; i >= 0; i--) { const p = this.pops[i]; p.t += 1 / 60; if (p.t > 1.1) { this.pops.splice(i, 1); continue; } c.globalAlpha = Math.min(1, 1.6 - p.t * 1.4); c.fillStyle = p.color; c.font = '800 34px Fredoka, system-ui'; c.strokeStyle = 'rgba(0,0,0,.7)'; c.lineWidth = 6; const y = h * 0.66 - p.t * 40; c.strokeText(p.text, w / 2, y); c.fillText(p.text, w / 2, y); c.globalAlpha = 1; }
  }
}
