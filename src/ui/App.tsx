import { useEffect, useRef } from 'react';
import { createGame } from '../engine/game';
import { auth } from '../core/auth';
import { useGame } from './hooks';
import { StartScreen } from './StartScreen';
import { Hud } from './Hud';
import { Panels } from './Panels';

export function App() {
  const host = useRef<HTMLDivElement>(null);
  const { ui } = useGame();

  useEffect(() => {
    void auth.init();
    const game = createGame(host.current!);
    return () => game.destroy(true);
  }, []);

  return (
    <div className="app">
      <div ref={host} className="stage" />
      {ui.screen === 'start' ? <StartScreen /> : (<><Hud /><Panels /></>)}
      <div className="toasts" aria-live="polite">
        {ui.toasts.map((t) => <div key={t.id} className={`toast ${t.kind}`}>{t.text}</div>)}
      </div>
    </div>
  );
}
