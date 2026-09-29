import { CLIENT_ARCHETYPES, pickName, reputationTierIndex } from '../data/clientArchetypes';
import { PARTS } from '../data/parts';
import { TASKS, taskById } from '../data/taskCatalog';
import { VEHICLES } from '../data/vehicles';
import type { ActiveJob, CarBuild, CompletedJob, JobOffer, JobTask, TaskQuality } from './types';

const stockJobBuild = (): CarBuild => ({
  paint: 'paint-white', rims: 'rims-silver', suspension: 'susp-street',
  front: 'front-stock', skirt: 'skirt-stock', spoiler: 'spoiler-stock', hood: 'hood-stock',
  tint: 'tint-none', stripe: 'stripe-none', exhaust: 'exhaust-stock', engine: 'engine-stock',
  facing: 1,
});

let counter = 0;
const uid = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${(counter++).toString(36)}`;

export function generateOffer(playerLevel: number, reputation: number): JobOffer | null {
  const tierIdx = reputationTierIndex(reputation);
  const pool = CLIENT_ARCHETYPES.filter((a) => a.unlockLevel <= playerLevel + 2 && a.minReputationTier <= tierIdx);
  if (!pool.length) return null;
  const archetype = pool[Math.floor(Math.random() * pool.length)];
  const vehicle = VEHICLES[Math.floor(Math.random() * VEHICLES.length)];
  const taskCount = archetype.minTasks + Math.floor(Math.random() * (archetype.maxTasks - archetype.minTasks + 1));
  const matching = TASKS.filter((t) => archetype.taskKinds.includes(t.kind));
  const shuffled = [...(matching.length ? matching : TASKS)].sort(() => Math.random() - 0.5);
  const taskCatalogIds = shuffled.slice(0, Math.max(1, Math.min(taskCount, shuffled.length))).map((t) => t.id);
  const tasks = taskCatalogIds.map((id) => taskById(id)!);
  const paymentEstimate = Math.round(tasks.reduce((s, t) => s + t.basePay, 0) * archetype.payMult);
  const materialsCost = Math.round(tasks.reduce((s, t) => s + t.materialsCost, 0));
  const xpEstimate = tasks.reduce((s, t) => s + t.baseXp, 0);
  const reputationReward = archetype.baseReputation + tasks.length * 4;
  const dialogue = archetype.dialogues[Math.floor(Math.random() * archetype.dialogues.length)];
  const build = stockJobBuild();
  const paintPool = PARTS.filter((p) => p.category === 'paint');
  build.paint = paintPool[Math.floor(Math.random() * paintPool.length)].id;

  return {
    id: uid('offer'), archetypeId: archetype.id, clientName: pickName(archetype), dialogue,
    vehicleModelId: vehicle.id, carBuild: build,
    difficulty: archetype.difficulty, taskCatalogIds,
    paymentEstimate, materialsCost, xpEstimate, reputationReward,
    unlockLevel: archetype.unlockLevel,
  };
}

export function offerToActiveJob(offer: JobOffer): ActiveJob {
  const tasks: JobTask[] = offer.taskCatalogIds.map((catalogId) => ({
    id: uid('task'), catalogId, done: false, startAt: null, quality: 'pending',
  }));
  return {
    id: offer.id, archetypeId: offer.archetypeId, clientName: offer.clientName, dialogue: offer.dialogue,
    vehicleModelId: offer.vehicleModelId, carBuild: offer.carBuild, difficulty: offer.difficulty, tasks,
    paymentEstimate: offer.paymentEstimate, materialsCost: offer.materialsCost, xpEstimate: offer.xpEstimate,
    reputationReward: offer.reputationReward, unlockLevel: offer.unlockLevel,
    acceptedAt: Date.now(), status: 'active',
  };
}

export function jobProgress(job: ActiveJob): number {
  if (!job.tasks.length) return 0;
  return job.tasks.filter((t) => t.done).length / job.tasks.length;
}

const QUALITY_SCORE: Record<TaskQuality, number> = { pending: 0, perfect: 100, ok: 75, miss: 50 };
export function jobSatisfaction(job: ActiveJob): number {
  const done = job.tasks.filter((t) => t.done);
  if (!done.length) return 0;
  return Math.round(done.reduce((s, t) => s + QUALITY_SCORE[t.quality], 0) / done.length);
}

export function finalizeJob(job: ActiveJob): CompletedJob {
  const satisfaction = jobSatisfaction(job);
  const mult = 0.7 + (satisfaction / 100) * 0.5; // 0.7 (todo "miss") .. 1.2 (todo "perfecto")
  return {
    id: job.id, clientName: job.clientName, vehicleModelId: job.vehicleModelId, archetypeId: job.archetypeId,
    payment: Math.round(job.paymentEstimate * mult), xp: Math.round(job.xpEstimate * mult),
    reputation: Math.round(job.reputationReward * (satisfaction / 100)), satisfaction, completedAt: Date.now(),
  };
}
