import { useState } from 'react';
import { fmtMoney } from '../../core/economy';
import { carStats, carValue, modLevel } from '../../core/stats';
import { actions, activeCar, level, useGame, usePreview } from '../../core/store';
import { CATEGORY_LABEL, partsByCategory, type PartCategory } from '../../data/parts';
import { hex } from '../../data/util';
import { vehicleById } from '../../data/vehicles';

const TABS: PartCategory[] = ['paint', 'rims', 'suspension', 'front', 'skirt', 'spoiler', 'hood', 'tint', 'stripe', 'exhaust', 'engine'];

export function CustomizeScreen() {
  const s = useGame();
  usePreview();
  const car = activeCar();
  const m = vehicleById(car.modelId);
  const [tab, setTab] = useState<PartCategory>('paint');
  const [msg, setMsg] = useState('');
  const [custom, setCustom] = useState('#d7263d');
  const lv = level();
  const stats = carStats(m, car.build);
  const value = carValue(m, car.build);
  const mods = modLevel(car.build);
  const items = partsByCategory(tab);

  const handleWork = () => { actions.work(); setMsg(`Reparación completada (+${fmtMoney(60)}, +15 XP)`); };

  return (
    <>
      <h3>{m.brand} {m.name} <small className="muted">({m.year})</small></h3>
      <div className="stat-row">
        <span>Potencia {stats.power}</span><span>Manejo {stats.handling}</span><span>Peso {stats.weight}kg</span>
      </div>
      <div className="stat-row">
        <span>Valor {fmtMoney(value)}</span><span>Mods {mods.count}/{mods.total}</span>
        <button className="btn small" onClick={actions.toggleFacing}>Girar vista</button>
      </div>

      <div className="tabs scroll">
        {TABS.map((t) => (
          <button key={t} className={'btn' + (tab === t ? ' active' : '')} onClick={() => { setTab(t); setMsg(''); }}>{CATEGORY_LABEL[t]}</button>
        ))}
      </div>

      {tab === 'paint' && (
        <div className="custom-paint">
          <input type="color" value={custom} onChange={(e) => setCustom(e.target.value)} aria-label="Color personalizado" />
          <button className="btn primary" onClick={() => actions.setCustomPaint(parseInt(custom.slice(1), 16))}>Aplicar color personalizado</button>
        </div>
      )}

      <ul className="rows">
        {items.map((p) => {
          const isOwned = s.ownedPartIds.includes(p.id);
          const equipped = (car.build as unknown as Record<string, string>)[tab] === p.id;
          const locked = lv < p.unlockLevel;
          return (
            <li key={p.id} onMouseEnter={() => actions.setPreview(tab, p.id)} onMouseLeave={() => actions.setPreview(tab, null)}>
              {p.color !== undefined && <span className="sw static" style={{ background: hex(p.color) }} />}
              <span className="grow"><b>{p.name}</b><br /><small className="muted">{p.description}</small></span>
              {equipped ? <em>Instalado</em>
                : isOwned ? <button className="btn" onClick={() => setMsg(actions.equipPart(tab, p.id))}>Equipar</button>
                : locked ? <em className="muted">Nivel {p.unlockLevel}</em>
                : <button className="btn primary" disabled={s.money < p.price} onClick={() => setMsg(actions.buyPart(p.id))}>{fmtMoney(p.price)}</button>}
            </li>
          );
        })}
      </ul>
      <p className="hint" role="status">{msg}</p>
      <button className="btn primary" onClick={handleWork}>Reparar el auto (+{fmtMoney(60)}, +15 XP)</button>
    </>
  );
}
