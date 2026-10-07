import { useSyncExternalStore } from 'react';
import { store } from '../core/store';

export const useGame = () => useSyncExternalStore(store.subscribe, store.getSnapshot);
export const fmt = (n: number) => n.toLocaleString('es');
export const fmtTime = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return s >= 60 ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` : `${s}s`;
};
