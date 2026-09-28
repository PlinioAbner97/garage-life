import { activeCar, useGame } from '../../core/store';
import { CATEGORY_LABEL, partsByCategory, type PartCategory } from '../../data/parts';
import { hex } from '../../data/util';

const CATS: PartCategory[] = ['paint', 'rims', 'suspension', 'front', 'skirt', 'spoiler', 'hood', 'tint', 'stripe', 'exhaust', 'engine'];

export function InventoryScreen() {
  const s = useGame();
  const car = activeCar();
  return (
    <>
      {CATS.map((cat) => {
        const owned = partsByCategory(cat).filter((p) => s.ownedPartIds.includes(p.id));
        if (!owned.length) return null;
        return (
          <div key={cat}>
            <h4>{CATEGORY_LABEL[cat]}</h4>
            <ul className="rows">
              {owned.map((p) => (
                <li key={p.id}>
                  {p.color !== undefined && <span className="sw static" style={{ background: hex(p.color) }} />}
                  <span className="grow">{p.name}</span>
                  {(car.build as unknown as Record<string, string>)[cat] === p.id ? <em>Instalado</em> : <span className="muted">En inventario</span>}
                </li>
              ))}
            </ul>
          </div>
        );
      })}
      <p className="hint">Compra piezas desde la pestaña Garaje para ampliar tu inventario y equípalas en cualquier momento.</p>
    </>
  );
}
