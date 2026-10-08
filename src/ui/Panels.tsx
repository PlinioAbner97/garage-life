import { auth } from '../core/auth';
import { useAuth } from './useAuth';
import { useEffect, useState, type ReactNode } from 'react';
import { store } from '../core/store';
import { SELL_RATIO, SLOT_COUNT, SLOT_UNLOCK_COST } from '../data/config';
import { VEHICLES, getModel } from '../data/vehicles';
import { JOBS, getJob } from '../data/jobs';
import { PAINTS, RIMS, findPaint, findRim, type ColorPart } from '../data/parts';
import { bridge } from '../engine/bridge';
import { fmt, fmtTime, useGame } from './hooks';

function Sheet({ title, onClose, children, side }: { title: string; onClose: () => void; children: ReactNode; side?: boolean }) {
  return (
    <div className={`sheet ${side ? 'side' : ''}`} role="dialog" aria-label={title}>
      <header><h2>{title}</h2><button className="icon" aria-label="Cerrar" onClick={onClose}>✕</button></header>
      <div className="sheet-body">{children}</div>
    </div>
  );
}

export function Panels() {
  const { ui } = useGame();
  const close = () => store.openPanel(null);
  switch (ui.panel) {
    case 'garage': return <Sheet title="Mi garaje" onClose={close}><GaragePanel /></Sheet>;
    case 'shop': return <Sheet title="Tienda" onClose={close}><ShopPanel /></Sheet>;
    case 'jobs': return <Sheet title="Trabajos del taller" onClose={close}><JobsPanel /></Sheet>;
    case 'customize': return <Sheet title="Personalizar" side onClose={() => { store.setPreview(null); close(); }}><CustomizePanel /></Sheet>;
    case 'settings': return <Sheet title="Ajustes" onClose={close}><SettingsPanel /></Sheet>;
    default: return null;
  }
}

function Stat({ label, v }: { label: string; v: number }) {
  return <div className="stat"><span>{label}</span><div><i style={{ width: `${v}%` }} /></div></div>;
}

