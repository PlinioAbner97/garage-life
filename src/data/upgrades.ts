// Catálogo de mejoras del taller, basado en datos.
export type UpgradeCategory = 'lift' | 'lighting' | 'floor' | 'capacity';
export interface GarageUpgrade { id: string; category: UpgradeCategory; name: string; price: number; unlockLevel: number; tier: number; description: string }
export const UPGRADES: GarageUpgrade[] = [
  { id: 'lift-2', category: 'lift', tier: 1, name: 'Segundo elevador', price: 2500, unlockLevel: 2, description: 'Añade un segundo elevador para trabajar más autos.' },
  { id: 'lift-3', category: 'lift', tier: 2, name: 'Tercer elevador', price: 6000, unlockLevel: 5, description: 'Añade un tercer elevador de alta capacidad.' },
  { id: 'light-1', category: 'lighting', tier: 1, name: 'Iluminación LED', price: 1200, unlockLevel: 2, description: 'Focos LED que iluminan mejor el taller.' },
  { id: 'light-2', category: 'lighting', tier: 2, name: 'Iluminación de neón', price: 3000, unlockLevel: 4, description: 'Ambiente de neón estilo show de autos.' },
  { id: 'floor-1', category: 'floor', tier: 1, name: 'Piso premium', price: 1500, unlockLevel: 2, description: 'Piso a cuadros de alto brillo.' },
  { id: 'cap-1', category: 'capacity', tier: 1, name: 'Ampliación de espacio I', price: 3500, unlockLevel: 2, description: 'Un espacio adicional para vehículos.' },
  { id: 'cap-2', category: 'capacity', tier: 2, name: 'Ampliación de espacio II', price: 9000, unlockLevel: 6, description: 'Dos espacios adicionales para vehículos.' },
];
export const upgradeById = (id: string) => UPGRADES.find((u) => u.id === id);
export const upgradesByCategory = (cat: UpgradeCategory) => UPGRADES.filter((u) => u.category === cat).sort((a, b) => a.tier - b.tier);
