import { useEffect, useRef, useState } from 'react';
import { createGame } from '../game/createGame';
import { bus } from '../game/bus';
import { Hud } from './Hud';
import { CollectionScreen } from './screens/CollectionScreen';
import { CustomizeScreen } from './screens/CustomizeScreen';
import { InventoryScreen } from './screens/InventoryScreen';
import { JobsScreen } from './screens/JobsScreen';
import { WorkshopScreen } from './screens/WorkshopScreen';

export type PanelId = 'garage' | 'collection' | 'inventory' | 'workshop' | 'jobs' | null;
const TITLES: Record<Exclude<PanelId, null>, string> = {
  garage: 'Personalización', collection: 'Colección', inventory: 'Inventario', workshop: 'Mejoras del taller', jobs: 'Clientes y trabajos',
};

function GameCanvas() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { const g = createGame(ref.current!); return () => g.destroy(true); }, []);
  return <div id="game" ref={ref} />;
}

export default function App() {
  const [playing, setPlaying] = useState(false);
  const [panel, setPanel] = useState<PanelId>(null);

  useEffect(() => {
    const open = (id: PanelId) => setPanel(id);
    bus.on('open-panel', open);
    return () => { bus.off('open-panel', open); };
  }, []);

  if (!playing)
    return (
      <main className="start">
        <h1>Garage<span>Life</span></h1>
        <p>Colecciona, personaliza y haz crecer tu propio taller JDM.</p>
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
            {panel === 'garage' && <CustomizeScreen />}
            {panel === 'collection' && <CollectionScreen />}
            {panel === 'inventory' && <InventoryScreen />}
            {panel === 'workshop' && <WorkshopScreen />}
            {panel === 'jobs' && <JobsScreen />}
          </div>
        </aside>
      )}
    </>
  );
}