function GaragePanel() {
  const { save, ui } = useGame();
  return (
    <>
      <p className="muted">{save.cars.length} / {save.slotsUnlocked} plazas ocupadas. Selecciona un auto y toca una plaza libre del garaje para moverlo.</p>
      <div className="list">
        {save.cars.map((c) => {
          const m = getModel(c.model); const job = save.jobs[c.id];
          return (
            <div key={c.id} className={`card ${ui.selectedId === c.id ? 'sel' : ''}`}>
              <div className="grow">
                <b>{m.name}</b>
                <small>Plaza {c.slot + 1} · Pintura: {findPaint(c.paint).name} · Rines: {findRim(c.rim).name}</small>
                <small>{job ? `${getJob(job.jobId).icon} ${getJob(job.jobId).name}` : 'Disponible'}</small>
                <Stat label="Potencia" v={m.stats.potencia} /><Stat label="Agarre" v={m.stats.agarre} /><Stat label="Estilo" v={m.stats.estilo} />
              </div>
              <div className="col">
                <button className="btn primary" onClick={() => { store.selectCar(c.id); store.openPanel(null); bridge.scene?.focusCar(c.id); }}>Ver</button>
                <button className="btn ghost danger" onClick={() => { const v = Math.round(m.price * SELL_RATIO); if (confirm(`¿Vender ${m.name}? Recibirás aprox. $${fmt(v)}`)) store.sellCar(c.id); }}>Vender</button>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

function ShopPanel() {
  const { save } = useGame();
  const next = save.slotsUnlocked;
  return (
    <>
      <h3>Autos</h3>
      <div className="list">
        {VEHICLES.map((m) => {
          const locked = save.level < m.minLevel;
          return (
            <div key={m.id} className={`card ${locked ? 'locked' : ''}`}>
              <div className="grow">
                <b>{m.name}</b><small>{m.tagline}</small>
                <Stat label="Potencia" v={m.stats.potencia} /><Stat label="Agarre" v={m.stats.agarre} /><Stat label="Estilo" v={m.stats.estilo} />
                <small>Ingresos en trabajos ×{m.payBonus}</small>
              </div>
              <div className="col">
                <button className="btn primary" disabled={locked} onClick={() => store.buyCar(m.id)}>
                  {locked ? `🔒 Nivel ${m.minLevel}` : m.price === 0 ? 'Gratis' : `$${fmt(m.price)}`}
                </button>
              </div>
            </div>
          );
        })}
      </div>
      <h3>Taller</h3>
      <div className="card">
        <div className="grow">
          <b>Ampliar el garaje</b>
          <small>{next >= SLOT_COUNT ? 'Ya tienes todas las plazas.' : `Plaza ${next + 1} de ${SLOT_COUNT}: más autos trabajando a la vez.`}</small>
        </div>
        <div className="col">
          <button className="btn primary" disabled={next >= SLOT_COUNT} onClick={() => store.unlockSlot()}>
            {next >= SLOT_COUNT ? 'Completo' : `$${fmt(SLOT_UNLOCK_COST[next])}`}
          </button>
        </div>
      </div>
      <p className="muted">La pintura y los rines se compran en <b>🎨 Estilo</b>.</p>
    </>
  );
}

function JobsPanel() {
  const { save, ui } = useGame();
  const idle = save.cars.filter((c) => !save.jobs[c.id]);
  const [carId, setCarId] = useState<string | null>(ui.selectedId && !save.jobs[ui.selectedId] ? ui.selectedId : idle[0]?.id ?? null);
  const car = save.cars.find((c) => c.id === carId && !save.jobs[c.id]) ?? idle[0];
  const active = save.cars.filter((c) => save.jobs[c.id]);
  return (
    <>
      {active.length > 0 && (<>
        <h3>En curso</h3>
        <div className="list">
          {active.map((c) => {
            const j = save.jobs[c.id]; const def = getJob(j.jobId); const done = j.done || ui.now >= j.endsAt;
            return (
              <div key={c.id} className="card">
                <div className="grow"><b>{def.icon} {def.name}</b><small>{getModel(c.model).name}</small>
                  <div className="mini"><i style={{ width: `${done ? 100 : Math.min(100, (1 - (j.endsAt - ui.now) / (def.seconds * 1000)) * 100)}%` }} /></div></div>
                <div className="col">{done ? <button className="btn primary" onClick={() => store.collectJob(c.id)}>💰 Cobrar</button> : <span className="timer">{fmtTime(j.endsAt - ui.now)}</span>}</div>
              </div>
            );
          })}
        </div>
      </>)}
      <h3>Nuevo trabajo</h3>
      {car ? (<>
        <label className="field">Auto
          <select value={car.id} onChange={(e) => setCarId(e.target.value)}>
            {idle.map((c) => <option key={c.id} value={c.id}>{getModel(c.model).name} · plaza {c.slot + 1}</option>)}
          </select>
        </label>
        <div className="list">
          {JOBS.map((j) => {
            const locked = save.level < j.minLevel; const pay = Math.round(j.pay * getModel(car.model).payBonus);
            return (
              <div key={j.id} className={`card ${locked ? 'locked' : ''}`}>
                <div className="grow"><b>{j.icon} {j.name}</b><small>⏱ {fmtTime(j.seconds * 1000)} · +{j.xp} XP</small></div>
                <div className="col">
                  <button className="btn primary" disabled={locked} onClick={() => { if (store.startJob(car.id, j.id)) { store.dismissTutorial(); store.openPanel(null); bridge.scene?.focusCar(car.id); } }}>
                    {locked ? `🔒 Nivel ${j.minLevel}` : `$${fmt(pay)}`}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </>) : <p className="muted">Todos tus autos están ocupados. Compra otro en la tienda o espera a que terminen.</p>}
    </>
  );
}

function Swatch({ p, on, locked, onPick }: { p: ColorPart; on: boolean; locked: boolean; onPick: () => void }) {
  return (
    <button className={`swatch ${on ? 'on' : ''} ${locked ? 'locked' : ''}`} onClick={onPick} title={`${p.name}${locked ? ` · Nivel ${p.minLevel}` : ''}`}>
      <i style={{ background: p.hex ?? 'conic-gradient(#d3202a,#ffd21a,#1d57d8,#d3202a)' }}>{locked ? '🔒' : ''}</i>
      <small>{p.name}</small><em>{p.price ? `$${fmt(p.price)}` : 'Gratis'}</em>
    </button>
  );
}

function CustomizePanel() {
  const { save, ui } = useGame();
  const car = save.cars.find((c) => c.id === ui.selectedId);
  const [paint, setPaint] = useState(car?.paint ?? 'stock');
  const [rim, setRim] = useState(car?.rim ?? 'stock');
  useEffect(() => { if (car) store.setPreview({ carId: car.id, paint, rim }); }, [paint, rim, car?.id]);
  if (!car) return <p className="muted">Selecciona un auto en el garaje.</p>;
  const cost = (paint !== car.paint ? findPaint(paint).price : 0) + (rim !== car.rim ? findRim(rim).price : 0);
  const changed = paint !== car.paint || rim !== car.rim;
  return (
    <>
      <p className="muted">{getModel(car.model).name} · mira el cambio en vivo en el garaje.</p>
      <h3>Pintura</h3>
      <div className="swatches">{PAINTS.map((p) => <Swatch key={p.id} p={p} on={paint === p.id} locked={save.level < p.minLevel} onPick={() => (save.level < p.minLevel ? store.toast(`Requiere nivel ${p.minLevel}`, 'bad') : setPaint(p.id))} />)}</div>
      <h3>Rines</h3>
      <div className="swatches">{RIMS.map((p) => <Swatch key={p.id} p={p} on={rim === p.id} locked={save.level < p.minLevel} onPick={() => (save.level < p.minLevel ? store.toast(`Requiere nivel ${p.minLevel}`, 'bad') : setRim(p.id))} />)}</div>
      <div className="applybar">
        <button className="btn" onClick={() => { setPaint(car.paint); setRim(car.rim); }} disabled={!changed}>Deshacer</button>
        <button className="btn primary" disabled={!changed} onClick={() => { if (store.applyCustomization(car.id, paint, rim)) { store.setPreview(null); store.openPanel(null); } }}>
          {cost ? `Aplicar · $${fmt(cost)}` : 'Aplicar'}
        </button>
      </div>
    </>
  );
}

function SettingsPanel() {
  const { save } = useGame();
  const a = useAuth();
  return (
    <>
      <div className="stats">
        <div><b>${fmt(save.totalEarned)}</b><small>ganado en total</small></div>
        <div><b>{save.jobsDone}</b><small>trabajos hechos</small></div>
        <div><b>{save.cars.length}</b><small>autos</small></div>
      </div>
      <div className="list">
        <button className="btn" onClick={() => store.toMenu()}>🏠 Volver al menú</button>
        {a.email && <button className="btn" onClick={() => void auth.signOut()}>🚪 Cerrar sesión</button>}
        <button className="btn ghost danger" onClick={() => { if (confirm('¿Borrar toda tu partida? No se puede deshacer.')) void store.resetAll(); }}>🗑️ Borrar partida</button>
      </div>
      <p className="muted">{a.email ? `Sesión: ${a.email}. Tu progreso se guarda en tu cuenta y lo ves desde cualquier dispositivo.` : 'Tu progreso se guarda automáticamente en este navegador.'}</p>
    </>
  );
}
