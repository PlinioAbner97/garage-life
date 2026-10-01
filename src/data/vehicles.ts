// Catálogo de vehículos basado en datos: para añadir un modelo, agrega una entrada a VEHICLES.
// Diseños originales inspirados en la cultura JDM; sin marcas ni logotipos protegidos.
export type Rarity = 'common' | 'rare' | 'epic' | 'legendary';
export type DealerCategory = 'jdm' | 'classic' | 'performance';
export interface VehicleModel {
  id: string; brand: string; name: string; year: number; rarity: Rarity; dealerCategory: DealerCategory;
  price: number; unlockLevel: number;
  basePower: number; baseHandling: number; weight: number;
  length: number; width: number; bodyH: number; cabinH: number; cabinStart: number; cabinLen: number;
}
export const VEHICLES: VehicleModel[] = [
  { id: 'kaze-coupe', brand: 'Kaze', name: 'Coupé 92', year: 1992, rarity: 'common', dealerCategory: 'jdm', price: 0, unlockLevel: 1,
    basePower: 40, baseHandling: 50, weight: 1180, length: 3, width: 1.4, bodyH: 0.35, cabinH: 0.32, cabinStart: 0.9, cabinLen: 1.2 },
  { id: 'hachi-gti', brand: 'Hachi', name: 'GTi Hatch', year: 1998, rarity: 'common', dealerCategory: 'jdm', price: 2200, unlockLevel: 1,
    basePower: 48, baseHandling: 58, weight: 1050, length: 2.8, width: 1.35, bodyH: 0.36, cabinH: 0.4, cabinStart: 0.75, cabinLen: 1.5 },
  { id: 'ryuko-gtr', brand: 'Ryuko', name: 'GT-R Turbo', year: 1999, rarity: 'rare', dealerCategory: 'jdm', price: 8000, unlockLevel: 3,
    basePower: 70, baseHandling: 65, weight: 1450, length: 3.3, width: 1.5, bodyH: 0.32, cabinH: 0.3, cabinStart: 1.1, cabinLen: 1.25 },
  { id: 'taiyo-supra', brand: 'Taiyo', name: 'Supra Mk-X', year: 1997, rarity: 'epic', dealerCategory: 'jdm', price: 15000, unlockLevel: 5,
    basePower: 85, baseHandling: 62, weight: 1500, length: 3.4, width: 1.5, bodyH: 0.3, cabinH: 0.28, cabinStart: 1.3, cabinLen: 1.1 },
  { id: 'oni-evo', brand: 'Oni', name: 'Evo X-R', year: 2003, rarity: 'legendary', dealerCategory: 'jdm', price: 25000, unlockLevel: 8,
    basePower: 95, baseHandling: 80, weight: 1400, length: 3.1, width: 1.45, bodyH: 0.34, cabinH: 0.33, cabinStart: 0.95, cabinLen: 1.3 },
  { id: 'retro-cruiser-75', brand: 'Yashiro', name: 'Cruiser 75', year: 1975, rarity: 'common', dealerCategory: 'classic', price: 3200, unlockLevel: 2,
    basePower: 30, baseHandling: 35, weight: 1350, length: 3.2, width: 1.5, bodyH: 0.4, cabinH: 0.34, cabinStart: 1.0, cabinLen: 1.3 },
  { id: 'retro-coupe-88', brand: 'Sekai', name: 'Coupé 88', year: 1988, rarity: 'rare', dealerCategory: 'classic', price: 9500, unlockLevel: 3,
    basePower: 45, baseHandling: 48, weight: 1220, length: 3.1, width: 1.45, bodyH: 0.34, cabinH: 0.3, cabinStart: 0.95, cabinLen: 1.25 },
  { id: 'volt-gtx', brand: 'Volt', name: 'GTX Hyper', year: 2025, rarity: 'epic', dealerCategory: 'performance', price: 42000, unlockLevel: 7,
    basePower: 92, baseHandling: 78, weight: 1380, length: 3.5, width: 1.55, bodyH: 0.28, cabinH: 0.26, cabinStart: 1.35, cabinLen: 1.15 },
  { id: 'zeta-r1', brand: 'Zeta', name: 'R1 Prototipo', year: 2026, rarity: 'legendary', dealerCategory: 'performance', price: 68000, unlockLevel: 9,
    basePower: 99, baseHandling: 88, weight: 1300, length: 3.6, width: 1.6, bodyH: 0.26, cabinH: 0.25, cabinStart: 1.4, cabinLen: 1.1 },
];
export const vehicleById = (id: string) => VEHICLES.find((v) => v.id === id) ?? VEHICLES[0];
export const vehiclesByDealer = (cat: DealerCategory) => VEHICLES.filter((v) => v.dealerCategory === cat);
export const RARITY_COLOR: Record<Rarity, number> = { common: 0x9aa4b2, rare: 0x4dd0ff, epic: 0xb388ff, legendary: 0xffc21a };
export const RARITY_LABEL: Record<Rarity, string> = { common: 'Común', rare: 'Raro', epic: 'Épico', legendary: 'Legendario' };
export const DEALER_LABEL: Record<DealerCategory, string> = { jdm: 'Concesionario JDM', classic: 'Concesionario de clásicos', performance: 'Alto rendimiento' };
