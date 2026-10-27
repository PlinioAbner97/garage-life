import { useEffect, useMemo, useRef, useState } from 'react';
import { store } from '../core/store';
import { useGame, fmt } from './hooks';
import { VEHICLES, getModel, type VehicleModel } from '../data/vehicles';
import { bridge } from '../engine/bridge';
import { PROJ, SPRITE_INFO, SPRITE_SCALE } from '../engine/assets';
import { DEALER_PROJ, DEALER_CAR_SCALE, DEALER_PAD_HALF, DEALER_SIZE, DEALER_SLOTS, dealerProject } from '../data/dealer';
import dealerBg from '../assets/dealer_bg.webp';
import dealerFg from '../assets/dealer_fg.webp';

const [SW, SH] = DEALER_SIZE;
interface Placed { m: VehicleModel; url: string; x: number; y: number; w: number; h: number; depth: number; cx: number; cy: number }

/** Proyección del garaje (para colocar el sprite con el mismo punto de apoyo que en el garaje). */
const gproj = (x: number, y: number): [number, number] => [PROJ.origin[0] + x * PROJ.x[0] + y * PROJ.y[0], PROJ.origin[1] + x * PROJ.x[1] + y * PROJ.y[1]];

function layout(): Placed[] {
  const sc = bridge.scene; if (!sc) return [];
  return VEHICLES.slice(0, DEALER_SLOTS.length).map((m, i) => {
    const info = SPRITE_INFO[m.spriteKey]; const S = DEALER_CAR_SCALE * SPRITE_SCALE[m.spriteKey];
    const [gx, gy] = gproj(info.anchorWorld[0], info.anchorWorld[1]);
    const refx = gx - info.box[0], refy = gy - info.box[1];
    const [wx, wy] = DEALER_SLOTS[i]; const [px, py] = dealerProject(wx, wy);
    const w = (info.box[2] - info.box[0]) * S, h = (info.box[3] - info.box[1]) * S;
    return { m, url: sc.carImage(m.id, 'stock', 'stock'), x: px - refx * S, y: py - refy * S, w, h, depth: py, cx: wx, cy: wy };
  });
}

/** Farolas del render (px del escenario): cabeza y pie. Dan el brillo ambiental animado. */
const LAMPS: [number, number][] = [[48, 536], [508, 657], [967, 778], [957, 443], [1707, 640], [1324, 858]];
const NEON: [number, number, number, string][] = [[1430, 470, 330, 'rgba(255,70,60,.55)'], [1560, 650, 240, 'rgba(255,90,70,.4)'], [1190, 600, 260, 'rgba(90,170,255,.28)']];
/** Huella del auto en el piso (m): largo en Y, ancho en X. */
const footprint = (cx: number, cy: number, hx: number, hy: number) => [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => dealerProject(cx + a * hx, cy + b * hy).join(',')).join(' ');

/** Elipse unitaria -> elipse en el piso (semiejes hx, hy metros) en la proyección de la cámara. */
const shadowTf = (cx: number, cy: number, hx: number, hy: number) => { const [ox, oy] = dealerProject(cx, cy); return `matrix(${DEALER_PROJ.x[0] * hx} ${DEALER_PROJ.x[1] * hx} ${DEALER_PROJ.y[0] * hy} ${DEALER_PROJ.y[1] * hy} ${ox} ${oy})`; };

interface Cam { x: number; y: number; z: number }

