// Perfil (username), amigos y garajes visitables, sobre Supabase. Todo está protegido con RLS (supabase/schema_social.sql).
import type { SaveData } from './save';
import { supabase } from './supabase';

export interface Profile { id: string; username: string; level: number }
export interface Friend { friendshipId: string; profile: Profile }
export interface Request { friendshipId: string; profile: Profile }
/** Copia reducida de la partida que ven los amigos: sin dinero ni historial. */
export interface PublicGarage {
  level: number;
  cars: { model: string; paint: string; rim: string; slot: number }[];
  slotsUnlocked: number;
  zones: string[];
  placed: NonNullable<SaveData['placed']>;
  style: NonNullable<SaveData['style']>;
}
export const toPublic = (s: SaveData): PublicGarage => ({
  level: s.level,
  cars: s.cars.map((c) => ({ model: c.model, paint: c.paint, rim: c.rim, slot: c.slot })),
  slotsUnlocked: s.slotsUnlocked, zones: s.zones ?? [], placed: s.placed ?? [], style: s.style ?? {},
});

export const USERNAME_RE = /^[A-Za-z0-9_]{3,16}$/;
export interface SocialState { me: Profile | null; loaded: boolean; friends: Friend[]; incoming: Request[]; outgoing: Request[]; busy: boolean; error: string | null }

class Social {
  private st: SocialState = { me: null, loaded: false, friends: [], incoming: [], outgoing: [], busy: false, error: null };
  private ls = new Set<() => void>();
  private uid: string | null = null;
  private pubTimer: number | undefined;
  private lastPub = '';
  subscribe = (f: () => void) => { this.ls.add(f); return () => { this.ls.delete(f); }; };
  getSnapshot = () => this.st;
  private set(p: Partial<SocialState>) { this.st = { ...this.st, ...p }; this.ls.forEach((l) => l()); }
  get enabled() { return !!supabase && !!this.uid; }

  /** Se llama al iniciar sesión (userId) o cerrar sesión (null). */
  async setUser(userId: string | null) {
    this.uid = userId; this.lastPub = '';
    this.set({ me: null, loaded: false, friends: [], incoming: [], outgoing: [], error: null });
    if (!userId || !supabase) return;
    const { data } = await supabase.from('profiles').select('id,username,level').eq('id', userId).maybeSingle();
    this.set({ me: (data as Profile | null) ?? null, loaded: true });
    if (data) void this.refresh();
  }

  private err(e: { message: string; code?: string } | null) {
    if (!e) return null;
    if (e.code === '23505') return 'Ese nombre o solicitud ya existe.';
    if (e.code === '42P01' || /relation .* does not exist|schema cache/i.test(e.message)) return 'Falta crear las tablas sociales en Supabase (supabase/schema_social.sql).';
    if (/fetch|network/i.test(e.message)) return 'Sin conexión. Revisa tu internet.';
    return e.message;
  }

  async setUsername(name: string, level: number): Promise<boolean> {
    if (!supabase || !this.uid) return false;
    const n = name.trim();
    if (!USERNAME_RE.test(n)) { this.set({ error: 'Usa 3 a 16 letras, números o _ (sin espacios).' }); return false; }
    this.set({ busy: true, error: null });
    const { error } = await supabase.from('profiles').upsert({ id: this.uid, username: n, level, updated_at: new Date().toISOString() });
    if (error) { this.set({ busy: false, error: error.code === '23505' ? 'Ese nombre ya está en uso. Prueba otro.' : this.err(error) }); return false; }
    this.set({ busy: false, me: { id: this.uid, username: n, level } });
    void this.refresh();
    return true;
  }

