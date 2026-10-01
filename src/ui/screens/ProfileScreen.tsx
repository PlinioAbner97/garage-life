import { reputationTierName } from '../../data/clientArchetypes';
import { fmtMoney, levelFromXp } from '../../core/economy';
import { useGame } from '../../core/store';
import { vehicleById } from '../../data/vehicles';

// Vista previa LOCAL del perfil del jugador — es una función de demostración, no un perfil
// público real. Las funciones sociales (amigos, visitar talleres, comparar colecciones)
// llegarán en una futura actualización con cuentas de Supabase.
export function ProfileScreen() {
  const s = useGame();
  return (
    <>
      <p className="hint">Vista previa local de tu taller — todavía no es un perfil público. Las funciones sociales (amigos, visitas, comparar colecciones) llegarán con cuentas en línea.</p>
      <h3>Nivel {levelFromXp(s.xp)} · {reputationTierName(s.reputation)}</h3>
      <div className="stat-row">
        <span>{fmtMoney(s.money)}</span>
        <span>{s.cars.length} vehículo(s)</span>
        <span>{s.jobHistory.length} trabajo(s) entregado(s)</span>
        <span>{s.visitedZoneIds.length} zona(s) exploradas</span>
      </div>
      <h4>Colección</h4>
      <ul className="rows">
        {s.cars.map((c) => <li key={c.uid}><span className="grow">{vehicleById(c.modelId).brand} {vehicleById(c.modelId).name}</span></li>)}
      </ul>
    </>
  );
}
