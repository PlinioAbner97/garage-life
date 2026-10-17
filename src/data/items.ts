// Catálogo de accesorios para decorar y equipar el taller. Los modelos vienen de GL_SHOP_ASSETS_V10 (Blender),
// renderizados con tools/render_items.py. Para añadir un artículo: una entrada aquí + su sprite (4 rotaciones).
// Precios en GarageCoins (la misma moneda del juego); son configurables.
export type ItemCategory = 'equipamiento' | 'herramientas' | 'muebles' | 'almacenamiento' | 'pared' | 'jdm' | 'taller' | 'especial';
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
  /** nivel del jugador necesario para comprarlo */
  minLevel?: number;
  /** objetos de negocio con reglas propias: la recepción habilita Clientes; la bahía se instala sobre una plaza de auto */
  special?: 'reception' | 'bay';
}

export const CATEGORIES: { id: ItemCategory; name: string; icon: string }[] = [
  { id: 'equipamiento', name: 'Equipamiento', icon: '🏗️' },
  { id: 'herramientas', name: 'Herramientas', icon: '🔧' },
  { id: 'muebles', name: 'Muebles', icon: '🛋️' },
  { id: 'almacenamiento', name: 'Almacenamiento', icon: '🗄️' },
  { id: 'pared', name: 'Decoración de pared', icon: '🖼️' },
  { id: 'jdm', name: 'JDM / Tuning', icon: '🏎️' },
  { id: 'especial', name: 'Equipamiento especial', icon: '🧾' },
  { id: 'taller', name: 'Equipamiento de taller', icon: '🛠️' },
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
  { id: 'compressor', name: 'Compresor', price: 1500, category: 'equipamiento', kind: 'floor', desc: 'Compresor de aire con tanque. .', w: 1.1, d: 1.1, prototype: true },
  { id: 'neon_sign', name: 'Letrero de neón', price: 1800, category: 'pared', kind: 'wall', desc: 'Letrero luminoso para el muro del taller.', w: 2.4, d: 0.18 },
  { id: 'vending_machine', name: 'Máquina de bebidas', price: 2500, category: 'muebles', kind: 'floor', desc: 'Máquina expendedora. Decorativa por ahora.', w: 1.0, d: 0.84, prototype: true },
  { id: 'car_lift', name: 'Elevador de autos', price: 6000, category: 'equipamiento', kind: 'floor', minLevel: 3, desc: 'Elevador de dos columnas. Necesario para aceptar reparaciones de motor y transmisión (las mejor pagadas).', w: 3.4, d: 0.44 },
  // ---- negocio de clientes (ver src/data/clients.ts)
  { id: 'reception', name: 'Recepción de Clientes', price: 15000, category: 'especial', kind: 'floor', special: 'reception', desc: 'Mostrador con computadora. Ya viene instalado en tu taller; este es de repuesto.', w: 2.54, d: 1.34 },
  { id: 'service_bay', name: 'Bahía de Servicio', price: 8000, category: 'taller', kind: 'floor', minLevel: 3, special: 'bay', desc: 'Se instala sobre una plaza de auto libre y la reserva para vehículos de clientes. Al retirarla, la plaza vuelve a ser estacionamiento.', w: 3.4, d: 6.6 },
  // ---- JDM / tuning (decorativos): modelados con primitivas en tools/jdm_items.py
  { id: 'tire_stack', name: 'Pila de llantas con rin', price: 350, category: 'jdm', kind: 'floor', desc: 'Tres llantas apiladas con un rin dorado de exhibición.', w: 0.72, d: 0.72, prototype: true },
  { id: 'paper_lantern', name: 'Linterna japonesa', price: 300, category: 'jdm', kind: 'floor', desc: 'Linterna de papel roja sobre pie metálico, luz cálida de izakaya.', w: 0.6, d: 0.6, prototype: true },
  { id: 'bucket_seat', name: 'Asiento bucket', price: 800, category: 'jdm', kind: 'floor', desc: 'Asiento deportivo rojo montado sobre bastidor, como en un taller de tuning.', w: 0.64, d: 0.8, prototype: true },
  { id: 'wing_stand', name: 'Alerón GT en soporte', price: 1400, category: 'jdm', kind: 'floor', desc: 'Alerón de fibra con placas rojas exhibido en soportes.', w: 1.4, d: 0.5, prototype: true },
  { id: 'turbo_display', name: 'Turbo en pedestal', price: 1600, category: 'jdm', kind: 'floor', desc: 'Turbocompresor de exhibición con anillo azul.', w: 0.85, d: 0.85, prototype: true },
  { id: 'torii', name: 'Torii decorativo', price: 2200, category: 'jdm', kind: 'floor', desc: 'Pórtico rojo japonés: el sello de las carreras de montaña.', w: 2.1, d: 0.3, prototype: true },
  { id: 'rising_sun', name: 'Bandera del Sol Naciente', price: 450, category: 'pared', kind: 'wall', desc: 'Bandera blanca con el sol rojo. Se cuelga de un muro.', w: 1.7, d: 0.1, prototype: true },
  { id: 'steering_wheel', name: 'Volante deportivo', price: 700, category: 'pared', kind: 'wall', desc: 'Volante de carreras colgado como trofeo.', w: 0.63, d: 0.11, prototype: true },
  { id: 'plate_rack', name: 'Placas JDM', price: 500, category: 'pared', kind: 'wall', desc: 'Tablero con tres placas de matrícula.', w: 1.5, d: 0.08, prototype: true },
  { id: 'neon_bar', name: 'Barra de neón rojo y azul', price: 1100, category: 'pared', kind: 'wall', desc: 'Dos tubos de neón sobre un panel oscuro.', w: 2.1, d: 0.1, prototype: true },
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
