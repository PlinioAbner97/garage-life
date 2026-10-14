import { auth } from '../core/auth';
import { useAuth } from './useAuth';
import { useEffect, useState, type ReactNode } from 'react';
import { store } from '../core/store';
import { FUTURE_ZONES, SELL_RATIO, SLOT_COUNT, SLOT_UNLOCK_COST, TOTAL_SLOTS, ZONES, getZone } from '../data/config';
import { hasZone, isSlotUnlocked } from '../core/save';
import { VEHICLES, getModel } from '../data/vehicles';
import { JOBS, getJob } from '../data/jobs';
import { PAINTS, RIMS, findPaint, findRim, type ColorPart } from '../data/parts';
import { bridge } from '../engine/bridge';
import { ITEMS, CATEGORIES, FLOOR_FINISHES, WALL_FINISHES, getItem, type ItemDef, type ItemCategory } from '../data/items';
import { itemUrl } from '../data/itemAssets';
import { social, USERNAME_RE } from '../core/social';
import { useSocial } from './useSocial';
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
    case 'inventory': return <Sheet title="Inventario" onClose={close}><InventoryPanel /></Sheet>;
    case 'expand': return <Sheet title="Expansiones del terreno" onClose={close}><ExpandPanel /></Sheet>;
    case 'friends': return <Sheet title="Amigos" onClose={close}><FriendsPanel /></Sheet>;
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
      <p className="muted">{save.cars.length} / {Array.from({ length: TOTAL_SLOTS }, (_, i) => i).filter((i) => isSlotUnlocked(save, i)).length} plazas ocupadas. Selecciona un auto y toca una plaza libre del garaje para moverlo.</p>
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
  const [tab, setTab] = useState<'items' | 'cars'>('items');
  return (
    <>
      <div className="tabs">
        <button className={tab === 'items' ? 'on' : ''} onClick={() => setTab('items')}>🧰 Accesorios</button>
        <button className={tab === 'cars' ? 'on' : ''} onClick={() => setTab('cars')}>🚗 Autos y taller</button>
      </div>
      {tab === 'items' ? <ItemShop /> : <CarShop />}
    </>
  );
}

function ItemThumb({ id, size = 64 }: { id: string; size?: number }) {
  const u = itemUrl(id, 0);
  return u ? <img className="thumb" src={u} width={size} height={size} alt="" loading="lazy" /> : <div className="thumb ph" style={{ width: size, height: size }}>📦</div>;
}

function ItemShop() {
  const { save } = useGame();
  const [cat, setCat] = useState<ItemCategory | 'all'>('all');
  const list = ITEMS.filter((i) => cat === 'all' || i.category === cat);
  return (
    <>
      <div className="chips">
        <button className={cat === 'all' ? 'on' : ''} onClick={() => setCat('all')}>Todo</button>
        {CATEGORIES.map((c) => <button key={c.id} className={cat === c.id ? 'on' : ''} onClick={() => setCat(c.id)}>{c.icon} {c.name}</button>)}
      </div>
      <div className="list">
        {list.map((it) => {
          const n = save.inventory?.[it.id] ?? 0;
          return (
            <div key={it.id} className="card">
              <ItemThumb id={it.id} />
              <div className="grow">
                <b>{it.name}</b><small>{it.desc}</small>
                <small>{CATEGORIES.find((c) => c.id === it.category)?.name}{it.kind === 'wall' ? ' · va en la pared' : ''}{it.prototype ? ' · decorativo' : ''}{n ? ` · Tienes ${n}` : ''}</small>
              </div>
              <div className="col"><button className="btn primary" disabled={save.money < it.price} onClick={() => store.buyItem(it.id)}>${fmt(it.price)}</button></div>
            </div>
          );
        })}
      </div>
      <p className="muted">Lo comprado va a tu <b>📦 Inventario</b>; colócalo con <b>🛠️ Editar garaje</b>. Moverlo o guardarlo no vuelve a cobrar.</p>
    </>
  );
}

