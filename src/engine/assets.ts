import bg from '../assets/garage_bg.png';
import { GARAGE_OFFSET } from '../data/config';
import lotA from '../assets/lot_a.webp';
import lotB from '../assets/lot_b.webp';
import streets from '../assets/streets.webp';
import eclBeauty from '../assets/ecl_beauty.png';
import eclMask from '../assets/ecl_mask.png';
import subBeauty from '../assets/sub_beauty.png';
import subMask from '../assets/sub_mask.png';
import supBeauty from '../assets/sup_beauty.png';
import supMask from '../assets/sup_mask.png';
import r34Beauty from '../assets/r34_beauty.png';
import r34Mask from '../assets/r34_mask.png';
import evoBeauty from '../assets/evo_beauty.png';
import evoMask from '../assets/evo_mask.png';
import info from '../assets/info.json';
import type { SpriteKey } from '../data/vehicles';

export const SPRITE_KEYS: SpriteKey[] = ['ecl', 'sub', 'sup', 'r34', 'evo'];

export const ASSETS: { bg: string; lotA: string; lotB: string; streets: string } & Record<SpriteKey, { beauty: string; mask: string }> = {
  bg, lotA, lotB, streets,
  ecl: { beauty: eclBeauty, mask: eclMask },
  sub: { beauty: subBeauty, mask: subMask },
  sup: { beauty: supBeauty, mask: supMask },
  r34: { beauty: r34Beauty, mask: r34Mask },
  evo: { beauty: evoBeauty, mask: evoMask },
};
export const PROJ = info.proj as { origin: number[]; x: number[]; y: number[]; z: number[] };
export const SPRITE_INFO = Object.fromEntries(
  SPRITE_KEYS.map((k) => [k, (info as unknown as Record<string, { box: number[]; anchorWorld: number[] }>)[k]]),
) as Record<SpriteKey, { box: number[]; anchorWorld: number[] }>;

/**
 * Escala de cada sprite para igualar el tamaño en pantalla del Falcon GT (Eclipse), medido con el área
 * de la máscara alpha. Los autos nuevos ya se renderizan a este tamaño (tools/render_new_cars.py);
 * el Kobalt (Subaru) salió 6% más grande y se reduce aquí desde el piso.
 */
export const SPRITE_SCALE: Record<SpriteKey, number> = { ecl: 1, sub: 0.939, sup: 1, r34: 1, evo: 1 };

/**
 * El fondo (garage_bg.png) se renderiza con margen extra alrededor del encuadre original 1920x1080
 * (tools/render_bg.py) para que no se recorten vigas y paredes. Se dibuja en (x, y) negativos, así las
 * coordenadas de proyección y de los sprites de los autos no cambian.
 */
/** Rectángulo (px de mundo) del fondo del garaje, ya desplazado a su nuevo lugar (GARAGE_OFFSET). */
export const BG = { x: -116 + GARAGE_OFFSET[1] * 46.1048 + GARAGE_OFFSET[0] * 59.5278, y: -240 + GARAGE_OFFSET[1] * -27.5958 + GARAGE_OFFSET[0] * 21.3732, w: 2094, h: 1320 };

/**
 * Capas del lote (tools/render_lot.py, misma cámara que el garaje: los píxeles coinciden). Rectángulos en px de mundo.
 * LOT (en dos mitades de 2420 px: las GPU de moviles antiguos limitan las texturas a 4096 px) = suelo de las 6 zonas del GL_CARTOWN_GARAGE_V8 + muros (se dibuja bajo garage_bg.png).
 * STREETS = calles y aceras GL_GARAGE_STREETS_V11, renderizadas a la mitad de resolución (scale 2).
 */
export const LOT = { x: -1490, y: -930, w: 4840, h: 2660 };
export const STREETS = { x: -2440, y: -950, w: 6750, h: 3120, scale: 2 };
