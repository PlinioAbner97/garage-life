import { useEffect, useRef, useState } from 'react';
import { createGame } from '../game/createGame';
import { bus } from '../game/bus';
import { zoneById } from '../data/zones';
import { Hud } from './Hud';
import { CollectionScreen } from './screens/CollectionScreen';
import { CustomizeScreen } from './screens/CustomizeScreen';
import { DealershipScreen } from './screens/DealershipScreen';
import { InventoryScreen } from './screens/InventoryScreen';
import { JobsScreen } from './screens/JobsScreen';
import { MeetupsScreen } from './screens/MeetupsScreen';
import { PartsShopScreen } from './screens/PartsShopScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { RacingDistrictScreen } from './screens/RacingDistrictScreen';
import { UsedMarketScreen } from './screens/UsedMarketScreen';
import { WorkshopScreen } from './screens/WorkshopScreen';
import { ZoneLockedScreen } from './screens/ZoneLockedScreen';

// Los paneles del taller usan ids fijos; los de la ciudad usan el id de la zona
// (definido en data/zones.ts), y una zona bloqueada usa el prefijo "zone-locked:".
export type PanelId = string | null;

const FIXED_TITLES: Record<string, string> = {
  garage: 'Personalización', collection: 'Colección', inventory: 'Inventario',
  workshop: 'Mejoras del taller', jobs: 'Clientes y trabajos', profile: 'Mi perfil (vista local)',
};

function panelTitle(panel: string): string {
  if (panel.startsWith('zone-locked:')) {
    const zone = zoneById(panel.slice('zone-locked:'.length));
    return zone ? `${zone.name} (bloqueada)` : 'Zona bloqueada';
  }
  const zone = zoneById(panel);
  return FIXED_TITLES[panel] ?? zone?.name ?? 'Garage Life';
}

function panelBody(panel: string) {
  if (panel.startsWith('zone-locked:')) return <ZoneLockedScreen zoneId={panel.slice('zone-locked:'.length)} />;
  switch (panel) {
    case 'garage': return <CustomizeScreen />;
    case 'collection': return <CollectionScreen />;
    case 'inventory': return <InventoryScreen />;
    case 'workshop': return <WorkshopScreen />;
    case 'jobs': return <JobsScreen />;
    case 'profile': return <ProfileScreen />;
    case 'dealer-jdm': return <DealershipScreen category="jdm" />;
    case 'dealer-classic': return <DealershipScreen category="classic" />;
    case 'dealer-performance': return <DealershipScreen category="performance" />;
    case 'used-market': return <UsedMarketScreen />;
    case 'parts-shop': return <PartsShopScreen />;
    case 'racing-district': return <RacingDistrictScreen />;
    case 'meetups': return <MeetupsScreen />;
    default: return null;
  }
}

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
        <p>Colecciona, personaliza y explora una ciudad automotriz entera.</p>
        <button className="btn primary big" onClick={() => setPlaying(true)}>Abrir el taller</button>
      </main>
    );

  return (
    <>
      <GameCanvas />
      <Hud panel={panel} onPanel={setPanel} />
      {panel && (
        <aside className="sheet" role="dialog" aria-label={panelTitle(panel)}>
          <header><h2>{panelTitle(panel)}</h2><button className="btn" onClick={() => setPanel(null)} aria-label="Cerrar">✕</button></header>
          <div className="body">{panelBody(panel)}</div>
        </aside>
      )}
    </>
  );
}
