import { store } from '../core/store';
import { xpForLevel } from '../data/config';
import { getModel } from '../data/vehicles';
import { getJob } from '../data/jobs';
import { bridge } from '../engine/bridge';
import { fmt, fmtTime, useGame } from './hooks';

export function Hud() {
  const { save, ui } = useGame();
  const need = xpForLevel(save.level);
  const car = save.cars.find((c) => c.id === ui.selectedId);
  const job = car ? save.jobs[car.id] : undefined;
  const ready = Object.values(save.jobs).filter((j) => j.done || ui.now >= j.endsAt).length;
  const open = (p: 'garage' | 'shop' | 'jobs' | 'settings') => store.openPanel(ui.panel === p ? null : p);

  const customize = () => {
    if (!car) { store.toast('Primero toca un auto para seleccionarlo', 'bad'); return; }
    bridge.scene?.focusCar(car.id);
    store.setPreview({ carId: car.id, paint: car.paint, rim: car.rim });
    store.openPanel('customize');
  };

  const hint = !save.tutorialDone && save.jobsDone === 0
    ? (car ? (job ? '⏳ Espera a que termine y toca el auto para cobrar' : '🔧 Abre «Trabajos» y elige un servicio para ganar dinero') : '👆 Toca tu Falcon GT para seleccionarlo')
    : null;

  return (
    <>
      <div className="hud-top">
        <div className="pill player">
          <div className="lvl">{save.level}</div>
          <div className="xpwrap">
            <div className="xpbar"><i style={{ width: `${Math.min(100, (save.xp / need) * 100)}%` }} /></div>
            <small>{fmt(save.xp)} / {fmt(need)} XP</small>
          </div>
        </div>
        <div className="pill money">💵 <b>${fmt(save.money)}</b></div>
        <div className="spacer" />
        {ready > 0 && <button className="btn primary pulse" onClick={() => store.collectAll()}>💰 Cobrar ({ready})</button>}
        <div className="cam">
          <button className="icon" title="Acercar" onClick={() => bridge.scene?.zoomBy(1.25)}>＋</button>
          <button className="icon" title="Alejar" onClick={() => bridge.scene?.zoomBy(0.8)}>－</button>
          <button className="icon" title="Vista completa" onClick={() => bridge.scene?.resetView()}>⤢</button>
          <button className="icon" title="Ajustes" onClick={() => open('settings')}>⚙️</button>
        </div>
      </div>

      {hint && !ui.panel && <div className="hint">{hint}</div>}

      {car && !ui.panel && (
        <div className="carcard">
          <div>
            <b>{getModel(car.model).name}</b>
            <small>{job ? (job.done || ui.now >= job.endsAt ? '✅ Trabajo listo' : `${getJob(job.jobId).icon} ${getJob(job.jobId).name} · ${fmtTime(job.endsAt - ui.now)}`) : 'Disponible'}</small>
          </div>
          <div className="row">
            {job && (job.done || ui.now >= job.endsAt)
              ? <button className="btn primary" onClick={() => store.collectJob(car.id)}>💰 Cobrar</button>
              : <button className="btn primary" disabled={!!job} onClick={() => store.openPanel('jobs')}>🔧 Trabajo</button>}
            <button className="btn" onClick={customize}>🎨 Estilo</button>
            <button className="btn ghost" onClick={() => bridge.scene?.focusCar(car.id)}>🔍</button>
          </div>
        </div>
      )}

      <nav className="nav">
        <button className={ui.panel === 'garage' ? 'on' : ''} onClick={() => open('garage')}><span>🚗</span>Garaje</button>
        <button className={ui.panel === 'jobs' ? 'on' : ''} onClick={() => open('jobs')}><span>🔧</span>Trabajos{ready > 0 && <em>{ready}</em>}</button>
        <button className={ui.panel === 'customize' ? 'on' : ''} onClick={customize}><span>🎨</span>Estilo</button>
        <button className={ui.panel === 'shop' ? 'on' : ''} onClick={() => open('shop')}><span>🛒</span>Tienda</button>
      </nav>
    </>
  );
}
