import { useState } from 'react';
import { exhibitionScore } from '../../core/stats';
import { actions, useGame } from '../../core/store';
import { MEETUP_EVENTS } from '../../data/racing';
import { vehicleById } from '../../data/vehicles';

export function MeetupsScreen() {
  const s = useGame();
  const [msg, setMsg] = useState('');
  const [carFor, setCarFor] = useState<string | null>(null);

  return (
    <>
      <p className="hint">Presenta un auto de tu colección: el jurado evalúa su valor real, sus estadísticas y sus modificaciones. Una vez al día por encuentro.</p>
      <ul className="rows cards">
        {MEETUP_EVENTS.map((ev) => {
          const attendedToday = s.meetupLastAttended[ev.id] === s.dailyKey;
          return (
            <li key={ev.id} className="job-card">
              <div className="job-card-head"><b>{ev.name}</b> <small className="muted">— {ev.location} · {ev.category}</small></div>
              <p className="dialogue">{ev.description}</p>
              <div className="stat-row">
                <span>Bronce {ev.thresholds.bronze}+</span>
                <span>Plata {ev.thresholds.silver}+</span>
                <span>Oro {ev.thresholds.gold}+</span>
              </div>
              {attendedToday ? <em>Ya presentaste un auto hoy</em> : (
                <>
                  <div className="job-card-actions">
                    <button className="btn" onClick={() => setCarFor(carFor === ev.id ? null : ev.id)}>{carFor === ev.id ? 'Cancelar' : 'Presentar un vehículo'}</button>
                  </div>
                  {carFor === ev.id && (
                    <div className="swatches wrap">
                      {s.cars.map((c) => {
                        const v = vehicleById(c.modelId);
                        const score = exhibitionScore(v, c.build);
                        return (
                          <button key={c.uid} className="btn" onClick={() => { setMsg(actions.attendMeetup(ev.id, c.uid)); setCarFor(null); }}>
                            {v.name} · {score}
                          </button>
                        );
                      })}
                    </div>
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
