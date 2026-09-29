export interface ClientArchetype {
  id: string; label: string; names: string[]; dialogues: string[];
  taskKinds: ('repair' | 'mod')[]; minTasks: number; maxTasks: number;
  difficulty: number; payMult: number; baseReputation: number;
  unlockLevel: number; minReputationTier: number;
}
export const CLIENT_ARCHETYPES: ClientArchetype[] = [
  { id: 'common', label: 'Cliente común', names: ['Marta', 'José', 'Elena', 'Rubén', 'Carla', 'Iván'],
    dialogues: [
      'Mi auto necesita una revisión, últimamente hace ruidos raros.',
      'Se me dañaron los frenos, ¿me puedes ayudar?',
      '¿Podrías darle un mantenimiento general antes del viaje?',
    ],
    taskKinds: ['repair'], minTasks: 1, maxTasks: 2, difficulty: 1, payMult: 1, baseReputation: 12, unlockLevel: 1, minReputationTier: 0 },
  { id: 'jdm', label: 'Entusiasta JDM', names: ['Kenji', 'Sora', 'Mika', 'Dario', 'Luz'],
    dialogues: [
      'Quiero que mi coupé tenga un estilo más agresivo. ¿Puedes instalarle unos buenos aros y ajustar la suspensión?',
      'Busco darle personalidad a mi auto: pintura llamativa y algo de estilo.',
      'Quiero que este auto se vea único en cualquier encuentro JDM.',
    ],
    taskKinds: ['mod'], minTasks: 1, maxTasks: 3, difficulty: 2, payMult: 1.1, baseReputation: 18, unlockLevel: 1, minReputationTier: 0 },
  { id: 'racer', label: 'Corredor', names: ['Nico', 'Vale', 'Bruno', 'Ana'],
    dialogues: [
      'Necesito más potencia para el próximo evento. Tengo un presupuesto limitado, así que elige las mejoras con cuidado.',
      'Quiero bajar tiempos en pista, mejora el motor y la suspensión.',
    ],
    taskKinds: ['mod'], minTasks: 2, maxTasks: 3, difficulty: 3, payMult: 1.25, baseReputation: 26, unlockLevel: 3, minReputationTier: 0 },
  { id: 'collector', label: 'Coleccionista', names: ['Don Fabio', 'Doña Rosa', 'Alberto', 'Corina'],
    dialogues: [
      'Este vehículo lleva años guardado. Quiero devolverle su apariencia original.',
      'Es una joya de colección, trátalo con cuidado y hazlo lucir como nuevo.',
    ],
    taskKinds: ['repair', 'mod'], minTasks: 3, maxTasks: 4, difficulty: 3, payMult: 1.3, baseReputation: 30, unlockLevel: 4, minReputationTier: 1 },
  { id: 'special', label: 'Cliente especial', names: ['Sr. Takahashi', 'Ing. Vega', 'Sra. Ibarra'],
    dialogues: [
      'Vengo muy recomendado. Quiero un trabajo excepcional, el precio no es problema.',
      'Este proyecto es especial para mí. Confío en tu reputación como mecánico.',
    ],
    taskKinds: ['repair', 'mod'], minTasks: 3, maxTasks: 4, difficulty: 4, payMult: 1.6, baseReputation: 60, unlockLevel: 6, minReputationTier: 2 },
];
export const archetypeById = (id: string) => CLIENT_ARCHETYPES.find((a) => a.id === id);
export const pickName = (a: ClientArchetype) => a.names[Math.floor(Math.random() * a.names.length)];

export const REPUTATION_TIERS = [
  { min: 0, name: 'Mecánico principiante' },
  { min: 200, name: 'Mecánico de barrio' },
  { min: 600, name: 'Especialista JDM' },
  { min: 1400, name: 'Mecánico profesional' },
  { min: 3000, name: 'Maestro de taller' },
  { min: 6000, name: 'Leyenda automotriz' },
];
export function reputationTierIndex(rep: number) { return REPUTATION_TIERS.filter((t) => rep >= t.min).length - 1; }
export function reputationTierName(rep: number) { return REPUTATION_TIERS[reputationTierIndex(rep)].name; }
export function reputationProgress(rep: number) {
  const idx = reputationTierIndex(rep);
  const cur = REPUTATION_TIERS[idx], next = REPUTATION_TIERS[idx + 1];
  if (!next) return { pct: 1, cur, next: null as typeof cur | null };
  return { pct: (rep - cur.min) / (next.min - cur.min), cur, next: next as typeof cur | null };
}
