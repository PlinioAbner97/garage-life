import { store } from '../core/store';
import { useGame } from './hooks';

export function StartScreen() {
  const { ui } = useGame();
  return (
    <div className="start">
      <div className="start-card">
        <div className="logo">GARAGE<span>LIFE</span></div>
        <p className="sub">Tu taller. Tus autos. Tu estilo.</p>
        <div className="start-actions">
          {store.hasSave && <button className="btn primary big" disabled={!ui.loaded} onClick={() => store.startGame(false)}>▶ Continuar</button>}
          <button className={`btn big ${store.hasSave ? '' : 'primary'}`} disabled={!ui.loaded}
            onClick={() => { if (!store.hasSave || confirm('Esto borrará tu partida guardada. ¿Empezar de nuevo?')) store.startGame(true); }}>
            {store.hasSave ? '＋ Nueva partida' : '▶ Jugar'}
          </button>
        </div>
        <ul className="howto">
          <li>👆 Arrastra para mover la cámara, rueda o pellizco para zoom</li>
          <li>🔧 Haz trabajos para ganar dinero y XP</li>
          <li>🎨 Cambia pintura y rines de tus autos</li>
          <li>🛒 Compra autos y desbloquea más plazas</li>
        </ul>
      </div>
    </div>
  );
}
