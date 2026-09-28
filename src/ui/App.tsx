import { useEffect, useRef, useState } from 'react';
import { createGame } from '../game/createGame';
import { GaragePanel, InventoryPanel, ShopPanel } from './Panels';
import { Hud } from './Hud';

export type PanelId = 'garage' | 'shop' | 'inventory' | null;
const TITLES = { garage: 'Garaje', shop: 'Tienda', inventory: 'Inventario' } as const;

function GameCanvas() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { const g = createGame(ref.current!); return () => g.destroy(true); }, []);
  return <div id="game" ref={ref} />;
}

export default function App() {
  const [playing, setPlaying] = useState(false);
  const [panel, setPanel] = useState<PanelId>(null);
  if (!playing)
    return (
      <main className="start">
        <h1>Garage<span>Life</span></h1>
        <p>Compra, repara y personaliza carros en tu propio taller.</p>
        <button className="btn primary big" onClick={() => setPlaying(true)}>Abrir el taller</button>
      </main>
    );
  return (
    <>
      <GameCanvas />
      <Hud panel={panel} onPanel={setPanel} />
      {panel && (
        <aside className="sheet" role="dialog" aria-label={TITLES[panel]}>
          <header><h2>{TITLES[panel]}</h2><button className="btn" onClick={() => setPanel(null)} aria-label="Cerrar">✕</button></header>
          <div className="body">
            {panel === 'garage' && <GaragePanel />}
            {panel === 'shop' && <ShopPanel />}
            {panel === 'inventory' && <InventoryPanel />}
          </div>
        </aside>
      )}
    </>
  );
}
