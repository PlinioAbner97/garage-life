import { useEffect, useMemo, useRef, useState } from 'react';
import { store } from '../core/store';
import { useGame, fmt } from './hooks';
import { VEHICLES, getModel, type VehicleModel } from '../data/vehicles';
import { bridge } from '../engine/bridge';
import { PROJ, SPRITE_INFO, SPRITE_SCALE } from '../engine/assets';
import { DEALER_CAR_SCALE, DEALER_PAD_HALF, DEALER_SIZE, DEALER_SLOTS, dealerProject } from '../data/dealer';
import dealerBg from '../assets/dealer_bg.webp';

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

/** Concesionario: pantalla aparte (otra cámara). Toca un auto estacionado para ver su nombre, precio y comprarlo. */
export function DealerOverlay() {
  const { save, ui } = useGame();
  const [sel, setSel] = useState<string | null>(null);
  const [view, setView] = useState({ w: window.innerWidth, h: window.innerHeight });
  const [pan, setPan] = useState(0);
  const drag = useRef<{ x: number; pan: number; moved: boolean } | null>(null);
  const alpha = useRef(new Map<string, ImageData>());
  const open = ui.dealer;
  const cars = useMemo(() => (open ? layout() : []), [open]);
  useEffect(() => { const f = () => setView({ w: window.innerWidth, h: window.innerHeight }); window.addEventListener('resize', f); return () => window.removeEventListener('resize', f); }, []);
  useEffect(() => { if (!open) setSel(null); }, [open]);
  // Mapas de transparencia para tocar solo el auto, no su caja.
  useEffect(() => {
    cars.forEach((c) => {
      if (alpha.current.has(c.m.id) || !c.url) return;
      const img = new Image(); img.onload = () => { const cv = document.createElement('canvas'); cv.width = img.naturalWidth; cv.height = img.naturalHeight; const g = cv.getContext('2d')!; g.drawImage(img, 0, 0); alpha.current.set(c.m.id, g.getImageData(0, 0, cv.width, cv.height)); }; img.src = c.url;
    });
  }, [cars]);
  if (!open) return null;

  // Escala "cubrir" (sin franjas); si sobra ancho se arrastra para recorrer la exhibición.
  const k = Math.max(view.w / SW, view.h / SH);
  const maxPan = Math.max(0, SW * k - view.w);
  const cl = (v: number) => Math.min(0, Math.max(-maxPan, v));
  const off = cl(pan === 0 && maxPan > 0 ? -(maxPan * 0.33) : pan);
  const top = (view.h - SH * k) / 2;
  const m = sel ? getModel(sel) : null;
  const owned = m ? save.cars.filter((c) => c.model === m.id).length : 0;
  const locked = m ? save.level < m.minLevel : false;

  const hit = (ev: React.PointerEvent) => {
    const r = (ev.currentTarget as HTMLElement).getBoundingClientRect();
    const sx = (ev.clientX - r.left - off) / k, sy = (ev.clientY - r.top - top) / k;
    for (const c of [...cars].sort((a, b) => b.depth - a.depth)) {
      if (sx < c.x || sy < c.y || sx > c.x + c.w || sy > c.y + c.h) continue;
      const d = alpha.current.get(c.m.id); if (!d) return c.m.id;
      const ix = Math.floor(((sx - c.x) / c.w) * d.width), iy = Math.floor(((sy - c.y) / c.h) * d.height);
      if (d.data[(iy * d.width + ix) * 4 + 3] > 30) return c.m.id;
    }
    return null;
  };
  const padPts = (cx: number, cy: number) => [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => dealerProject(cx + a * DEALER_PAD_HALF[0], cy + b * DEALER_PAD_HALF[1]).join(',')).join(' ');
  const selCar = cars.find((c) => c.m.id === sel);

  return (
    <div className="dealer">
      <div className="dealer-top">
        <button className="btn ghost" onClick={() => store.openDealer(false)}>↩ Volver al garaje</button>
        <div className="grow"><b>Concesionario JDM</b></div>
        <div className="pill money">💵 <b>${fmt(save.money)}</b></div>
      </div>
      <div className="dealer-view"
        onPointerDown={(e) => { drag.current = { x: e.clientX, pan: off, moved: false }; }}
        onPointerMove={(e) => { const d = drag.current; if (!d) return; const dx = e.clientX - d.x; if (Math.abs(dx) > 6) d.moved = true; if (d.moved) setPan(cl(d.pan + dx)); }}
        onPointerUp={(e) => { const d = drag.current; drag.current = null; if (d && !d.moved) setSel(hit(e)); }}
        onPointerCancel={() => { drag.current = null; }}>
        <div className="dealer-stage" style={{ width: SW, height: SH, transform: `translate(${off}px, ${top}px) scale(${k})` }}>
          <img className="dealer-bg" src={dealerBg} width={SW} height={SH} alt="" draggable={false} />
          {selCar && <svg className="dealer-pad" width={SW} height={SH}><polygon points={padPts(selCar.cx, selCar.cy)} /></svg>}
          {cars.map((c) => (
            <img key={c.m.id} className={`dealer-car ${sel === c.m.id ? 'on' : ''}`} src={c.url} alt={c.m.name} draggable={false}
              style={{ left: c.x, top: c.y, width: c.w, height: c.h, zIndex: Math.round(c.depth) }} />
          ))}
          {cars.map((c) => { const [px, py] = dealerProject(c.cx, c.cy, 2.4); return (
            <div key={`t${c.m.id}`} className={`dealer-tag ${save.level < c.m.minLevel ? 'lock' : ''}`} style={{ left: px, top: py, zIndex: 5000 }}>{save.level < c.m.minLevel ? `🔒 Nv ${c.m.minLevel}` : c.m.name}</div>
          ); })}
        </div>
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
      ) : <div className="dealer-hint">Toca un auto para ver su precio{maxPan > 0 ? ' · arrastra para recorrer' : ''}</div>}
    </div>
  );
}
