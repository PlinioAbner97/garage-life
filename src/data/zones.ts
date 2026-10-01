export type ZoneUnlock = { level?: number; reputation?: number; money?: number };
export interface ZoneDef {
  id: string; name: string; district: string; description: string;
  activities: string[]; unlock: ZoneUnlock; x: number; y: number; color: number;
}
// Ubicación (x,y) en la cuadrícula isométrica de la ciudad. La zona del taller (garage)
// se representa aparte, como el punto de regreso, y no tiene requisitos.
export const ZONES: ZoneDef[] = [
  { id: 'dealer-jdm', name: 'Concesionario JDM', district: 'Distrito JDM', color: 0xd7263d,
    description: 'Coupés, hatchbacks y deportivos japoneses originales, listos para tu colección.',
    activities: ['Inspeccionar vehículos', 'Comprar un auto JDM'], unlock: {}, x: 6, y: 4 },
  { id: 'dealer-classic', name: 'Clásicos & Restauración', district: 'Zona residencial', color: 0x8b5a2b,
    description: 'Autos de los 70, 80 y 90 con historia, perfectos para restaurar.',
    activities: ['Inspeccionar clásicos', 'Comprar un auto clásico'], unlock: { level: 3 }, x: 3, y: 9 },
  { id: 'dealer-performance', name: 'Alto Rendimiento', district: 'Distrito de carreras', color: 0x8e44ad,
    description: 'Superdeportivos ficticios de gama alta, para quien ya se ganó un lugar en la ciudad.',
    activities: ['Inspeccionar superdeportivos', 'Comprar un auto de alto rendimiento'], unlock: { level: 7, reputation: 600, money: 5000 }, x: 15, y: 5 },
  { id: 'used-market', name: 'Mercado de Usados', district: 'Zona comercial', color: 0x2c7fb8,
    description: 'Oportunidades que cambian cada semana. Buenos precios, distintas condiciones.',
    activities: ['Inspeccionar autos usados', 'Comprar un auto usado'], unlock: {}, x: 9, y: 3 },
  { id: 'parts-shop', name: 'Tienda de Piezas', district: 'Zona industrial', color: 0x2a6f3f,
    description: 'Motores, aros, suspensiones y más, directo a tu inventario.',
    activities: ['Comprar piezas de personalización'], unlock: {}, x: 12, y: 8 },
  { id: 'racing-district', name: 'Distrito de Carreras', district: 'Distrito de carreras', color: 0xff7f11,
    description: 'Circuito y zona de drag racing. Inscríbete para futuros eventos.',
    activities: ['Consultar eventos', 'Inscribir un vehículo'], unlock: { level: 4 }, x: 16, y: 11 },
  { id: 'meetups', name: 'Encuentros Automotrices', district: 'Área de eventos', color: 0xffc21a,
    description: 'Reuniones JDM, exhibiciones de clásicos y encuentros de tuning todos los días.',
    activities: ['Presentar un vehículo', 'Ganar reputación y recompensas'], unlock: { reputation: 200 }, x: 5, y: 14 },
];
export const zoneById = (id: string) => ZONES.find((z) => z.id === id);
