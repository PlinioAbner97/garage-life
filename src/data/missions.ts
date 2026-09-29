import type { CounterType } from '../core/types';
export interface MissionDef {
  id: string; scope: 'daily' | 'weekly'; type: CounterType; target: number;
  reward: { money: number; xp: number; reputation: number }; description: string;
}
export const DAILY_MISSIONS: MissionDef[] = [
  { id: 'd-repairs', scope: 'daily', type: 'repairs_completed', target: 2, reward: { money: 150, xp: 20, reputation: 5 }, description: 'Completa 2 reparaciones' },
  { id: 'd-mods', scope: 'daily', type: 'mods_installed', target: 3, reward: { money: 200, xp: 25, reputation: 8 }, description: 'Instala 3 modificaciones' },
  { id: 'd-money', scope: 'daily', type: 'money_earned', target: 400, reward: { money: 100, xp: 15, reputation: 5 }, description: 'Gana $400 trabajando' },
  { id: 'd-client', scope: 'daily', type: 'clients_served', target: 1, reward: { money: 80, xp: 10, reputation: 4 }, description: 'Atiende a un cliente' },
  { id: 'd-job', scope: 'daily', type: 'jobs_completed', target: 1, reward: { money: 90, xp: 12, reputation: 4 }, description: 'Mejora (entrega) un vehículo' },
];
export const WEEKLY_MISSIONS: MissionDef[] = [
  { id: 'w-jobs', scope: 'weekly', type: 'jobs_completed', target: 8, reward: { money: 900, xp: 100, reputation: 30 }, description: 'Completa 8 trabajos' },
  { id: 'w-special', scope: 'weekly', type: 'special_clients_served', target: 1, reward: { money: 700, xp: 80, reputation: 40 }, description: 'Atiende a un cliente especial' },
  { id: 'w-restore', scope: 'weekly', type: 'restorations_completed', target: 1, reward: { money: 600, xp: 70, reputation: 25 }, description: 'Completa una restauración' },
  { id: 'w-money', scope: 'weekly', type: 'money_earned', target: 2000, reward: { money: 500, xp: 60, reputation: 20 }, description: 'Gana $2000 trabajando' },
];
export const ALL_MISSIONS = [...DAILY_MISSIONS, ...WEEKLY_MISSIONS];
export const missionById = (id: string) => ALL_MISSIONS.find((m) => m.id === id);
