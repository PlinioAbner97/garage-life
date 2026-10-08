import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { store } from './store';
import { CloudSaveStore, LocalSaveStore } from './save';

export interface AuthState {
  /** hay Supabase configurado */
  enabled: boolean;
  /** ya se resolvió la sesión inicial */
  ready: boolean;
  email: string | null;
  /** el jugador eligió jugar sin cuenta */
  guest: boolean;
  busy: boolean;
  error: string | null;
  info: string | null;
}

const local = new LocalSaveStore();
const msg = (m: string) => {
  const s = m.toLowerCase();
  if (s.includes('invalid login')) return 'Correo o contraseña incorrectos.';
  if (s.includes('already registered')) return 'Ese correo ya tiene cuenta. Inicia sesión.';
  if (s.includes('password should be')) return 'La contraseña debe tener al menos 6 caracteres.';
  if (s.includes('valid email') || s.includes('invalid email')) return 'Escribe un correo válido.';
  if (s.includes('rate limit')) return 'Demasiados intentos. Espera un momento.';
  if (s.includes('fetch')) return 'Sin conexión. Revisa tu internet.';
  return m;
};

class Auth {
  private st: AuthState = { enabled: !!supabase, ready: false, email: null, guest: false, busy: false, error: null, info: null };
  private ls = new Set<() => void>();
  private userId: string | null = null;
  subscribe = (f: () => void) => { this.ls.add(f); return () => { this.ls.delete(f); }; };
  getSnapshot = () => this.st;
  private set(p: Partial<AuthState>) { this.st = { ...this.st, ...p }; this.ls.forEach((l) => l()); }

  async init() {
    if (!supabase) { await store.useBackend(local); this.set({ ready: true, guest: true }); return; }
    const { data } = await supabase.auth.getSession();
    if (data.session) await this.enter(data.session);
    this.set({ ready: true });
    supabase.auth.onAuthStateChange((ev, s) => {
      if (ev === 'SIGNED_OUT' && this.userId) { this.userId = null; this.set({ email: null }); }
      else if (ev === 'SIGNED_IN' && s && s.user.id !== this.userId) void this.enter(s);
    });
  }
  private async enter(s: Session) {
    if (!supabase || this.userId === s.user.id) return;
    this.userId = s.user.id;
    this.set({ email: s.user.email ?? null, guest: false, error: null, info: null });
    await store.useBackend(new CloudSaveStore(supabase, s.user.id), local);
  }

  async signIn(email: string, password: string) {
    if (!supabase) return;
    this.set({ busy: true, error: null, info: null });
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    this.set({ busy: false, error: error ? msg(error.message) : null });
  }
  async signUp(email: string, password: string) {
    if (!supabase) return;
    this.set({ busy: true, error: null, info: null });
    const { data, error } = await supabase.auth.signUp({ email: email.trim(), password });
    if (error) { this.set({ busy: false, error: msg(error.message) }); return; }
    if (!data.session) this.set({ busy: false, info: 'Te enviamos un correo para confirmar tu cuenta. Confírmalo y luego inicia sesión.' });
    else this.set({ busy: false });
  }
  async playGuest() { this.set({ guest: true, error: null, info: null }); await store.useBackend(local); }
  async signOut() {
    store.flush();
    if (supabase) await supabase.auth.signOut();
    this.userId = null; this.set({ email: null, guest: false });
    await store.useBackend(local); // vacía el estado en memoria; la pantalla de inicio pedirá cuenta de nuevo
    store.hasSave = false;
  }
}
export const auth = new Auth();