function InventoryPanel() {
  const { save, ui } = useGame();
  const [tab, setTab] = useState<'items' | 'finish'>('items');
  const owned = ITEMS.filter((i) => (save.inventory?.[i.id] ?? 0) > 0);
  const placedOf = (id: string) => (ui.edit?.draft ?? save.placed ?? []).filter((p) => p.item === id).length;
  return (
    <>
      <div className="tabs">
        <button className={tab === 'items' ? 'on' : ''} onClick={() => setTab('items')}>📦 Accesorios</button>
        <button className={tab === 'finish' ? 'on' : ''} onClick={() => setTab('finish')}>🎨 Acabados</button>
      </div>
      {tab === 'items' ? (
        <>
          {owned.length === 0 && <p className="muted">Aún no tienes accesorios. Compra algunos en la 🛒 Tienda.</p>}
          <div className="list">
            {owned.map((it) => {
              const qty = save.inventory![it.id], pl = placedOf(it.id), free = qty - pl;
              return (
                <div key={it.id} className="card">
                  <ItemThumb id={it.id} />
                  <div className="grow"><b>{it.name}</b><small>Tienes {qty} · colocados {pl} · libres {free}</small></div>
                  <div className="col"><button className="btn primary" disabled={free <= 0} onClick={() => store.editAdd(it.id)}>Colocar</button></div>
                </div>
              );
            })}
          </div>
          {owned.length > 0 && <button className="btn" style={{ marginTop: 10 }} onClick={() => store.enterEdit()}>🛠️ Editar garaje</button>}
        </>
      ) : <FinishPicker />}
    </>
  );
}

function FinishPicker() {
  const { save } = useGame();
  const row = (kind: 'floor' | 'wall', title: string, list: typeof FLOOR_FINISHES) => (
    <>
      <h3>{title}</h3>
      <div className="swatches">
        {list.map((f) => {
          const active = (save.style?.[kind] ?? 'stock') === f.id, has = store.hasFinish(kind, f.id), lock = save.level < f.minLevel && !has;
          return (
            <button key={f.id} className={`sw ${active ? 'on' : ''}`} disabled={lock} onClick={() => store.setFinish(kind, f.id)}>
              <i style={{ background: '#' + f.hex.toString(16).padStart(6, '0') }} />
              <b>{f.name}</b><small>{active ? 'En uso' : has ? 'Tuyo' : lock ? `🔒 Nivel ${f.minLevel}` : `$${fmt(f.price)}`}</small>
            </button>
          );
        })}
      </div>
    </>
  );
  return <>{row('floor', 'Suelo', FLOOR_FINISHES)}{row('wall', 'Paredes', WALL_FINISHES)}<p className="muted">Los acabados se pueden cambiar gratis una vez comprados.</p></>;
}

function ExpandPanel() {
  const { save } = useGame();
  return (
    <>
      <p className="muted">Cada zona se une al garaje: más plazas de auto y espacio para equipamiento y decoración. Se desbloquean por nivel y GarageCoins.</p>
      <div className="list">
        {ZONES.map((z) => {
          const owned = hasZone(save, z.id);
          const lvl = save.level < z.minLevel;
          const pre = !!z.requires && !hasZone(save, z.requires);
          const reason = owned ? '' : lvl ? `🔒 Nivel ${z.minLevel}` : pre ? '🔒 Zona previa' : '';
          return (
            <div key={z.id} className={`card ${owned || reason ? 'locked' : ''}`}>
              <div className="grow">
                <b>{z.name}</b><small>{z.desc}</small>
                {!owned && <small>{`Requiere nivel ${z.minLevel}${z.requires ? ` · antes: ${getZone(z.requires).name}` : ''}`}</small>}
              </div>
              <div className="col">
                <button className="btn primary" disabled={owned || !!reason} onClick={() => store.buyZone(z.id)}>
                  {owned ? '✔ Tuya' : reason || `$${fmt(z.cost)}`}
                </button>
              </div>
            </div>
          );
        })}
        {FUTURE_ZONES.map((f) => (
          <div key={f.id} className="card locked"><div className="grow"><b>{f.name}</b><small>Detrás de los muros del garaje original.</small></div><div className="col"><button className="btn" disabled>Próximamente</button></div></div>
        ))}
      </div>

    </>
  );
}

