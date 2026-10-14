import { store } from '../core/store';
import { xpForLevel } from '../data/config';
import { getModel } from '../data/vehicles';
import { getItem } from '../data/items';
import { getJob } from '../data/jobs';
import { bridge } from '../engine/bridge';
import { social } from '../core/social';
import { useSocial } from './useSocial';
import { fmt, fmtTime, useGame } from './hooks';

export function Hud() {
  const { save, ui } = useGame();
  const need = xpForLevel(save.level);
  const soc = useSocial();
  const car = save.cars.find((c) => c.id === ui.selectedId);
  const job = car ? save.jobs[car.id] : undefined;
  const readyMine = Object.values(save.jobs).filter((j) => j.done || ui.now >= j.endsAt).length;
  const readyClients = (save.biz?.jobs ?? []).filter((j) => j.state === 'ready' && !j.claimed).length;
  const ready = readyMine + readyClients;
  const open = (p: 'garage' | 'shop' | 'jobs' | 'settings' | 'inventory' | 'expand' | 'friends') => store.openPanel(ui.panel === p ? null : p);

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
        {ready > 0 && <button className="btn primary pulse" onClick={() => { store.collectAll(); (save.biz?.jobs ?? []).filter((j) => j.state === 'ready').forEach((j) => store.claimClient(j.id)); }}>💰 Cobrar ({ready})</button>}
        <div className="cam">
          <button className="icon" title="Acercar" onClick={() => bridge.scene?.zoomBy(1.25)}>＋</button>
          <button className="icon" title="Alejar" onClick={() => bridge.scene?.zoomBy(0.8)}>－</button>
          <button className="icon" title="Vista completa" onClick={() => bridge.scene?.resetView()}>⤢</button>
          <button className="icon fr" title="Amigos" onClick={() => { void social.refresh(); open('friends'); }}>👥{soc.incoming.length > 0 && <em>{soc.incoming.length}</em>}</button>
          <button className="icon" title="Ajustes" onClick={() => open('settings')}>⚙️</button>
        </div>
      </div>

      {ui.visit && (
        <div className="visitbar">
          <div><small>Visitando el garaje de</small><b>{ui.visit.username}</b><small>Nivel {ui.visit.garage.level} · {ui.visit.garage.cars.length} autos</small></div>
          <button className="btn primary" onClick={() => store.leaveVisit()}>↩ Volver al mío</button>
        </div>
      )}

      {hint && !ui.panel && !ui.visit && <div className="hint">{hint}</div>}

      {car && !ui.panel && !ui.visit && (
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

      {ui.visit ? null : ui.edit ? <EditBar /> : (
      <nav className="nav">
        <button className={ui.panel === 'garage' ? 'on' : ''} onClick={() => open('garage')}><span>🚗</span>Garaje</button>
        <button className={ui.panel === 'jobs' ? 'on' : ''} onClick={() => open('jobs')}><span>🔧</span>Trabajos{ready > 0 && <em>{ready}</em>}</button>
        <button className={ui.panel === 'customize' ? 'on' : ''} onClick={customize}><span>🎨</span>Estilo</button>
        <button className={ui.panel === 'shop' ? 'on' : ''} onClick={() => open('shop')}><span>🛒</span>Tienda</button>
        <button className={ui.panel === 'inventory' ? 'on' : ''} onClick={() => open('inventory')}><span>📦</span>Inventario</button>
        <button onClick={() => store.enterEdit()}><span>🛠️</span>Editar</button>
        <button className={ui.panel === 'expand' ? 'on' : ''} onClick={() => open('expand')}><span>🗺️</span>Zonas</button>
      </nav>)}
    </>
  );
}

function EditBar() {
  const { ui } = useGame();
  const e = ui.edit!; const cur = e.draft.find((p) => p.uid === e.sel);
  const def = e.adding ? getItem(e.adding) : cur ? getItem(cur.item) : undefined;
  return (
    <>
      <div className="editinfo">{def ? <><b>{def.name}</b> · {e.adding ? 'toca o arrastra para colocar' : 'arrastra para mover'}</> : 'Toca un accesorio para moverlo, o elige uno del inventario'}</div>
      <nav className="nav editbar">
        <button onClick={() => store.openPanel(ui.panel === 'inventory' ? null : 'inventory')}><span>📦</span>Inventario</button>
        <button disabled={!def} onClick={() => bridge.scene?.editRotate()}><span>⟳</span>Rotar</button>
        <button title="Guardar en el inventario" disabled={!cur} onClick={() => cur && store.editStow(cur.uid)}><span>↩️</span>Quitar</button>
        <button className={e.snap ? 'on' : ''} onClick={() => store.editSnap(!e.snap)}><span>▦</span>Rejilla</button>
        <button onClick={() => store.editCancel()}><span>✖️</span>Cancelar</button>
        <button title="Guardar cambios" className="okbtn" onClick={() => store.editSave()}><span>✔️</span>Guardar</button>
      </nav>
    </>
  );
}
