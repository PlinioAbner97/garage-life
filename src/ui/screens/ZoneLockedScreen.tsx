import { useState } from 'react';
import { fmtMoney } from '../../core/economy';
import { actions, level, useGame } from '../../core/store';
import { zoneById } from '../../data/zones';

export function ZoneLockedScreen({ zoneId }: { zoneId: string }) {
  const s = useGame();
  const [msg, setMsg] = useState('');
  const zone = zoneById(zoneId);
  if (!zone) return <p className="hint">Zona no encontrada.</p>;
  const lv = level();
  const req = zone.unlock;
  const reqs: string[] = [];
  if (req.level) reqs.push(`Nivel ${req.level} (tienes ${lv})`);
  if (req.reputation) reqs.push(`${req.reputation} de reputación (tienes ${s.reputation})`);
  if (req.money) reqs.push(`Pago único de apertura: ${fmtMoney(req.money)}`);
  const meetsAll = (!req.level || lv >= req.level) && (!req.reputation || s.reputation >= req.reputation) && (!req.money || s.money >= req.money);

  return (
    <>
      <h3>🔒 {zone.name}</h3>
      <p className="dialogue">{zone.description}</p>
      <h4>Requisitos para desbloquear</h4>
      <ul className="task-list">{reqs.map((r) => <li key={r}>{r}</li>)}</ul>
      <button className="btn primary" disabled={!meetsAll} onClick={() => setMsg(actions.unlockZone(zone.id))}>Desbloquear zona</button>
      <p className="hint" role="status">{msg}</p>
    </>
  );
}