function CarShop() {
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

function FriendsPanel() {
  const a = useAuth(); const so = useSocial(); const { save } = useGame();
  const [name, setName] = useState(''); const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  if (!a.email) return <p className="muted">Para tener nombre de usuario, añadir amigos y visitar sus garajes necesitas una <b>cuenta</b>. Vuelve al menú desde ⚙️ y crea una cuenta con tu correo: tu garaje actual se conserva.</p>;
  if (!so.loaded) return <p className="muted">Cargando…</p>;
  if (!so.me) {
    const ok = USERNAME_RE.test(name.trim());
    return (
      <form className="authform" onSubmit={async (e) => { e.preventDefault(); if (await social.setUsername(name, save.level)) social.publish(store.getSnapshot().save); }}>
        <p className="muted">Elige tu <b>nombre de usuario</b>. Tus amigos te encontrarán con él y podrán visitar tu garaje.</p>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. Plinio_97" maxLength={16} autoCapitalize="off" autoCorrect="off" spellCheck={false} aria-label="Nombre de usuario" />
        <small className="muted">3 a 16 caracteres: letras, números o _</small>
        {so.error && <div className="autherr">{so.error}</div>}
        <button className="btn primary" disabled={!ok || so.busy}>{so.busy ? 'Guardando…' : 'Guardar nombre'}</button>
      </form>
    );
  }
  const go = async (userId: string, username: string) => { setBusy(true); await store.visit(userId, username); setBusy(false); };
  return (
    <>
      <p className="muted">Eres <b>@{so.me.username}</b> · nivel {save.level}</p>
      <form className="row" style={{ gap: 8 }} onSubmit={async (e) => { e.preventDefault(); setMsg(await social.addFriend(name)); setName(''); }}>
        <input className="grow" style={{ font: 'inherit', fontSize: 16, padding: '10px 12px', borderRadius: 12, border: '1px solid var(--line)', background: 'var(--panel2)', color: 'var(--text)' }} value={name} onChange={(e) => setName(e.target.value)} placeholder="Añadir amigo por nombre de usuario" autoCapitalize="off" autoCorrect="off" spellCheck={false} aria-label="Usuario del amigo" />
        <button className="btn primary" disabled={!name.trim()}>Añadir</button>
      </form>
      {(msg || so.error) && <p className="muted">{so.error ?? msg}</p>}
      {so.incoming.length > 0 && (<>
        <h3>Solicitudes</h3>
        <div className="list">{so.incoming.map((r) => (
          <div key={r.friendshipId} className="card"><div className="grow"><b>@{r.profile.username}</b><small>Nivel {r.profile.level} quiere ser tu amigo</small></div>
            <div className="col"><button className="btn primary" onClick={() => void social.respond(r.friendshipId, true)}>Aceptar</button><button className="btn ghost" onClick={() => void social.respond(r.friendshipId, false)}>Rechazar</button></div></div>
        ))}</div>
      </>)}
      <h3>Mis amigos ({so.friends.length})</h3>
      {so.friends.length === 0 && <p className="muted">Aún no tienes amigos. Escribe arriba el nombre de usuario de alguien para invitarlo.</p>}
      <div className="list">{so.friends.map((f) => (
        <div key={f.friendshipId} className="card"><div className="grow"><b>@{f.profile.username}</b><small>Nivel {f.profile.level}</small></div>
          <div className="col"><button className="btn primary" disabled={busy} onClick={() => void go(f.profile.id, f.profile.username)}>🏠 Visitar</button>
            <button className="btn ghost danger" onClick={() => { if (confirm(`¿Quitar a @${f.profile.username} de tus amigos?`)) void social.remove(f.friendshipId); }}>Quitar</button></div></div>
      ))}</div>
      {so.outgoing.length > 0 && (<>
        <h3>Enviadas</h3>
        <div className="list">{so.outgoing.map((r) => (
          <div key={r.friendshipId} className="card"><div className="grow"><b>@{r.profile.username}</b><small>Esperando respuesta</small></div>
            <div className="col"><button className="btn ghost" onClick={() => void social.remove(r.friendshipId)}>Cancelar</button></div></div>
        ))}</div>
      </>)}
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
