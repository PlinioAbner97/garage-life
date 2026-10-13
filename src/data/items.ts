// Catálogo de accesorios para decorar y equipar el taller. Los modelos vienen de GL_SHOP_ASSETS_V10 (Blender),
// renderizados con tools/render_items.py. Para añadir un artículo: una entrada aquí + su sprite (4 rotaciones).
// Precios en GarageCoins (la misma moneda del juego); son configurables.
export type ItemCategory = 'equipamiento' | 'herramientas' | 'muebles' | 'almacenamiento' | 'pared';
export type ItemKind = 'floor' | 'wall';
export interface ItemDef {
  id: string;                 // coincide con item_<id>_<rot>.png
  name: string;
  price: number;
  category: ItemCategory;
  kind: ItemKind;             // floor: se apoya en el suelo; wall: se pega a un muro
  desc: string;
  /** huella en metros en rotación 0: ancho (x) y fondo (y). Medidas reales del modelo de Blender. */
  w: number; d: number;
  /** modelo todavía sin función de juego (solo decoración) */
  prototype?: boolean;
}

export const CATEGORIES: { id: ItemCategory; name: string; icon: string }[] = [
  { id: 'equipamiento', name: 'Equipamiento', icon: '🏗️' },
  { id: 'herramientas', name: 'Herramientas', icon: '🔧' },
  { id: 'muebles', name: 'Muebles', icon: '🛋️' },
  { id: 'almacenamiento', name: 'Almacenamiento', icon: '🗄️' },
  { id: 'pared', name: 'Decoración de pared', icon: '🖼️' },
];

export const ITEMS: ItemDef[] = [
  { id: 'oil_drum', name: 'Bidón de aceite', price: 120, category: 'almacenamiento', kind: 'floor', desc: 'Bidón metálico de taller. El toque industrial más barato.', w: 0.76, d: 0.76 },
  { id: 'table', name: 'Mesa', price: 400, category: 'muebles', kind: 'floor', desc: 'Mesa baja para la sala de espera o los papeles del taller.', w: 1.6, d: 1.1 },
  { id: 'cleaning_station', name: 'Estación de limpieza', price: 550, category: 'equipamiento', kind: 'floor', desc: 'Estante con productos de limpieza y detallado.', w: 1.2, d: 0.7, prototype: true },
  { id: 'workbench', name: 'Banco de trabajo', price: 650, category: 'herramientas', kind: 'floor', desc: 'Banco de madera con patas metálicas.', w: 2.4, d: 0.9 },
  { id: 'tool_wall', name: 'Panel de herramientas', price: 750, category: 'pared', kind: 'wall', desc: 'Panel con herramientas colgadas. Se fija a un muro.', w: 2.0, d: 0.19 },
  { id: 'tool_cabinet', name: 'Gabinete de herramientas', price: 900, category: 'almacenamiento', kind: 'floor', desc: 'Gabinete con cajones para guardar herramientas.', w: 1.3, d: 0.64 },
  { id: 'sofa', name: 'Sofá', price: 1100, category: 'muebles', kind: 'floor', desc: 'Sofá para que los clientes esperen cómodos.', w: 2.1, d: 0.95 },
  { id: 'tire_rack', name: 'Estante de neumáticos', price: 1200, category: 'almacenamiento', kind: 'floor', desc: 'Estante con neumáticos de repuesto.', w: 2.6, d: 0.76 },
  { id: 'compressor', name: 'Compresor', price: 1500, category: 'equipamiento', kind: 'floor', desc: 'Compresor de aire con tanque. Decorativo por ahora.', w: 1.1, d: 1.1, prototype: true },
  { id: 'neon_sign', name: 'Letrero de neón', price: 1800, category: 'pared', kind: 'wall', desc: 'Letrero luminoso para el muro del taller.', w: 2.4, d: 0.18 },
  { id: 'vending_machine', name: 'Máquina de bebidas', price: 2500, category: 'muebles', kind: 'floor', desc: 'Máquina expendedora. Decorativa por ahora.', w: 1.0, d: 0.84, prototype: true },
  { id: 'car_lift', name: 'Elevador de autos', price: 4500, category: 'equipamiento', kind: 'floor', desc: 'Elevador de dos columnas. Decorativo por ahora: aún no sube autos.', w: 3.4, d: 0.44, prototype: true },
];
export const getItem = (id: string) => ITEMS.find((i) => i.id === id);

/** Acabados del taller (base extensible: suelo y paredes). price 0 = gratis. */
export interface FinishDef { id: string; name: string; price: number; minLevel: number; hex: number }
export const FLOOR_FINISHES: FinishDef[] = [
  { id: 'stock', name: 'Original', price: 0, minLevel: 1, hex: 0xffffff },
  { id: 'warm', name: 'Concreto cálido', price: 600, minLevel: 3, hex: 0xffe6c4 },
  { id: 'cool', name: 'Acero frío', price: 600, minLevel: 3, hex: 0xc4dcff },
  { id: 'green', name: 'Resina verde', price: 1500, minLevel: 6, hex: 0xb4f0c8 },
  { id: 'red', name: 'Resina roja', price: 1500, minLevel: 6, hex: 0xffb8b8 },
];
export const WALL_FINISHES: FinishDef[] = [
  { id: 'stock', name: 'Original', price: 0, minLevel: 1, hex: 0xffffff },
  { id: 'sand', name: 'Arena', price: 400, minLevel: 2, hex: 0xffe9c2 },
  { id: 'sky', name: 'Azul cielo', price: 400, minLevel: 2, hex: 0xbcd8ff },
  { id: 'mint', name: 'Menta', price: 900, minLevel: 5, hex: 0xbdf5da },
  { id: 'rose', name: 'Rosa neón', price: 900, minLevel: 5, hex: 0xffc2e6 },
];
export const findFloor = (id?: string) => FLOOR_FINISHES.find((f) => f.id === id) ?? FLOOR_FINISHES[0];
export const findWall = (id?: string) => WALL_FINISHES.find((f) => f.id === id) ?? WALL_FINISHES[0];
