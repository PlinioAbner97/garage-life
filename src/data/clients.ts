// Negocio de clientes: tipos de trabajo, reputación y reglas de generación. Todo configurable aquí.
// Para añadir un trabajo: una entrada en CLIENT_JOBS. Para añadir equipamiento de negocio: una entrada en BIZ_EQUIPMENT.
export interface ClientJobDef {
  id: string; name: string; icon: string;
  pay: number; xp: number; seconds: number;
  /** reputación mínima (1–5) para que aparezca */
  minRep: number;
  /** puntos de reputación que suma al cobrarlo */
  repPts: number;
  /** id de accesorio que debe estar instalado en el taller para poder aceptarlo (opcional) */
  needs?: string;
}
export const CLIENT_JOBS: ClientJobDef[] = [
  { id: 'oil', name: 'Cambio de aceite', icon: '🛢️', pay: 350, xp: 45, seconds: 30, minRep: 1, repPts: 1 },
  { id: 'brakes', name: 'Cambio de frenos', icon: '🔧', pay: 850, xp: 90, seconds: 90, minRep: 1, repPts: 2 },
  { id: 'suspension', name: 'Reparación de suspensión', icon: '🛞', pay: 1200, xp: 125, seconds: 120, minRep: 2, repPts: 3 },
  { id: 'engine', name: 'Reparación de motor', icon: '⚙️', pay: 2400, xp: 210, seconds: 240, minRep: 3, repPts: 5, needs: 'car_lift' },
  { id: 'transmission', name: 'Cambio de transmisión', icon: '🔩', pay: 3500, xp: 280, seconds: 360, minRep: 4, repPts: 7, needs: 'car_lift' },
];
export const getClientJob = (id: string) => CLIENT_JOBS.find((j) => j.id === id)!;

/** Reputación del taller: puntos acumulados -> nivel 1..5 */
export const REP_LEVELS = [
  { name: 'Taller principiante', from: 0 }, { name: 'Taller local', from: 8 }, { name: 'Taller reconocido', from: 25 },
  { name: 'Taller profesional', from: 60 }, { name: 'Taller de élite', from: 130 },
];
export const repLevel = (pts: number) => { let l = 1; REP_LEVELS.forEach((r, i) => { if (pts >= r.from) l = i + 1; }); return l; };
/** pago extra por reputación (mejores clientes) */
export const repPayMult = (lvl: number) => 1 + 0.06 * (lvl - 1);

/** Autos de clientes por reputación (ids de vehicles.ts): cuanto más reputación, más exclusivos. */
export const CLIENT_CARS_BY_REP: string[][] = [['falcon-gt'], ['falcon-gt', 'kobalt-22'], ['kobalt-22', 'akane-rs'], ['akane-rs', 'nami-34'], ['nami-34', 'shirogane-x']];
export const CLIENT_NAMES = ['Carlos', 'Marta', 'Diego', 'Lucía', 'Andrés', 'Valeria', 'Tomás', 'Camila', 'Mateo', 'Sofía', 'Bruno', 'Elena', 'Hugo', 'Paula', 'Iván', 'Noelia', 'Rafa', 'Daniela'];

/** Ritmo de llegada de solicitudes. maxOffers crece con la reputación y con la mejora de la recepción (recLevel 1..3, futuro). */
export const OFFER_EVERY_MS = 40_000;
export const OFFER_TTL_MS = 10 * 60_000;
export const maxOffers = (rep: number, recLevel = 1) => 2 + Math.floor(rep / 2) + (recLevel - 1);
export const ARRIVE_MS = 9_000;
export const LEAVE_MS = 7_000;

/** Equipamiento de negocio previsto (para ampliar sin tocar el resto): id de accesorio -> qué desbloquea. */
export const BIZ_EQUIPMENT: Record<string, string> = {
  reception: 'solicitudes de clientes',
  service_bay: 'plaza de trabajo para un cliente',
  car_lift: 'reparaciones mecánicas avanzadas (motor y transmisión)',
  // futuros: diagnostic_machine (diagnósticos), paint_booth (pintura), admin_office (más solicitudes simultáneas)
};

export type ClientState = 'offered' | 'arriving' | 'waiting' | 'repairing' | 'ready' | 'leaving';
export interface ClientJob {
  id: string; client: string; model: string; paint: string; rim: string; jobId: string;
  pay: number; xp: number; seconds: number;
  state: ClientState;
  /** uid de la Bahía de Servicio asignada (al aceptar) */
  bay?: string;
  offeredAt: number; acceptedAt?: number; startedAt?: number; endsAt?: number; leaveAt?: number;
  claimed?: boolean;
}
export interface BizState { rep: number; done: number; jobs: ClientJob[]; nextId: number; nextOfferAt: number; recLevel?: number }
export const freshBiz = (): BizState => ({ rep: 0, done: 0, jobs: [], nextId: 1, nextOfferAt: 0, recLevel: 1 });
