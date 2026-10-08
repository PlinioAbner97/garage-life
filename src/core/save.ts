import type { SupabaseClient } from '@supabase/supabase-js';

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
  /** marca de tiempo del último guardado (para elegir entre copia local y nube) */
  savedAt?: number;
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

/** Guardado en la nube (Supabase) por jugador, con copia local por si no hay conexión. */
export class CloudSaveStore implements SaveStore {
  private cacheKey: string;
  constructor(private db: SupabaseClient, private userId: string) { this.cacheKey = `garage-life-cache-${userId}`; }
  private readCache(): SaveData | null {
    try { const d = JSON.parse(localStorage.getItem(this.cacheKey) || 'null') as SaveData | null; return d && d.v === 1 ? d : null; } catch { return null; }
  }
  async load() {
    const cache = this.readCache();
    const { data, error } = await this.db.from('saves').select('data').eq('user_id', this.userId).maybeSingle();
    if (error) return cache; // sin conexión: usa la copia local
    const remote = (data?.data ?? null) as SaveData | null;
    if (!remote || remote.v !== 1) return cache;
    return cache && (cache.savedAt ?? 0) > (remote.savedAt ?? 0) ? cache : remote;
  }
  async save(d: SaveData) {
    const stamped = { ...d, savedAt: Date.now() };
    try { localStorage.setItem(this.cacheKey, JSON.stringify(stamped)); } catch { /* */ }
    await this.db.from('saves').upsert({ user_id: this.userId, data: stamped, updated_at: new Date().toISOString() });
  }
  async clear() {
    try { localStorage.removeItem(this.cacheKey); } catch { /* */ }
    await this.db.from('saves').delete().eq('user_id', this.userId);
  }
}
