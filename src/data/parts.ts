// Catálogo de piezas de personalización, basado en datos.
export type PartCategory = 'paint' | 'rims' | 'suspension' | 'front' | 'skirt' | 'spoiler' | 'hood' | 'tint' | 'stripe' | 'exhaust' | 'engine';
export interface PartOption {
  id: string; category: PartCategory; name: string; price: number; unlockLevel: number; description: string;
  color?: number; rimSize?: 'street' | 'sport' | 'wide'; powerBoost?: number; handlingBoost?: number;
}
export const PARTS: PartOption[] = [
  { id: 'paint-red', category: 'paint', name: 'Rojo Sunset', price: 0, unlockLevel: 1, color: 0xd7263d, description: 'Color de fábrica.' },
  { id: 'paint-white', category: 'paint', name: 'Blanco Perla', price: 0, unlockLevel: 1, color: 0xf2f2f2, description: 'Color de fábrica.' },
  { id: 'paint-blue', category: 'paint', name: 'Azul Neón', price: 300, unlockLevel: 1, color: 0x1e90ff, description: 'Pintura brillante de taller.' },
  { id: 'paint-green', category: 'paint', name: 'Verde Lima', price: 300, unlockLevel: 1, color: 0x7ed957, description: 'Pintura brillante de taller.' },
  { id: 'paint-yellow', category: 'paint', name: 'Amarillo Sol', price: 400, unlockLevel: 2, color: 0xffc300, description: 'Pintura premium.' },
  { id: 'paint-orange', category: 'paint', name: 'Naranja Drift', price: 400, unlockLevel: 2, color: 0xff7f11, description: 'Pintura premium.' },
  { id: 'paint-purple', category: 'paint', name: 'Púrpura Noche', price: 500, unlockLevel: 3, color: 0x8e44ad, description: 'Pintura premium.' },
  { id: 'paint-black', category: 'paint', name: 'Negro Mate', price: 600, unlockLevel: 3, color: 0x1c1c1e, description: 'Acabado mate.' },
  { id: 'rims-silver', category: 'rims', name: 'Plata Calle', price: 0, unlockLevel: 1, color: 0xc0c0c0, rimSize: 'street', description: 'Aros de fábrica.' },
  { id: 'rims-black', category: 'rims', name: 'Negro Calle', price: 0, unlockLevel: 1, color: 0x2a2a2a, rimSize: 'street', description: 'Aros de fábrica.' },
  { id: 'rims-red-sport', category: 'rims', name: 'Rojo Deportivo', price: 350, unlockLevel: 2, color: 0xff3b3b, rimSize: 'sport', description: 'Mayor diámetro, look deportivo.' },
  { id: 'rims-blue-sport', category: 'rims', name: 'Azul Deportivo', price: 350, unlockLevel: 2, color: 0x35a7ff, rimSize: 'sport', description: 'Mayor diámetro, look deportivo.' },
  { id: 'rims-gold-wide', category: 'rims', name: 'Oro Wide', price: 700, unlockLevel: 4, color: 0xd4af37, rimSize: 'wide', description: 'Aros anchos de competición.' },
  { id: 'rims-white-wide', category: 'rims', name: 'Blanco Wide', price: 700, unlockLevel: 4, color: 0xf2f2f2, rimSize: 'wide', description: 'Aros anchos de competición.' },
  { id: 'susp-street', category: 'suspension', name: 'Calle', price: 0, unlockLevel: 1, handlingBoost: 0, description: 'Altura de fábrica.' },
  { id: 'susp-sport', category: 'suspension', name: 'Deportiva', price: 600, unlockLevel: 2, handlingBoost: 5, description: 'Reduce la altura y mejora el manejo.' },
  { id: 'susp-race', category: 'suspension', name: 'Competición', price: 1400, unlockLevel: 5, handlingBoost: 10, description: 'Altura mínima, manejo de pista.' },
  { id: 'front-stock', category: 'front', name: 'Paragolpes de fábrica', price: 0, unlockLevel: 1, description: 'Sin modificar.' },
  { id: 'front-lip', category: 'front', name: 'Lip deportivo', price: 900, unlockLevel: 3, description: 'Labio delantero de fibra.' },
  { id: 'skirt-stock', category: 'skirt', name: 'Faldones de fábrica', price: 0, unlockLevel: 1, description: 'Sin modificar.' },
  { id: 'skirt-side', category: 'skirt', name: 'Faldones laterales', price: 700, unlockLevel: 3, description: 'Faldones laterales deportivos.' },
  { id: 'spoiler-stock', category: 'spoiler', name: 'Sin spoiler', price: 0, unlockLevel: 1, description: 'Sin modificar.' },
  { id: 'spoiler-wing', category: 'spoiler', name: 'Alerón de competición', price: 1100, unlockLevel: 4, description: 'Alerón trasero de fibra.' },
  { id: 'hood-stock', category: 'hood', name: 'Capó de fábrica', price: 0, unlockLevel: 1, description: 'Sin modificar.' },
  { id: 'hood-vent', category: 'hood', name: 'Capó con toma de aire', price: 800, unlockLevel: 3, description: 'Capó ventilado.' },
  { id: 'tint-none', category: 'tint', name: 'Sin polarizado', price: 0, unlockLevel: 1, description: 'Cristales de fábrica.' },
  { id: 'tint-dark', category: 'tint', name: 'Cristales polarizados', price: 250, unlockLevel: 2, description: 'Cristales oscuros.' },
  { id: 'stripe-none', category: 'stripe', name: 'Sin vinilo', price: 0, unlockLevel: 1, description: 'Sin decoración.' },
  { id: 'stripe-white', category: 'stripe', name: 'Franja blanca', price: 300, unlockLevel: 2, color: 0xf2f2f2, description: 'Vinilo central.' },
  { id: 'stripe-black', category: 'stripe', name: 'Franja negra', price: 300, unlockLevel: 2, color: 0x1c1c1e, description: 'Vinilo central.' },
  { id: 'exhaust-stock', category: 'exhaust', name: 'Escape de fábrica', price: 0, unlockLevel: 1, description: 'Sin modificar.' },
  { id: 'exhaust-sport', category: 'exhaust', name: 'Escape deportivo', price: 450, unlockLevel: 2, description: 'Puntas de escape visibles.' },
  { id: 'engine-stock', category: 'engine', name: 'Motor de fábrica', price: 0, unlockLevel: 1, powerBoost: 0, description: 'Sin modificar.' },
  { id: 'engine-stage1', category: 'engine', name: 'Motor Stage 1', price: 1200, unlockLevel: 2, powerBoost: 8, description: 'Admisión y escape mejorados.' },
  { id: 'engine-stage2', category: 'engine', name: 'Motor Stage 2', price: 2800, unlockLevel: 4, powerBoost: 16, description: 'Turbo mayor y mapeo de potencia.' },
  { id: 'engine-stage3', category: 'engine', name: 'Motor Stage 3', price: 6000, unlockLevel: 7, powerBoost: 26, description: 'Internos forjados, potencia de competición.' },
];
export const STOCK_PART_IDS = PARTS.filter((p) => p.price === 0).map((p) => p.id);
export const partsByCategory = (cat: PartCategory) => PARTS.filter((p) => p.category === cat);
export const partById = (id: string) => PARTS.find((p) => p.id === id);
export const resolvePaintColor = (v: string): number => {
  if (v.startsWith('custom:')) { const n = parseInt(v.slice(7), 16); return Number.isFinite(n) ? n : 0xd7263d; }
  return partById(v)?.color ?? 0xd7263d;
};
export const CATEGORY_LABEL: Record<PartCategory, string> = {
  paint: 'Pintura', rims: 'Aros', suspension: 'Suspensión', front: 'Paragolpes', skirt: 'Faldones',
  spoiler: 'Alerón', hood: 'Capó', tint: 'Cristales', stripe: 'Vinilos', exhaust: 'Escape', engine: 'Motor',
};
