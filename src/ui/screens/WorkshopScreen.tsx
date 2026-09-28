import { useState } from 'react';
import { fmtMoney } from '../../core/economy';
import { actions, floorTier, garageCapacity, level, lightingTier, liftCount, useGame } from '../../core/store';
import { upgradesByCategory, type UpgradeCategory } from '../../data/upgrades';

const CATS: { id: UpgradeCategory; label: string; current: () => string }[] = [
  { id: 'lift', label: 'Elevadores', current: () => `${liftCount()} activo(s)` },
  { id: 'lighting', label: 'Iluminación', current: () => ['Estándar', 'LED', 'Neón'][lightingTier()] },
  { id: 'floor', label: 'Piso', current: () => ['Estándar', 'Premium'][floorTier()] },
  { id: 'capacity', label: 'Espacio', current: () => `${garageCapacity()} vehículos` },
];

export function WorkshopScreen() {
  const s = useGame();
  const lv = level();
  const [msg, setMsg] = useState('');
  return (
    <>
      {CATS.map((cat) => (
        <div key={cat.id}>
          <h4>{cat.label} <small className="muted">— actual: {cat.current()}</small></h4>
          <ul className="rows">
            {upgradesByCategory(cat.id).map((u) => {
              const owned = s.ownedUpgradeIds.includes(u.id);
              const locked = lv < u.unlockLevel;
              return (
                <li key={u.id}>
                  <span className="grow"><b>{u.name}</b><br /><small className="muted">{u.description}</small></span>
                  {owned ? <em>Instalado</em>
                    : locked ? <em className="muted">Nivel {u.unlockLevel}</em>
                    : <button className="btn primary" disabled={s.money < u.price} onClick={() => setMsg(actions.buyUpgrade(u.id))}>{fmtMoney(u.price)}</button>}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
      <p className="hint" role="status">{msg}</p>
    </>
  );
}
