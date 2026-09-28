import type { GameState } from './types';
// Contrato de persistencia. Hoy: localStorage. Mañana: implementar SupabaseSave con la misma interfaz.
export interface SaveRepository {
  load(): Promise<GameState | null>;
  save(state: GameState): Promise<void>;
}
const KEY = 'garage-life:save:v1';
export const localSave: SaveRepository = {
  async load() {
    try { const raw = localStorage.getItem(KEY); return raw ? (JSON.parse(raw) as GameState) : null; } catch { return null; }
  },
  async save(state) {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* almacenamiento lleno o bloqueado */ }
  },
};
