export interface OwnedCar { id: string; model: string; paint: string; rim: string; slot: number }
export interface ActiveJob { jobId: string; endsAt: number; done: boolean }
export interface SaveData {
  v: 1;
  money: number;
  xp: number;
  level: number;
  cars: OwnedCar[];
  slotsUnlocked: number;
  nextCarId: number;
  jobs: Record<string, ActiveJob>;
  totalEarned: number;
  jobsDone: number;
  tutorialDone: boolean;
}

/**
 * Interfaz de persistencia. Hoy: localStorage. Mañana: SupabaseSaveStore con la misma interfaz
 * (load/save asíncronos para que cambiar de backend no toque el resto del juego).
 */
export interface SaveStore {
  load(): Promise<SaveData | null>;
  save(data: SaveData): Promise<void>;
  clear(): Promise<void>;
}

const KEY = 'garage-life-save-v1';

export class LocalSaveStore implements SaveStore {
  async load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return null;
      const d = JSON.parse(raw) as SaveData;
      return d && d.v === 1 ? d : null;
    } catch { return null; }
  }
  async save(data: SaveData) {
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch { /* cuota/privado: se ignora */ }
  }
  async clear() { try { localStorage.removeItem(KEY); } catch { /* */ } }
}
