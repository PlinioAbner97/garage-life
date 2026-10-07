export interface JobDef { id: string; name: string; icon: string; seconds: number; pay: number; xp: number; minLevel: number }

export const JOBS: JobDef[] = [
  { id: 'wash', name: 'Lavado y encerado', icon: '🧽', seconds: 20, pay: 90, xp: 12, minLevel: 1 },
  { id: 'oil', name: 'Cambio de aceite', icon: '🛢️', seconds: 45, pay: 210, xp: 28, minLevel: 1 },
  { id: 'tires', name: 'Balanceo y llantas', icon: '🛞', seconds: 90, pay: 430, xp: 55, minLevel: 2 },
  { id: 'brakes', name: 'Revisión de frenos', icon: '🔧', seconds: 150, pay: 780, xp: 95, minLevel: 3 },
  { id: 'tune', name: 'Afinación de motor', icon: '⚙️', seconds: 300, pay: 1700, xp: 200, minLevel: 4 },
];
export const getJob = (id: string) => JOBS.find((j) => j.id === id)!;
