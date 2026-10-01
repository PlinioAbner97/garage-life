import { useState } from 'react';
import { fmtMoney } from '../../core/economy';
import { actions, useGame } from '../../core/store';
import { CONDITION_LABEL } from '../../data/usedMarket';
import { vehicleById } from '../../data/vehicles';

export function UsedMarketScreen() {
  const s = useGame();
  const [msg, setMsg] = useState('');
  const [inspect, setInspect] = useState<string | null>(null);
  return (
    <>
      <p className="hint">Inventario rotativo — cambia cada semana. Lo que ya compraste se queda en tu colección.</p>
      <ul className="rows cards">
        {s.usedMarketListings.map((l) => {
          const v = vehicleById(l.modelId);
          const bought = s.usedMarketPurchasedIds.includes(l.id);
          const alreadyOwnsModel = s.cars.some((c) => c.modelId === l.modelId);
          const inspecting = inspect === l.id;
          return (
            <li key={l.id} className="job-card">
              <div className="job-card-head">
                <b>{v.brand} {v.name}</b> <small className="muted">({v.year})</small>
                <span className={'badge cond-' + l.condition}>{CONDITION_LABEL[l.condition as keyof typeof CONDITION_LABEL]}</span>
              </div>
              <div className="job-card-actions">
                <button className="btn" onClick={() => setInspect(inspecting ? null : l.id)}>{inspecting ? 'Ocultar detalles' : 'Inspeccionar'}</button>
                {bought ? <em>Comprado</em>
                  : alreadyOwnsModel ? <em className="muted">Ya tienes este modelo</em>
                  : <button className="btn primary" disabled={s.money < l.price} onClick={() => setMsg(actions.buyUsedListing(l.id))}>{fmtMoney(l.price)}</button>}
              </div>
              {inspecting && (
                <div className="stat-row">
                  <span>Potencia {v.basePower}</span>
                  <span>Manejo {v.baseHandling}</span>
                  <span>Precio original {fmtMoney(v.price)}</span>
                  <span>Precio usado {fmtMoney(l.price)}</span>
                  {l.condition === 'needs_repair' && <span>Puede requerir reparaciones en el taller</span>}
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
