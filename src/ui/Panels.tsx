import { useState } from 'react';
import { fmtMoney, WORK_REWARD } from '../core/economy';
import { actions, useGame, type ShopKind } from '../core/store';
import { hex, MODELS, modelById, PAINTS, RIMS, type Swatch } from '../data/catalog';

function Swatches({ items, active, onPick }: { items: Swatch[]; active?: number; onPick: (c: number) => void }) {
  return (
    <div className="swatches">
      {items.map((s) => (
        <button key={s.color} className={'sw' + (s.color === active ? ' on' : '')} style={{ background: hex(s.color) }} title={s.name} aria-label={s.name} onClick={() => onPick(s.color)} />
      ))}
    </div>
  );
}

export function GaragePanel() {
  const s = useGame();
  const car = s.cars.find((c) => c.uid === s.selectedUid);
  if (!car) return <p className="hint">Toca un vehículo en el taller para seleccionarlo y personalizarlo.</p>;
  return (
    <>
      <h3>{modelById(car.modelId).name}</h3>
      <h4>Pintura</h4>
      <Swatches items={PAINTS.filter((p) => s.ownedPaints.includes(p.color))} active={car.paint} onPick={actions.setPaint} />
      <h4>Aros</h4>
      <Swatches items={RIMS.filter((r) => s.ownedRims.includes(r.color))} active={car.rims} onPick={actions.setRims} />
      <p className="hint">Más colores disponibles en la tienda.</p>
      <button className="btn primary" onClick={actions.work}>Reparar el auto (+{fmtMoney(WORK_REWARD.money)}, +{WORK_REWARD.xp} XP)</button>
    </>
  );
}

type Tab = ShopKind;
export function ShopPanel() {
  const s = useGame();
  const [tab, setTab] = useState<Tab>('paint');
  const [msg, setMsg] = useState('');
  const rows: { key: string; name: string; price: number; owned: boolean; color?: number }[] =
    tab === 'car'
      ? MODELS.map((m) => ({ key: m.id, name: m.name, price: m.price, owned: s.cars.some((c) => c.modelId === m.id) }))
      : (tab === 'paint' ? PAINTS : RIMS).map((x) => ({
          key: String(x.color), name: x.name, price: x.price, color: x.color,
          owned: (tab === 'paint' ? s.ownedPaints : s.ownedRims).includes(x.color),
        }));
  const tabs: [Tab, string][] = [['paint', 'Pinturas'], ['rims', 'Aros'], ['car', 'Vehículos']];
  return (
    <>
      <div className="tabs">{tabs.map(([id, l]) => <button key={id} className={'btn' + (tab === id ? ' active' : '')} onClick={() => { setTab(id); setMsg(''); }}>{l}</button>)}</div>
      <ul className="rows">
        {rows.map((r) => (
          <li key={r.key}>
            {r.color !== undefined && <span className="sw static" style={{ background: hex(r.color) }} />}
            <span className="grow">{r.name}</span>
            {r.owned ? <em>Tuyo</em> : <button className="btn primary" disabled={s.money < r.price} onClick={() => setMsg(actions.buy(tab, r.key))}>{fmtMoney(r.price)}</button>}
          </li>
        ))}
      </ul>
      <p className="hint" role="status">{msg}</p>
    </>
  );
}

export function InventoryPanel() {
  const s = useGame();
  return (
    <>
      <h4>Vehículos ({s.cars.length})</h4>
      <ul className="rows">
        {s.cars.map((c) => (
          <li key={c.uid}>
            <span className="grow">{modelById(c.modelId).name}</span>
            <button className={'btn' + (s.selectedUid === c.uid ? ' active' : '')} onClick={() => actions.select(c.uid)}>{s.selectedUid === c.uid ? 'Seleccionado' : 'Seleccionar'}</button>
          </li>
        ))}
      </ul>
      <h4>Pinturas</h4><Swatches items={PAINTS.filter((p) => s.ownedPaints.includes(p.color))} onPick={() => {}} />
      <h4>Aros</h4><Swatches items={RIMS.filter((r) => s.ownedRims.includes(r.color))} onPick={() => {}} />
    </>
  );
}