  async refresh() {
    if (!supabase || !this.uid) return;
    const { data, error } = await supabase.from('friendships').select('id,requester,addressee,status');
    if (error) { this.set({ error: this.err(error) }); return; }
    const rows = (data ?? []) as { id: string; requester: string; addressee: string; status: string }[];
    const ids = [...new Set(rows.flatMap((r) => [r.requester, r.addressee]).filter((i) => i !== this.uid))];
    const profs = new Map<string, Profile>();
    if (ids.length) {
      const { data: ps } = await supabase.from('profiles').select('id,username,level').in('id', ids);
      for (const p of (ps ?? []) as Profile[]) profs.set(p.id, p);
    }
    const other = (r: { requester: string; addressee: string }) => profs.get(r.requester === this.uid ? r.addressee : r.requester);
    const friends: Friend[] = [], incoming: Request[] = [], outgoing: Request[] = [];
    for (const r of rows) {
      const profile = other(r); if (!profile) continue;
      if (r.status === 'accepted') friends.push({ friendshipId: r.id, profile });
      else if (r.addressee === this.uid) incoming.push({ friendshipId: r.id, profile });
      else outgoing.push({ friendshipId: r.id, profile });
    }
    friends.sort((a, b) => a.profile.username.localeCompare(b.profile.username));
    this.set({ friends, incoming, outgoing, error: null });
  }

  /** Envía una solicitud por username. Si esa persona ya te la había enviado, queda aceptada. */
  async addFriend(name: string): Promise<string> {
    if (!supabase || !this.uid || !this.st.me) return 'Primero elige tu nombre de usuario.';
    const n = name.trim().replace(/^@/, '');
    if (!n) return '';
    const { data: p, error } = await supabase.from('profiles').select('id,username,level').ilike('username', n).maybeSingle();
    if (error) return this.err(error) ?? 'Error';
    if (!p) return 'No existe ningún jugador con ese nombre.';
    if (p.id === this.uid) return 'Ese eres tú 🙂';
    const inc = this.st.incoming.find((r) => r.profile.id === p.id);
    if (inc) { await this.respond(inc.friendshipId, true); return `¡Ahora eres amigo de ${p.username}!`; }
    if (this.st.friends.some((f) => f.profile.id === p.id)) return `Ya eres amigo de ${p.username}.`;
    if (this.st.outgoing.some((r) => r.profile.id === p.id)) return 'Ya le enviaste una solicitud.';
    const { error: e2 } = await supabase.from('friendships').insert({ requester: this.uid, addressee: p.id });
    if (e2) return this.err(e2) ?? 'Error';
    await this.refresh();
    return `Solicitud enviada a ${p.username}.`;
  }
  async respond(friendshipId: string, accept: boolean) {
    if (!supabase) return;
    if (accept) await supabase.from('friendships').update({ status: 'accepted' }).eq('id', friendshipId);
    else await supabase.from('friendships').delete().eq('id', friendshipId);
    await this.refresh();
  }
  async remove(friendshipId: string) { if (supabase) { await supabase.from('friendships').delete().eq('id', friendshipId); await this.refresh(); } }

  async fetchGarage(userId: string): Promise<PublicGarage | null> {
    if (!supabase) return null;
    const { data } = await supabase.from('garages').select('data').eq('user_id', userId).maybeSingle();
    return (data?.data as PublicGarage | undefined) ?? null;
  }

  /** Publica (con pausa de 4 s) la copia reducida de la partida para que los amigos puedan visitarla. */
  publish(save: SaveData) {
    if (!supabase || !this.uid || !this.st.me) return;
    window.clearTimeout(this.pubTimer);
    this.pubTimer = window.setTimeout(async () => {
      const pub = toPublic(save); const sig = JSON.stringify(pub);
      if (sig === this.lastPub || !supabase || !this.uid) return;
      this.lastPub = sig;
      await supabase.from('garages').upsert({ user_id: this.uid, data: pub, updated_at: new Date().toISOString() });
      if (this.st.me && this.st.me.level !== save.level) { await supabase.from('profiles').update({ level: save.level }).eq('id', this.uid); this.set({ me: { ...this.st.me, level: save.level } }); }
    }, 4000);
  }
}
export const social = new Social();
