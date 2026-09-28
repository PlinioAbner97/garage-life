// Catálogo basado en datos: para añadir un carro, agrega una entrada a MODELS.
export interface VehicleModel {
  id: string; name: string; price: number;
  length: number; width: number; bodyH: number;
  cabinH: number; cabinStart: number; cabinLen: number;
}
export interface Swatch { color: number; name: string; price: number }

export const MODELS: VehicleModel[] = [
  { id: 'kaze-s1', name: 'Kaze S1', price: 0, length: 3, width: 1.4, bodyH: 0.35, cabinH: 0.32, cabinStart: 0.9, cabinLen: 1.2 },
  { id: 'raiden-gt', name: 'Raiden GT', price: 4500, length: 3.3, width: 1.5, bodyH: 0.3, cabinH: 0.28, cabinStart: 1.3, cabinLen: 1.1 },
];
export const PAINTS: Swatch[] = [
  { color: 0xd7263d, name: 'Rojo Sunset', price: 0 },
  { color: 0xf2f2f2, name: 'Blanco Perla', price: 0 },
  { color: 0x1e90ff, name: 'Azul Neón', price: 300 },
  { color: 0x7ed957, name: 'Verde Lima', price: 300 },
  { color: 0xffc300, name: 'Amarillo Sol', price: 400 },
  { color: 0xff7f11, name: 'Naranja Drift', price: 400 },
  { color: 0x8e44ad, name: 'Púrpura Noche', price: 500 },
  { color: 0x1c1c1e, name: 'Negro Mate', price: 600 },
];
export const RIMS: Swatch[] = [
  { color: 0xc0c0c0, name: 'Plata', price: 0 },
  { color: 0x2a2a2a, name: 'Negro', price: 0 },
  { color: 0xff3b3b, name: 'Rojo', price: 250 },
  { color: 0x35a7ff, name: 'Azul', price: 250 },
  { color: 0xd4af37, name: 'Oro', price: 350 },
];
export const modelById = (id: string) => MODELS.find((m) => m.id === id) ?? MODELS[0];
export const hex = (c: number) => '#' + c.toString(16).padStart(6, '0');