/** Concesionario: pantalla aparte (otra cámara libre). Toca un auto estacionado para ver su nombre, precio y comprarlo. */
export function DealerOverlay() {
  const { save, ui } = useGame();
  const [sel, setSel] = useState<string | null>(null);
  const [view, setView] = useState({ w: window.innerWidth, h: window.innerHeight });
  const [cam, setCam] = useState<Cam | null>(null);
  const [anim, setAnim] = useState(false);
  const ptrs = useRef(new Map<number, { x: number; y: number }>());
  const gest = useRef<{ x: number; y: number; cam: Cam; moved: boolean; d0: number; z0: number } | null>(null);
  const alpha = useRef(new Map<string, ImageData>());
  const open = ui.dealer;
  const cars = useMemo(() => (open ? layout() : []), [open]);
  const cover = Math.max(view.w / SW, view.h / SH);
  const zMax = cover * 3.2;
  const fit = (c: Cam): Cam => {
    const z = Math.min(zMax, Math.max(cover, c.z));
    return { z, x: Math.min(0, Math.max(view.w - SW * z, c.x)), y: Math.min(0, Math.max(view.h - SH * z, c.y)) };
  };
  const center = (sx: number, sy: number, z: number, fy = 0.5): Cam => fit({ z, x: view.w / 2 - sx * z, y: view.h * fy - sy * z });
  useEffect(() => { const f = () => setView({ w: window.innerWidth, h: window.innerHeight }); window.addEventListener('resize', f); return () => window.removeEventListener('resize', f); }, []);
  useEffect(() => { if (!open) { setSel(null); setCam(null); } }, [open]);
  useEffect(() => { if (open && !cam) setCam(center(700, 540, cover * 1.02)); });
  useEffect(() => {
    cars.forEach((c) => {
      if (alpha.current.has(c.m.id) || !c.url) return;
      const img = new Image(); img.onload = () => { const cv = document.createElement('canvas'); cv.width = img.naturalWidth; cv.height = img.naturalHeight; const g = cv.getContext('2d')!; g.drawImage(img, 0, 0); alpha.current.set(c.m.id, g.getImageData(0, 0, cv.width, cv.height)); }; img.src = c.url;
    });
  }, [cars]);
  if (!open || !cam) return null;
  const C = fit(cam);

  const hit = (cx: number, cy: number, el: HTMLElement) => {
    const r = el.getBoundingClientRect();
    const sx = (cx - r.left - C.x) / C.z, sy = (cy - r.top - C.y) / C.z;
    for (const c of [...cars].sort((a, b) => b.depth - a.depth)) {
      if (sx < c.x || sy < c.y || sx > c.x + c.w || sy > c.y + c.h) continue;
      const d = alpha.current.get(c.m.id); if (!d) return c.m.id;
      const ix = Math.floor(((sx - c.x) / c.w) * d.width), iy = Math.floor(((sy - c.y) / c.h) * d.height);
      if (d.data[(iy * d.width + ix) * 4 + 3] > 30) return c.m.id;
    }
    return null;
  };
  const zoomAt = (px: number, py: number, nz: number) => { const z = Math.min(zMax, Math.max(cover, nz)); setCam(fit({ z, x: px - ((px - C.x) / C.z) * z, y: py - ((py - C.y) / C.z) * z })); };
  const pick = (id: string | null) => {
    setSel(id);
    const c = cars.find((q) => q.m.id === id);
    if (c) { setAnim(true); setCam(center(c.x + c.w / 2, c.y + c.h / 2, Math.max(C.z, cover * 1.9), 0.4)); }
  };

  const m = sel ? getModel(sel) : null;
  const owned = m ? save.cars.filter((c) => c.model === m.id).length : 0;
  const locked = m ? save.level < m.minLevel : false;
  const selCar = cars.find((c) => c.m.id === sel);

  return (
    <div className="dealer">
      <div className="dealer-view"
        onWheel={(e) => zoomAt(e.clientX, e.clientY, C.z * (e.deltaY < 0 ? 1.15 : 1 / 1.15))}
        onPointerDown={(e) => {
          setAnim(false); (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
          ptrs.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
          const pts = [...ptrs.current.values()];
          gest.current = { x: e.clientX, y: e.clientY, cam: C, moved: false, d0: pts.length > 1 ? Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) : 0, z0: C.z };
        }}
        onPointerMove={(e) => {
          const g = gest.current; if (!g || !ptrs.current.has(e.pointerId)) return;
          ptrs.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
          const pts = [...ptrs.current.values()];
          if (pts.length > 1 && g.d0 > 0) {
            g.moved = true; const d = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
            zoomAt((pts[0].x + pts[1].x) / 2, (pts[0].y + pts[1].y) / 2, g.z0 * (d / g.d0));
          } else {
            const dx = e.clientX - g.x, dy = e.clientY - g.y;
            if (Math.hypot(dx, dy) > 6) g.moved = true;
            if (g.moved) setCam(fit({ ...g.cam, x: g.cam.x + dx, y: g.cam.y + dy }));
          }
        }}
        onPointerUp={(e) => { const g = gest.current; ptrs.current.delete(e.pointerId); if (ptrs.current.size === 0) { gest.current = null; if (g && !g.moved) pick(hit(e.clientX, e.clientY, e.currentTarget as HTMLElement)); } }}
        onPointerCancel={(e) => { ptrs.current.delete(e.pointerId); gest.current = null; }}>
        <div className={`dealer-stage ${anim ? 'anim' : ''}`} style={{ width: SW, height: SH, transform: `translate(${C.x}px, ${C.y}px) scale(${C.z})` }}>
          <img className="dealer-bg" src={dealerBg} width={SW} height={SH} alt="" draggable={false} />
          {/* charcos de luz de las farolas */}
          <svg className="dealer-layer" width={SW} height={SH} style={{ zIndex: 1 }}>
            <defs>
              <radialGradient id="dsh1"><stop offset="0" stopColor="#000" stopOpacity=".62" /><stop offset=".55" stopColor="#000" stopOpacity=".32" /><stop offset="1" stopColor="#000" stopOpacity="0" /></radialGradient>
              <radialGradient id="dsh2"><stop offset="0" stopColor="#000" stopOpacity=".85" /><stop offset=".7" stopColor="#000" stopOpacity=".5" /><stop offset="1" stopColor="#000" stopOpacity="0" /></radialGradient>
            </defs>
            {selCar && <polygon className="dealer-padsel" points={footprint(selCar.cx, selCar.cy, DEALER_PAD_HALF[0], DEALER_PAD_HALF[1])} />}
            {/* sombras: difusa + de contacto, sobre el asfalto y bajo el auto */}
            {cars.map((c) => (
              <g key={c.m.id}>
                <ellipse cx={0} cy={0} rx={1} ry={1} fill="url(#dsh1)" transform={shadowTf(c.cx, c.cy + 0.15, 2.0, 3.0)} />
                <ellipse cx={0} cy={0} rx={1} ry={1} fill="url(#dsh2)" transform={shadowTf(c.cx, c.cy, 1.45, 2.5)} />
              </g>
            ))}
          </svg>
          {cars.map((c) => (
            <img key={c.m.id} className={`dealer-car ${sel === c.m.id ? 'on' : ''}`} src={c.url} alt={c.m.name} draggable={false}
              style={{ left: c.x, top: c.y, width: c.w, height: c.h, zIndex: 10 + Math.round(c.depth) }} />
          ))}
          {/* postes y palmeras que están delante de los autos */}
          <img className="dealer-fg" src={dealerFg} width={SW} height={SH} alt="" draggable={false} style={{ zIndex: 900 }} />
          {/* luces animadas (solo opacidad: no repintan la escena) */}
          <div className="dealer-glows" style={{ zIndex: 950 }}>
            {LAMPS.map(([x, y], i) => <i key={`p${i}`} className="dealer-flick" style={{ left: x - 230, top: y - 120, width: 460, height: 240, animationDelay: `${i * 0.7}s`, background: 'radial-gradient(closest-side, rgba(255,217,160,.30), rgba(255,217,160,0))' }} />)}
            {LAMPS.map(([x, y], i) => <i key={`h${i}`} className="dealer-flick" style={{ left: x - 36, top: y - 205 - 36, width: 84, height: 72, animationDelay: `${i * 0.7}s`, background: 'radial-gradient(closest-side, rgba(255,236,200,.75), rgba(255,226,176,0))' }} />)}
            {NEON.map((n, i) => <i key={`n${i}`} className="dealer-pulse" style={{ left: n[0] - n[2], top: n[1] - n[2], width: n[2] * 2, height: n[2] * 2, animationDelay: `${i * 0.9}s`, background: `radial-gradient(closest-side, ${n[3]}, rgba(0,0,0,0))` }} />)}
          </div>
          {cars.map((c) => { const [px, py] = dealerProject(c.cx, c.cy, 2.6); return (
            <div key={`t${c.m.id}`} className={`dealer-tag ${save.level < c.m.minLevel ? 'lock' : ''} ${sel === c.m.id ? 'on' : ''}`} style={{ left: px, top: py, zIndex: 1000, transform: `translate(-50%, -100%) scale(${1 / Math.max(1, C.z / cover)})` }}>{save.level < c.m.minLevel ? `🔒 Nv ${c.m.minLevel}` : c.m.name}</div>
          ); })}
        </div>
        <div className="dealer-vig" />
      </div>
      <div className="dealer-top">
        <button className="btn ghost" onClick={() => store.openDealer(false)}>↩ Volver al garaje</button>
        <div className="grow"><b>Concesionario JDM</b></div>
        <div className="pill money">💵 <b>${fmt(save.money)}</b></div>
      </div>
      <div className="dealer-zoom">
        <button className="icon" title="Acercar" onClick={() => { setAnim(true); zoomAt(view.w / 2, view.h / 2, C.z * 1.3); }}>＋</button>
        <button className="icon" title="Alejar" onClick={() => { setAnim(true); zoomAt(view.w / 2, view.h / 2, C.z / 1.3); }}>－</button>
        <button className="icon" title="Vista completa" onClick={() => { setAnim(true); setSel(null); setCam(center(700, 540, cover * 1.02)); }}>⤢</button>
      </div>
      {m ? (
        <div className="dealer-card">
          <div className="grow">
            <b>{m.name}</b><small>{m.tagline}</small>
            <small>Potencia {m.stats.potencia} · Agarre {m.stats.agarre} · Estilo {m.stats.estilo}</small>
            {owned > 0 && <small>Ya tienes {owned}</small>}
          </div>
          <div className="col">
            <button className="btn primary" disabled={locked} onClick={() => store.buyCar(m.id)}>
              {locked ? `🔒 Nivel ${m.minLevel}` : m.price === 0 ? 'Comprar · Gratis' : `Comprar · $${fmt(m.price)}`}
            </button>
          </div>
        </div>
      ) : <div className="dealer-hint">Toca un auto para ver su precio · arrastra para mover · pellizca o rueda para zoom</div>}
    </div>
  );
}
