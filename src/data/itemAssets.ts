// Sprites de accesorios (generados con tools/render_items.py). Si falta alguno, la UI usa un icono.
const urls = import.meta.glob('../assets/items/item_*.webp', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
export const itemUrl = (id: string, rot = 0): string | undefined => urls[`../assets/items/item_${id}_${rot}.webp`];
export const ITEM_KEYS = Object.keys(urls);
