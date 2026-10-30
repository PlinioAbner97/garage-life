// Datos de vehículos. Agregar un auto = agregar una entrada aquí + sus sprites renderizados.
// Nombres ficticios: los modelos 3D de la escena son JDM originales del usuario, sin logos en el juego.
export type SpriteKey = 'ecl' | 'sub' | 'sup' | 'r34' | 'evo' | 'rx7' | 'gtr';

export interface VehicleModel {
  id: string;
  name: string;
  tagline: string;
  spriteKey: SpriteKey;
  price: number;
  minLevel: number;
  /** multiplicador de ingresos en trabajos */
  payBonus: number;
  stats: { potencia: number; agarre: number; estilo: number };
}

export const VEHICLES: VehicleModel[] = [
  {
    id: 'falcon-gt', name: 'Falcon GT', tagline: 'Coupé ligero con alerón de pista. Tu primer proyecto.',
    spriteKey: 'ecl', price: 0, minLevel: 1, payBonus: 1,
    stats: { potencia: 55, agarre: 60, estilo: 70 },
  },
  {
    id: 'kobalt-22', name: 'Kobalt 22', tagline: 'Sedán rally de edición limitada. Rápido y agresivo.',
    spriteKey: 'sub', price: 12000, minLevel: 3, payBonus: 1.25,
    stats: { potencia: 82, agarre: 85, estilo: 78 },
  },
  {
    id: 'akane-rs', name: 'Akane RS', tagline: 'Biturbo con alerón gigante. Leyenda de las calles.',
    spriteKey: 'sup', price: 30000, minLevel: 4, payBonus: 1.5,
    stats: { potencia: 90, agarre: 72, estilo: 88 },
  },
  {
    id: 'nami-34', name: 'Nami 34', tagline: 'Coupé de tracción total, azul y letal en curva.',
    spriteKey: 'r34', price: 65000, minLevel: 6, payBonus: 1.75,
    stats: { potencia: 92, agarre: 88, estilo: 82 },
  },
  {
    id: 'shirogane-x', name: 'Shirogane X', tagline: 'Sedán de competición. El rey del taller.',
    spriteKey: 'evo', price: 130000, minLevel: 8, payBonus: 2,
    stats: { potencia: 95, agarre: 92, estilo: 78 },
  },
  {
    id: 'ryoku-fd', name: 'Ryoku FD', tagline: 'Coupé rotativo con alerón de GT. Ligero, afinado y muy rápido.',
    spriteKey: 'rx7', price: 45000, minLevel: 5, payBonus: 1.65,
    stats: { potencia: 88, agarre: 80, estilo: 90 },
  },
  {
    id: 'hoshi-r35', name: 'Hoshi R35', tagline: 'Superdeportivo de tracción total con kit ancho. El más rápido del concesionario.',
    spriteKey: 'gtr', price: 220000, minLevel: 10, payBonus: 2.25,
    stats: { potencia: 100, agarre: 96, estilo: 92 },
  },
];

export const getModel = (id: string): VehicleModel => {
  const m = VEHICLES.find((v) => v.id === id);
  if (!m) throw new Error(`Modelo desconocido: ${id}`);
  return m;
};
