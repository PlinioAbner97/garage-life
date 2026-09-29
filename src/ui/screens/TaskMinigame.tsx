import { useEffect, useRef, useState } from 'react';

// Minijuego simple: el jugador debe pulsar cuando el marcador está en la zona central.
// Sirve como validación real de la tarea (perfect/ok/miss), no un botón decorativo.
export function TaskMinigame({ onResult, onSkip }: { onResult: (q: 'perfect' | 'ok' | 'miss') => void; onSkip: () => void }) {
  const [pos, setPos] = useState(0);
  const dirRef = useRef(1);
  const rafRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    let last = performance.now();
    const loop = (t: number) => {
      const dt = t - last; last = t;
      setPos((p) => {
        let np = p + (dirRef.current * dt) / 900;
        if (np >= 1) { np = 1; dirRef.current = -1; }
        if (np <= 0) { np = 0; dirRef.current = 1; }
        return np;
      });
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, []);

  const hit = () => {
    const dist = Math.abs(pos - 0.5);
    onResult(dist < 0.08 ? 'perfect' : dist < 0.22 ? 'ok' : 'miss');
  };

  return (
    <div className="minigame">
      <div className="minigame-track">
        <div className="minigame-target" />
        <div className="minigame-marker" style={{ left: `${pos * 100}%` }} />
      </div>
      <div className="minigame-actions">
        <button className="btn primary" onClick={hit}>¡Ajustar ahora!</button>
        <button className="btn" onClick={onSkip}>Finalizar sin minijuego</button>
      </div>
    </div>
  );
}
