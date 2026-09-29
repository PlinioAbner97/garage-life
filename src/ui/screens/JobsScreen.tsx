import { useEffect, useState } from 'react';
import { CLIENT_ARCHETYPES, archetypeById, reputationProgress, reputationTierName, REPUTATION_TIERS } from '../../data/clientArchetypes';
import { partById } from '../../data/parts';
import { taskById } from '../../data/taskCatalog';
import { vehicleById } from '../../data/vehicles';
import { fmtMoney } from '../../core/economy';
import { actions, jobProgress, useFocusedJobId, useGame } from '../../core/store';
import type { ActiveJob, JobTask, TaskQuality } from '../../core/types';
import { missionCatalog } from '../../core/store';
import { hex } from '../../data/util';
import { TaskMinigame } from './TaskMinigame';

type Tab = 'clients' | 'active' | 'history' | 'missions' | 'reputation';
const TABS: [Tab, string][] = [['clients', 'Clientes'], ['active', 'Trabajos'], ['history', 'Historial'], ['missions', 'Misiones'], ['reputation', 'Reputación']];

export function JobsScreen() {
  const s = useGame();
  const focusedId = useFocusedJobId();
  const [tab, setTab] = useState<Tab>('clients');
  const [msg, setMsg] = useState('');
  const [minigameTask, setMinigameTask] = useState<string | null>(null);
  const [, forceTick] = useState(0);

  useEffect(() => { actions.checkPeriods(); }, []);
  useEffect(() => {
    const iv = setInterval(() => forceTick((t) => t + 1), 1000);
    return () => clearInterval(iv);
  }, []);

  return (
    <>
      <div className="tabs scroll">
        {TABS.map(([id, label]) => (
          <button key={id} className={'btn' + (tab === id ? ' active' : '')} onClick={() => { setTab(id); setMsg(''); }}>{label}</button>
        ))}
      </div>

      {tab === 'clients' && (
        <>
          <button className="btn primary" onClick={() => setMsg(actions.refreshOffers())}>Buscar clientes</button>
          {!s.offers.length && <p className="hint">No hay clientes esperando. Toca «Buscar clientes».</p>}
          <ul className="rows cards">
            {s.offers.map((o) => {
              const arch = archetypeById(o.archetypeId)!;
              const vehicle = vehicleById(o.vehicleModelId);
              return (
                <li key={o.id} className="job-card">
                  <div className="job-card-head">
                    <b>{o.clientName}</b> <small className="muted">— {arch.label}</small>
                    <span className="sw static" style={{ background: hex(0xffc21a) }} title={`Dificultad ${o.difficulty}`} />
                  </div>
                  <p className="dialogue">“{o.dialogue}”</p>
                  <p className="muted">Vehículo: {vehicle.brand} {vehicle.name}</p>
                  <ul className="task-list">
                    {o.taskCatalogIds.map((id) => <li key={id}>{taskById(id)?.name}</li>)}
                  </ul>
                  <div className="stat-row">
                    <span>Pago {fmtMoney(o.paymentEstimate)}</span>
                    <span>Materiales {fmtMoney(o.materialsCost)}</span>
                    <span>XP {o.xpEstimate}</span>
                    <span>Reputación +{o.reputationReward}</span>
                  </div>
                  <div className="job-card-actions">
                    <button className="btn" onClick={() => actions.rejectOffer(o.id)}>Rechazar</button>
                    <button className="btn primary" disabled={s.money < o.materialsCost} onClick={() => setMsg(actions.acceptOffer(o.id))}>Aceptar trabajo</button>
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}

      {tab === 'active' && (
        <ul className="rows cards">
          {!s.activeJobs.length && <p className="hint">No tienes trabajos activos. Acepta clientes en la pestaña «Clientes».</p>}
          {s.activeJobs.map((job) => (
            <JobCard key={job.id} job={job} focused={focusedId === job.id}
              minigameTask={minigameTask} setMinigameTask={setMinigameTask} setMsg={setMsg} />
          ))}
        </ul>
      )}

      {tab === 'history' && (
        <ul className="rows">
          {!s.jobHistory.length && <p className="hint">Todavía no entregas ningún vehículo.</p>}
          {s.jobHistory.map((h) => (
            <li key={h.id}>
              <span className="grow">
                <b>{h.clientName}</b> <small className="muted">— {vehicleById(h.vehicleModelId).name}</small><br />
                <small className="muted">Satisfacción {h.satisfaction}% · {new Date(h.completedAt).toLocaleDateString()}</small>
              </span>
              <span className="muted">{fmtMoney(h.payment)} · +{h.xp} XP · +{h.reputation} rep.</span>
            </li>
          ))}
        </ul>
      )}

      {tab === 'missions' && <MissionsTab setMsg={setMsg} />}
      {tab === 'reputation' && <ReputationTab />}

      <p className="hint" role="status">{msg}</p>
    </>
  );
}

function JobCard({ job, focused, minigameTask, setMinigameTask, setMsg }: {
  job: ActiveJob; focused: boolean;
  minigameTask: string | null; setMinigameTask: (id: string | null) => void; setMsg: (m: string) => void;
}) {
  const vehicle = vehicleById(job.vehicleModelId);
  const pct = Math.round(jobProgress(job) * 100);
  return (
    <li className="job-card">
      <div className="job-card-head">
        <b>{job.clientName}</b> <small className="muted">— {vehicle.brand} {vehicle.name}</small>
      </div>
      <div className="bar wide"><i style={{ width: `${pct}%` }} /></div>
      <div className="job-card-actions">
        <button className={'btn' + (focused ? ' active' : '')} onClick={() => actions.focusJob(focused ? null : job.id)}>
          {focused ? 'Enfocado en el taller' : 'Llevar al elevador'}
        </button>
        {job.status === 'ready' && <button className="btn primary" onClick={() => setMsg(actions.deliverJob(job.id))}>Entregar vehículo</button>}
      </div>
      <ul className="task-list detailed">
        {job.tasks.map((t) => <TaskRow key={t.id} job={job} task={t} minigameOpen={minigameTask === t.id} setMinigameTask={setMinigameTask} />)}
      </ul>
    </li>
  );
}

function TaskRow({ job, task, minigameOpen, setMinigameTask }: {
  job: ActiveJob; task: JobTask; minigameOpen: boolean; setMinigameTask: (id: string | null) => void;
}) {
  const def = taskById(task.catalogId)!;
  const elapsed = task.startAt ? (Date.now() - task.startAt) / 1000 : 0;
  const readyPct = task.startAt ? Math.min(100, Math.round((elapsed / def.duration) * 100)) : 0;

  const finish = (q: TaskQuality) => { actions.finalizeTask(job.id, task.id, q); setMinigameTask(null); };

  if (task.done) {
    const label = task.quality === 'perfect' ? '★ Perfecto' : task.quality === 'ok' ? 'Completada' : 'Con errores';
    return <li className="done"><span className="grow">{def.name}</span><em>{label}</em></li>;
  }

  return (
    <li className="task-detail">
      <div className="grow">
        <b>{def.name}</b> <small className="muted">({def.duration}s)</small>
        {!task.startAt && <div><small className="muted">{def.description}</small></div>}
      </div>
      {!task.startAt && <button className="btn" onClick={() => actions.startTask(job.id, task.id)}>Iniciar tarea</button>}
      {task.startAt && (
        <div className="task-work">
          <div className="bar"><i style={{ width: `${readyPct}%` }} /></div>
          {def.kind === 'mod' && def.options && (
            <div className="swatches">
              {def.options.map((pid) => {
                const p = partById(pid);
                return (
                  <button key={pid} className={'sw' + (task.chosenPartId === pid ? ' on' : '')}
                    style={p?.color !== undefined ? { background: hex(p.color) } : { background: '#3a4152' }}
                    title={p?.name} aria-label={p?.name}
                    onClick={() => actions.chooseTaskPart(job.id, task.id, pid)} />
                );
              })}
            </div>
          )}
          {minigameOpen ? (
            <TaskMinigame onResult={finish} onSkip={() => finish('ok')} />
          ) : (
            <button className="btn primary" disabled={def.kind === 'mod' && !task.chosenPartId} onClick={() => setMinigameTask(task.id)}>Finalizar tarea</button>
          )}
        </div>
      )}
    </li>
  );
}

function MissionsTab({ setMsg }: { setMsg: (m: string) => void }) {
  const s = useGame();
  const { daily, weekly } = missionCatalog();
  const Row = ({ scope }: { scope: 'daily' | 'weekly' }) => {
    const defs = scope === 'daily' ? daily : weekly;
    const counters = scope === 'daily' ? s.dailyCounters : s.weeklyCounters;
    const claimed = scope === 'daily' ? s.dailyClaimed : s.weeklyClaimed;
    return (
      <ul className="rows">
        {defs.map((m) => {
          const progress = Math.min(counters[m.type] ?? 0, m.target);
          const done = progress >= m.target;
          const isClaimed = claimed.includes(m.id);
          return (
            <li key={m.id}>
              <span className="grow">
                <b>{m.description}</b><br />
                <small className="muted">Progreso {progress}/{m.target} · Recompensa {fmtMoney(m.reward.money)}, +{m.reward.xp} XP, +{m.reward.reputation} rep.</small>
              </span>
              {isClaimed ? <em>Reclamado</em>
                : <button className="btn primary" disabled={!done} onClick={() => setMsg(actions.claimMission(m.id))}>Reclamar</button>}
            </li>
          );
        })}
      </ul>
    );
  };
  return (
    <>
      <h4>Misiones diarias</h4>
      <Row scope="daily" />
      <h4>Misiones semanales</h4>
      <Row scope="weekly" />
    </>
  );
}

function ReputationTab() {
  const s = useGame();
  const { pct, next } = reputationProgress(s.reputation);
  return (
    <>
      <h3>{reputationTierName(s.reputation)}</h3>
      <div className="bar wide"><i style={{ width: `${Math.round(pct * 100)}%` }} /></div>
      <p className="hint">{next ? `${s.reputation} / ${next.min} reputación para "${next.name}"` : `Reputación máxima alcanzada (${s.reputation})`}</p>
      <ul className="rows">
        {REPUTATION_TIERS.map((t) => (
          <li key={t.name}>
            <span className="grow">{t.name}</span>
            {s.reputation >= t.min ? <em>Alcanzado</em> : <span className="muted">Nivel {t.min} rep.</span>}
          </li>
        ))}
      </ul>
      <h4>Tipos de cliente</h4>
      <ul className="rows">
        {CLIENT_ARCHETYPES.map((a) => (
          <li key={a.id}>
            <span className="grow">{a.label}</span>
            <span className="muted">Nivel {a.unlockLevel}{a.minReputationTier > 0 ? ` · ${REPUTATION_TIERS[a.minReputationTier].name}` : ''}</span>
          </li>
        ))}
      </ul>
    </>
  );
}
