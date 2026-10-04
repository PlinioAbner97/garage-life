// Registro de sprites 3D-renderizados disponibles (prototipo). Modelos sin entrada aquí
// siguen usando el arte vectorial de render/car.ts — así podemos migrar auto por auto
// sin romper los que todavía no tienen sprite.
export const CAR_SPRITE_PAINTS: Record<string, string[]> = {
  'kaze-coupe': ['paint-red', 'paint-white', 'paint-blue', 'paint-green', 'paint-yellow', 'paint-orange', 'paint-purple', 'paint-black'],
};

export const hasSprite = (vehicleId: string, paintId: string) =>
  (CAR_SPRITE_PAINTS[vehicleId] ?? []).includes(paintId);

export const spriteKey = (vehicleId: string, paintId: string) => `car-${vehicleId}-${paintId}`;
export const spriteUrl = (vehicleId: string, paintId: string) => `assets/cars/${vehicleId}/${paintId}.png`;
