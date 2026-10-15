import { useEffect, useRef, useState } from 'react';
import { store } from '../core/store';
import { social } from '../core/social';
import { useSocial } from './useSocial';
import { useGame, fmt, fmtTime } from './hooks';
import { getModel } from '../data/vehicles';
import { bridge } from '../engine/bridge';
import { DragView } from './dragView';
import { FRIEND_MIN_LEVEL, LOSS_XP_RATIO, RACE_TIERS, aiOpp, bestCar, friendOpp, perf, winChance, type RaceOpp, type RaceResult, type RaceState } from '../data/races';

const BOOT_AT = Date.now();
/** Overlay de carrera: arrancón interactivo (live), o pantalla de resultado / carrera interrumpida si se recargó la página. */
export function RaceOverlay() {
  const { save } = useGame();
  const r = save.race;
  const seen = useRef<{ id: number; live: boolean } | null>(null);
  if (r && seen.current?.id !== r.id) seen.current = { id: r.id, live: r.startedAt >= BOOT_AT };
  if (!r) return null;
  if (r.result) return <ResultView r={r} res={r.result} />;
  if (!seen.current?.live) return (
    <div className="raceov center"><div className="raceres"><h2>Carrera interrumpida</h2><p>Cerraste o recargaste el juego durante la carrera. Se cuenta como abandonada.</p>
      <button className="btn primary" onClick={() => { store.finishRace(r.id, { myT: 99, oppT: 0, win: false, reaction: 0, perfects: 0, forfeit: true }); store.claimRace(); }}>Continuar</button></div></div>
  );
  return <LiveRace key={r.id} r={r} />;
}

function ResultView({ r, res }: { r: RaceState; res: RaceResult }) {
  return (
    <div className="raceov center"><div className="raceres">
      <h2>{res.forfeit ? 'Carrera abandonada' : res.win ? '🏆 ¡Ganaste!' : 'Perdiste'}</h2>
      {!res.forfeit && <><p>Tú <b>{res.myT.toFixed(2)} s</b> · {r.opp.name} <b>{res.oppT.toFixed(2)} s</b></p>
        <p className="muted">Reacción {res.reaction.toFixed(2)} s · {res.perfects} cambios perfectos</p></>}
      <button className="btn primary" onClick={() => store.claimRace()}>{res.win ? `Cobrar $${fmt(r.opp.prize)} · +${r.opp.xp} XP` : `Continuar${res.forfeit ? '' : ` · +${Math.round(r.opp.xp * LOSS_XP_RATIO)} XP`}`}</button>
    </div></div>
  );
}

function LiveRace({ r }: { r: RaceState }) {
  const cv = useRef<HTMLCanvasElement>(null);
  const view = useRef<DragView | null>(null);
  const [phase, setPhase] = useState<'stage' | 'go' | 'run' | 'done'>('stage');
  const [, force] = useState(0);
  useEffect(() => {
    const canvas = cv.current!;
    const v = new DragView(canvas, { model: r.model, paint: r.paint, rim: r.rim }, r.opp, {
      carImg: (c) => bridge.scene?.carImage(c.model, c.paint, c.rim) || undefined,
      onFinish: (res) => { store.finishRace(r.id, res); },
      onPhase: (p) => setPhase(p),
    });
    view.current = v;
    const rs = () => v.resize(); window.addEventListener('resize', rs);
    const key = (e: KeyboardEvent) => { if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); v.action(); force((n) => n + 1); } else if (e.code === 'KeyN') { v.useNitro(); force((n) => n + 1); } };
    window.addEventListener('keydown', key);
    return () => { v.destroy(); window.removeEventListener('resize', rs); window.removeEventListener('keydown', key); view.current = null; };
  }, [r.id]);
  const v = view.current;
  return (
    <div className="raceov live" onPointerDown={(e) => { if ((e.target as HTMLElement).closest('.rnitro')) return; view.current?.action(); force((n) => n + 1); }}>
      <canvas ref={cv} className="racecv" />
      <div className="racectl">
        <button className="rnitro" disabled={!v?.nitroReady} onPointerDown={(e) => { e.stopPropagation(); view.current?.useNitro(); force((n) => n + 1); }}>🔥<small>NITRO</small></button>
        <button className="rshift">{phase === 'stage' || phase === 'go' ? 'GO' : 'CAMBIO'}<small>toca · espacio</small></button>
      </div>
    </div>
  );
}

export function RacesPanel() {
  const { save } = useGame();
  const soc = useSocial();
  const idle = save.cars.filter((c) => !save.jobs[c.id]);
  const [carId, setCarId] = useState(idle[0]?.id ?? '');
  const car = idle.find((c) => c.id === carId) ?? idle[0];
  const [busy, setBusy] = useState(false);
  const cd = car ? store.raceCooldown(car.id) : 0;
  const go = (o: RaceOpp) => { if (car && store.startRace(car.id, o)) store.openPanel(null); };
  const duel = async (userId: string, username: string) => {
    setBusy(true); const g = await social.fetchGarage(userId); setBusy(false);
    const c = g && bestCar(g.cars);
    if (!c) { store.toast('Ese amigo no tiene autos disponibles', 'bad'); return; }
    go(friendOpp(username, c));
  };
  if (!car) return <p className="muted">Necesitas un auto libre para correr.</p>;
  return (
    <>
      <label className="field">Tu auto
        <select value={car.id} onChange={(e) => setCarId(e.target.value)}>
          {idle.map((c) => <option key={c.id} value={c.id}>{getModel(c.model).name} · rendimiento {Math.round(perf(c.model))}</option>)}
        </select>
      </label>
      {cd > 0 && <p className="muted">😮‍💨 Este auto descansa {fmtTime(cd)} antes de volver a correr.</p>}
      <h3>Contra la IA</h3>
      <div className="list">
        {RACE_TIERS.map((t) => {
          const o = aiOpp(t), locked = save.level < t.minLevel, p = Math.round(winChance(car.model, o) * 100);
          return (
            <div key={t.id} className={`card ${locked ? 'locked' : ''}`}>
              <div className="grow"><b>{t.icon} {t.name}</b>
                <small>{o.name} · {getModel(o.model).name}</small>
                <small>Inscripción ${fmt(o.fee)} · Premio ${fmt(o.prize)} · +{o.xp} XP · Probabilidad ~{p}%</small></div>
              <div className="col"><button className="btn primary" disabled={locked || cd > 0 || save.money < o.fee} onClick={() => go(o)}>{locked ? `🔒 Nivel ${t.minLevel}` : 'Correr'}</button></div>
            </div>
          );
        })}
      </div>
      <h3>Duelo con amigos</h3>
      {save.level < FRIEND_MIN_LEVEL ? <p className="muted">Desde el nivel {FRIEND_MIN_LEVEL}.</p>
        : soc.friends.length === 0 ? <p className="muted">Añade amigos en 👥 para retar a su mejor auto. Corres contra su auto, aunque no esté conectado.</p>
        : <div className="list">{soc.friends.map((f) => (
          <div key={f.friendshipId} className="card"><div className="grow"><b>👤 {f.profile.username}</b><small>Corres contra su mejor auto · el premio depende de su rendimiento</small></div>
            <div className="col"><button className="btn primary" disabled={busy || cd > 0} onClick={() => duel(f.profile.id, f.profile.username)}>Retar</button></div></div>))}</div>}
    </>
  );
}
