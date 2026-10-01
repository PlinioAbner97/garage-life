import { useState } from 'react';
import { fmtMoney } from '../../core/economy';
import { actions, level, useGame } from '../../core/store';
import { hex } from '../../data/util';
import { DEALER_LABEL, RARITY_COLOR, RARITY_LABEL, vehiclesByDealer, type DealerCategory } from '../../data/vehicles';

export function DealershipScreen({ category }: { category: DealerCategory }) {
  const s = useGame();
  const [msg, setMsg] = useState('');
  const [inspect, setInspect] = useState<string | null>(null);
  const lv = level();
  const list = vehiclesByDealer(category);

  return (
    <>
      <p className="hint">{DEALER_LABEL[category]} · {s.cars.length} vehículo(s) en tu colección</p>
      <ul className="rows cards">
        {list.map((v) => {
          const owned = s.cars.some((c) => c.modelId === v.id);
          const locked = lv < v.unlockLevel;
          const inspecting = inspect === v.id;
          return (
            <li key={v.id} className="job-card">
              <div className="job-card-head">
                <span className="sw static" style={{ background: hex(RARITY_COLOR[v.rarity]) }} />
                <b>{v.brand} {v.name}</b> <small className="muted">({v.year} · {RARITY_LABEL[v.rarity]})</small>
              </div>
              <div className="job-card-actions">
                <button className="btn" onClick={() => setInspect(inspecting ? null : v.id)}>{inspecting ? 'Ocultar detalles' : 'Inspeccionar'}</button>
                {owned ? <em>En tu colección</em>
                  : locked ? <em className="muted">Nivel {v.unlockLevel}</em>
                  : <button className="btn primary" disabled={s.money < v.price} onClick={() => setMsg(actions.buyVehicle(v.id))}>{fmtMoney(v.price)}</button>}
              </div>
              {inspecting && (
                <div className="stat-row">
                  <span>Potencia {v.basePower}</span>
                  <span>Manejo {v.baseHandling}</span>
                  <span>Peso {v.weight}kg</span>
                  <span>Valor estimado {fmtMoney(v.price)}</span>
                  <span>Condición: nuevo de agencia</span>
                </div>
              )}
            </li>
          );
        })}
      </ul>
      <p className="hint" role="status">{msg}</p>
    </>
  );
}
