import { fmtMoney, levelFromXp, xpForLevel } from '../core/economy';
import { actions, useFocusedJobId, useGame } from '../core/store';
import { bus } from '../game/bus';
import type { PanelId } from './App';

export function Hud({ panel, onPanel }: { panel: PanelId; onPanel: (p: PanelId) => void }) {
  const s = useGame();
  const focusedId = useFocusedJobId();
  const focusedJob = s.activeJobs.find((j) => j.id === focusedId);
  const lv = levelFromXp(s.xp), lo = xpForLevel(lv), hi = xpForLevel(lv + 1);
  const nav: [Exclude<PanelId, null>, string][] = [
    ['garage', 'Garaje'], ['jobs', 'Trabajos'], ['collection', 'Colección'], ['inventory', 'Inventario'], ['workshop', 'Taller'],
  ];
  return (
    <>
      <div className="hud-top">
        <div className="chip money">{fmtMoney(s.money)}</div>
        <div className="chip level">
          <b>Nivel {lv}</b>
          <div className="bar"><i style={{ width: `${((s.xp - lo) / (hi - lo)) * 100}%` }} /></div>
          <small>{s.xp - lo}/{hi - lo} XP</small>
        </div>
      </div>
      {focusedJob && (
        <div className="job-banner">
          <span>Trabajando en el auto de {focusedJob.clientName}</span>
          <button className="btn small" onClick={() => actions.focusJob(null)}>Volver a mi auto</button>
        </div>
      )}
      <div className="zoom">
        <button className="btn" onClick={() => bus.emit('zoom-in')} aria-label="Acercar">+</button>
        <button className="btn" onClick={() => bus.emit('zoom-out')} aria-label="Alejar">−</button>
        <button className="btn" onClick={() => bus.emit('recenter')} aria-label="Centrar">⌂</button>
      </div>
      <nav className="hud-nav">
        {nav.map(([id, label]) => (
          <button key={id} className={'btn' + (panel === id ? ' active' : '')} onClick={() => onPanel(panel === id ? null : id)}>{label}</button>
        ))}
      </nav>
    </>
  );
}
