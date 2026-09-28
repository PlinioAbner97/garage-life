import { useState } from 'react';
import { fmtMoney } from '../../core/economy';
import { actions, garageCapacity, level, useGame } from '../../core/store';
import { hex } from '../../data/util';
import { RARITY_COLOR, RARITY_LABEL, VEHICLES } from '../../data/vehicles';

export function CollectionScreen() {
  const s = useGame();
  const [msg, setMsg] = useState('');
  const lv = level();
  const cap = garageCapacity();
  return (
    <>
      <p className="hint">Espacio del taller: {s.cars.length}/{cap} vehículos.</p>
      <ul className="rows">
        {VEHICLES.map((v) => {
          const owned = s.cars.find((c) => c.modelId === v.id);
          const active = owned?.uid === s.selectedUid;
          const locked = lv < v.unlockLevel;
          return (
            <li key={v.id}>
              <span className="sw static" style={{ background: hex(RARITY_COLOR[v.rarity]) }} title={RARITY_LABEL[v.rarity]} />
              <span className="grow">
                <b>{v.brand} {v.name}</b> <small className="muted">({v.year} · {RARITY_LABEL[v.rarity]})</small><br />
                <small className="muted">Potencia {v.basePower} · Manejo {v.baseHandling}</small>
              </span>
              {active ? <em>En el taller</em>
                : owned ? <button className="btn" onClick={() => actions.switchActiveCar(owned.uid)}>Llevar al taller</button>
                : locked ? <em className="muted">Nivel {v.unlockLevel}</em>
                : <button className="btn primary" disabled={s.money < v.price || s.cars.length >= cap}
                    onClick={() => setMsg(actions.buyVehicle(v.id))}>{fmtMoney(v.price)}</button>}
            </li>
          );
        })}
      </ul>
      <p className="hint" role="status">{msg}</p>
    </>
  );
}
