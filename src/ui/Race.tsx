import { useEffect, useState } from 'react';
import { store } from '../core/store';
import { social } from '../core/social';
import { useSocial } from './useSocial';
import { useGame, fmt, fmtTime } from './hooks';
import { getModel } from '../data/vehicles';
import { bridge } from '../engine/bridge';
import { FRIEND_MIN_LEVEL, RACE_COUNTDOWN_MS, RACE_TIERS, aiOpp, bestCar, friendOpp, perf, raceEndsAt, winChance, type RaceOpp, type RaceState } from '../data/races';

const AX = { x: -0.86, y: 0.51 };   // eje de la pista en pantalla (hacia -Y de Blender)
const LN = { x: 0.94, y: 0.34 };    // eje de los carriles (hacia +X)

/** Animación de la carrera: se calcula del reloj (startedAt), así sobrevive a recargas. */
export function RaceOverlay() {
  const { save } = useGame();
  const r = save.race;
  const [now, setNow] = useState(Date.now());
  useEffect(() => { if (!r) return; const t = window.setInterval(() => setNow(Date.now()), 50); return () => window.clearInterval(t); }, [r?.id]);
  if (!r) return null;
  return <RaceView r={r} now={now} />;
}

function RaceView({ r, now }: { r: RaceState; now: number }) {
  const t0 = r.startedAt + RACE_COUNTDOWN_MS, t = (now - t0) / 1000;
  const frac = (T: number) => { const u = Math.min(1, Math.max(0, t / T)); return u * (1.15 - 0.15 * u); };
  const done = now >= raceEndsAt(r);
  const L = Math.min(window.innerWidth * 0.78, 760), W = 170;
  const S = { x: -AX.x * L * 0.5, y: -AX.y * L * 0.5 }, E = { x: AX.x * L * 0.5, y: AX.y * L * 0.5 };
  const at = (f: number, lane: number) => ({ x: S.x + (E.x - S.x) * f + LN.x * lane, y: S.y + (E.y - S.y) * f + LN.y * lane });
  const me = at(frac(r.myT), 38), op = at(frac(r.oppT), -38);
  const cd = Math.ceil((t0 - now) / 1000);
  const img = (m: string, p: string, rm: string) => bridge.scene?.carImage(m, p, rm) || undefined;
  const carStyle = (p: { x: number; y: number }, front: boolean) => ({ left: `calc(50% + ${p.x}px)`, top: `calc(50% + ${p.y}px)`, zIndex: front ? 3 : 2 });
  const myDone = t >= r.myT, opDone = t >= r.oppT;
  return (
    <div className="raceov">
      <div className="racehead"><b>🏁 Tú</b> <span>vs</span> <b>{r.opp.name}</b></div>
      <div className="racetrack">
        <div className="road" style={{ width: L, height: W, marginLeft: -L / 2, marginTop: -W / 2, transform: `matrix(${AX.x},${AX.y},${LN.x},${LN.y},0,0)` }} />
        <div className="finish" style={{ left: `calc(50% + ${E.x}px)`, top: `calc(50% + ${E.y}px)`, width: W, marginLeft: -W / 2, marginTop: -9, transform: `matrix(${LN.x},${LN.y},${AX.x},${AX.y},0,0)` }} />
        <img className="rcar" alt="" src={img(r.opp.model, r.opp.paint, r.opp.rim)} style={carStyle(op, op.y > me.y)} />
        <img className="rcar" alt="" src={img(r.model, r.paint, r.rim)} style={carStyle(me, me.y >= op.y)} />
        {cd > 0 && <div className="racecd">{cd}</div>}
        {cd <= 0 && t < 0.8 && <div className="racecd go">¡YA!</div>}
      </div>
      <div className="racefoot">
        {!done && cd <= 0 && <p className="muted">{myDone ? 'Cruzaste la meta…' : opDone ? 'Te ganaron en la meta…' : 'Corriendo…'}</p>}
        {!done && cd > 0 && <p className="muted">Prepárate · {getModel(r.model).name} vs {getModel(r.opp.model).name}</p>}
        {done && (
          <div className="raceres">
            <h2>{r.win ? '🏆 ¡Ganaste!' : 'Perdiste'}</h2>
            <p>Tu tiempo {r.myT.toFixed(2)} s · rival {r.oppT.toFixed(2)} s</p>
            <button className="btn primary" onClick={() => store.claimRace()}>{r.win ? `Cobrar $${fmt(r.opp.prize)} · +${r.opp.xp} XP` : `Continuar · +${Math.round(r.opp.xp * 0.25)} XP`}</button>
          </div>
        )}
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
