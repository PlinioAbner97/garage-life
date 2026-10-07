export interface ColorPart { id: string; name: string; hex: string | null; price: number; minLevel: number }

/** hex null = color de fábrica (sin recolorear el render original) */
export const PAINTS: ColorPart[] = [
  { id: 'stock', name: 'De fábrica', hex: null, price: 0, minLevel: 1 },
  { id: 'white', name: 'Blanco perla', hex: '#f1f3f6', price: 250, minLevel: 1 },
  { id: 'black', name: 'Negro obsidiana', hex: '#15171c', price: 250, minLevel: 1 },
  { id: 'silver', name: 'Plata metálica', hex: '#b4bac4', price: 300, minLevel: 1 },
  { id: 'red', name: 'Rojo carrera', hex: '#d3202a', price: 350, minLevel: 1 },
  { id: 'orange', name: 'Naranja sunset', hex: '#ff7a1a', price: 450, minLevel: 2 },
  { id: 'yellow', name: 'Amarillo neón', hex: '#ffd21a', price: 450, minLevel: 2 },
  { id: 'lime', name: 'Lima ácido', hex: '#8fe014', price: 600, minLevel: 3 },
  { id: 'teal', name: 'Turquesa', hex: '#12b8a6', price: 600, minLevel: 3 },
  { id: 'blue', name: 'Azul cobalto', hex: '#1d57d8', price: 600, minLevel: 3 },
  { id: 'purple', name: 'Violeta noche', hex: '#6b2bd1', price: 900, minLevel: 5 },
  { id: 'pink', name: 'Rosa chicle', hex: '#ff4fa3', price: 900, minLevel: 5 },
  { id: 'gunmetal', name: 'Gris grafito', hex: '#4a515c', price: 700, minLevel: 4 },
];

export const RIMS: ColorPart[] = [
  { id: 'stock', name: 'De fábrica', hex: null, price: 0, minLevel: 1 },
  { id: 'chrome', name: 'Cromo', hex: '#d9dde3', price: 200, minLevel: 1 },
  { id: 'black', name: 'Negro mate', hex: '#1c1d21', price: 200, minLevel: 1 },
  { id: 'gold', name: 'Oro', hex: '#e0a528', price: 350, minLevel: 2 },
  { id: 'red', name: 'Rojo', hex: '#d3202a', price: 350, minLevel: 2 },
  { id: 'blue', name: 'Azul', hex: '#2a6bff', price: 350, minLevel: 3 },
  { id: 'bronze', name: 'Bronce', hex: '#9a6a3a', price: 450, minLevel: 4 },
  { id: 'lime', name: 'Lima', hex: '#8fe014', price: 500, minLevel: 5 },
];

export const findPaint = (id: string) => PAINTS.find((p) => p.id === id) ?? PAINTS[0];
export const findRim = (id: string) => RIMS.find((p) => p.id === id) ?? RIMS[0];
