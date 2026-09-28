// Catálogo de vehículos basado en datos: para añadir un modelo, agrega una entrada a VEHICLES.
// Diseños originales inspirados en la cultura JDM; sin marcas ni logotipos protegidos.
export type Rarity = 'common' | 'rare' | 'epic' | 'legendary';
export interface VehicleModel {
  id: string; brand: string; name: string; year: number; rarity: Rarity;
  price: number; unlockLevel: number;
  basePower: number; baseHandling: number; weight: number;
  length: number; width: number; bodyH: number; cabinH: number; cabinStart: number; cabinLen: number;
}
export const VEHICLES: VehicleModel[] = [
  { id: 'kaze-coupe', brand: 'Kaze', name: 'Coupé 92', year: 1992, rarity: 'common', price: 0, unlockLevel: 1,
    basePower: 40, baseHandling: 50, weight: 1180, length: 3, width: 1.4, bodyH: 0.35, cabinH: 0.32, cabinStart: 0.9, cabinLen: 1.2 },
  { id: 'hachi-gti', brand: 'Hachi', name: 'GTi Hatch', year: 1998, rarity: 'common', price: 2200, unlockLevel: 1,
    basePower: 48, baseHandling: 58, weight: 1050, length: 2.8, width: 1.35, bodyH: 0.36, cabinH: 0.4, cabinStart: 0.75, cabinLen: 1.5 },
  { id: 'ryuko-gtr', brand: 'Ryuko', name: 'GT-R Turbo', year: 1999, rarity: 'rare', price: 8000, unlockLevel: 3,
    basePower: 70, baseHandling: 65, weight: 1450, length: 3.3, width: 1.5, bodyH: 0.32, cabinH: 0.3, cabinStart: 1.1, cabinLen: 1.25 },
  { id: 'taiyo-supra', brand: 'Taiyo', name: 'Supra Mk-X', year: 1997, rarity: 'epic', price: 15000, unlockLevel: 5,
    basePower: 85, baseHandling: 62, weight: 1500, length: 3.4, width: 1.5, bodyH: 0.3, cabinH: 0.28, cabinStart: 1.3, cabinLen: 1.1 },
  { id: 'oni-evo', brand: 'Oni', name: 'Evo X-R', year: 2003, rarity: 'legendary', price: 25000, unlockLevel: 8,
    basePower: 95, baseHandling: 80, weight: 1400, length: 3.1, width: 1.45, bodyH: 0.34, cabinH: 0.33, cabinStart: 0.95, cabinLen: 1.3 },
];
export const vehicleById = (id: string) => VEHICLES.find((v) => v.id === id) ?? VEHICLES[0];
export const RARITY_COLOR: Record<Rarity, number> = { common: 0x9aa4b2, rare: 0x4dd0ff, epic: 0xb388ff, legendary: 0xffc21a };
export const RARITY_LABEL: Record<Rarity, string> = { common: 'Común', rare: 'Raro', epic: 'Épico', legendary: 'Legendario' };
