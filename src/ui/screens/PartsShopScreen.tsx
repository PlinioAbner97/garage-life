import { useState } from 'react';
import { fmtMoney } from '../../core/economy';
import { actions, level, useGame } from '../../core/store';
import { CATEGORY_LABEL, partsByCategory, type PartCategory } from '../../data/parts';
import { hex } from '../../data/util';

const CATS: PartCategory[] = ['engine', 'suspension', 'exhaust', 'rims', 'front', 'skirt', 'spoiler', 'hood', 'paint', 'stripe', 'tint'];

export function PartsShopScreen() {
  const s = useGame();
  const [tab, setTab] = useState<PartCategory>('engine');
  const [msg, setMsg] = useState('');
  const lv = level();
  const items = partsByCategory(tab);
  return (
    <>
      <p className="hint">Las piezas que compres aquí van directo a tu inventario; equípalas luego en el Garaje.</p>
      <div className="tabs scroll">
        {CATS.map((c) => <button key={c} className={'btn' + (tab === c ? ' active' : '')} onClick={() => { setTab(c); setMsg(''); }}>{CATEGORY_LABEL[c]}</button>)}
      </div>
      <ul className="rows">
        {items.map((p) => {
          const owned = s.ownedPartIds.includes(p.id);
          const locked = lv < p.unlockLevel;
          return (
            <li key={p.id}>
              {p.color !== undefined && <span className="sw static" style={{ background: hex(p.color) }} />}
              <span className="grow"><b>{p.name}</b><br /><small className="muted">{p.description}</small></span>
              {owned ? <em>En inventario</em>
                : locked ? <em className="muted">Nivel {p.unlockLevel}</em>
                : <button className="btn primary" disabled={s.money < p.price} onClick={() => setMsg(actions.buyPartToInventory(p.id))}>{fmtMoney(p.price)}</button>}
            </li>
          );
        })}
      </ul>
      <p className="hint" role="status">{msg}</p>
    </>
  );
}
