/** Densidad de píxeles del dispositivo (máx. 3): el canvas se renderiza a resolución nativa para que no se vea borroso en celulares. */
export const dpr = () => Math.min(3, Math.max(1, window.devicePixelRatio || 1));
/** Resolución de las texturas de texto: alta para que sigan nítidas al hacer zoom. */
export const TEXT_RES = Math.min(4, Math.ceil(dpr() * 2));
