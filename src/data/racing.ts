export interface RaceEvent {
  id: string; name: string; location: string; description: string;
  entryFee: number; unlockLevel: number;
}
// Fase actual: navegación, información e inscripción reales. La mecánica de carrera en sí
// (simulación/resultado) todavía no existe, así que NO se otorga ninguna recompensa aquí
// para evitar una "carrera falsa" — ver JobsScreen/MeetupsScreen para mecánicas con resultado real.
export const RACE_EVENTS: RaceEvent[] = [
  { id: 'circuit-open', name: 'Circuito Abierto', location: 'Circuito de carreras', description: 'Vueltas cronometradas en el circuito principal de la ciudad.', entryFee: 300, unlockLevel: 4 },
  { id: 'drag-night', name: 'Drag Night', location: 'Zona de drag racing', description: 'Carreras de aceleración en línea recta, una contra una.', entryFee: 250, unlockLevel: 4 },
];

export interface MeetupEvent {
  id: string; name: string; location: string; description: string;
  category: string; thresholds: { bronze: number; silver: number; gold: number };
  rewards: { bronze: { money: number; xp: number; reputation: number }; silver: { money: number; xp: number; reputation: number }; gold: { money: number; xp: number; reputation: number } };
}
// Los encuentros SÍ tienen una mecánica real: juzgan el auto que elijas usando sus
// estadísticas y modificaciones reales (ver core/stats.ts), no una recompensa fija.
export const MEETUP_EVENTS: MeetupEvent[] = [
  { id: 'jdm-meet', name: 'Reunión JDM', location: 'Plaza JDM', description: 'Muestra tu auto ante la comunidad JDM de la ciudad.', category: 'Estilo JDM',
    thresholds: { bronze: 300, silver: 800, gold: 1600 },
    rewards: { bronze: { money: 80, xp: 15, reputation: 6 }, silver: { money: 200, xp: 30, reputation: 14 }, gold: { money: 450, xp: 60, reputation: 30 } } },
  { id: 'classic-show', name: 'Exhibición de Clásicos', location: 'Plaza histórica', description: 'Presenta un clásico restaurado ante coleccionistas.', category: 'Clásicos',
    thresholds: { bronze: 250, silver: 700, gold: 1400 },
    rewards: { bronze: { money: 90, xp: 15, reputation: 8 }, silver: { money: 220, xp: 32, reputation: 16 }, gold: { money: 480, xp: 62, reputation: 34 } } },
  { id: 'tuning-expo', name: 'Expo de Tuning', location: 'Nave industrial', description: 'Compite por las modificaciones más elaboradas.', category: 'Tuning',
    thresholds: { bronze: 350, silver: 900, gold: 1800 },
    rewards: { bronze: { money: 100, xp: 18, reputation: 8 }, silver: { money: 260, xp: 36, reputation: 18 }, gold: { money: 550, xp: 70, reputation: 36 } } },
  { id: 'high-end-expo', name: 'Exhibición de Alta Gama', location: 'Salón VIP', description: 'Solo los autos más valiosos impresionan aquí.', category: 'Alta gama',
    thresholds: { bronze: 500, silver: 1400, gold: 2600 },
    rewards: { bronze: { money: 130, xp: 22, reputation: 10 }, silver: { money: 320, xp: 44, reputation: 22 }, gold: { money: 700, xp: 90, reputation: 45 } } },
];
export const meetupById = (id: string) => MEETUP_EVENTS.find((m) => m.id === id);
export const raceById = (id: string) => RACE_EVENTS.find((r) => r.id === id);
