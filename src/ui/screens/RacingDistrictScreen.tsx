import { useState } from 'react';
import { fmtMoney } from '../../core/economy';
import { actions, level, useGame } from '../../core/store';
import { RACE_EVENTS } from '../../data/racing';
import { vehicleById } from '../../data/vehicles';

export function RacingDistrictScreen() {
  const s = useGame();
  const lv = level();
  const [msg, setMsg] = useState('');
  const [carFor, setCarFor] = useState<string | null>(null);

  return (
    <>
      <p className="hint">Navegación e inscripciones reales. La simulación de carrera todavía está en desarrollo — tu inscripción queda guardada para cuando esté lista.</p>
      <ul className="rows cards">
        {RACE_EVENTS.map((ev) => {
          const locked = lv < ev.unlockLevel;
          const myRegs = s.raceRegistrations.filter((r) => r.eventId === ev.id);
          return (
            <li key={ev.id} className="job-card">
              <div className="job-card-head"><b>{ev.name}</b> <small className="muted">— {ev.location}</small></div>
              <p className="dialogue">{ev.description}</p>
              <div className="stat-row"><span>Inscripción {fmtMoney(ev.entryFee)}</span><span>Nivel requerido {ev.unlockLevel}</span></div>
              {locked ? <em className="muted">Requiere nivel {ev.unlockLevel}</em> : (
                <>
                  <div className="job-card-actions">
                    <button className="btn" onClick={() => setCarFor(carFor === ev.id ? null : ev.id)}>{carFor === ev.id ? 'Cancelar' : 'Inscribir un vehículo'}</button>
                  </div>
                  {carFor === ev.id && (
                    <div className="swatches wrap">
                      {s.cars.map((c) => (
                        <button key={c.uid} className="btn" disabled={s.money < ev.entryFee}
                          onClick={() => { setMsg(actions.registerRace(ev.id, c.uid)); setCarFor(null); }}>
                          {vehicleById(c.modelId).name}
                        </button>
                      ))}
                    </div>
                  )}
                  {!!myRegs.length && (
                    <ul className="task-list">
                      {myRegs.map((r) => (
                        <li key={r.id}>
                          Inscrito: {vehicleById(s.cars.find((c) => c.uid === r.carUid)?.modelId ?? '').name}
                          {' '}<button className="btn small" onClick={() => actions.cancelRaceRegistration(r.id)}>Cancelar</button>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}
            </li>
          );
        })}
      </ul>
      <p className="hint" role="status">{msg}</p>
    </>
  );
}
