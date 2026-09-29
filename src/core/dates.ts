// Claves de fecha estables basadas en el reloj del dispositivo (no en la sesión),
// para que las misiones no se reinicien incorrectamente al cerrar el navegador.
export function todayKey(d = new Date()): string {
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}
export function weekKey(d = new Date()): string {
  const epochDays = Math.floor(d.getTime() / 86400000);
  const week = Math.floor((epochDays + 4) / 7); // agrupación semanal estable, no ISO estricto
  return 'W' + week;
}
