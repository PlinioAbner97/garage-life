import { useState } from 'react';
import { store } from '../core/store';
import { auth } from '../core/auth';
import { useGame } from './hooks';
import { useAuth } from './useAuth';

function AuthForm() {
  const a = useAuth();
  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [email, setEmail] = useState(''); const [pass, setPass] = useState('');
  const submit = (e: React.FormEvent) => { e.preventDefault(); void (mode === 'in' ? auth.signIn(email, pass) : auth.signUp(email, pass)); };
  return (
    <form className="authform" onSubmit={submit}>
      <div className="tabs2">
        <button type="button" className={mode === 'in' ? 'on' : ''} onClick={() => setMode('in')}>Entrar</button>
        <button type="button" className={mode === 'up' ? 'on' : ''} onClick={() => setMode('up')}>Crear cuenta</button>
      </div>
      <input type="email" inputMode="email" autoComplete="email" placeholder="Correo" value={email} onChange={(e) => setEmail(e.target.value)} required />
      <input type="password" autoComplete={mode === 'in' ? 'current-password' : 'new-password'} placeholder="Contraseña (mín. 6)" minLength={6} value={pass} onChange={(e) => setPass(e.target.value)} required />
      {a.error && <p className="autherr">{a.error}</p>}
      {a.info && <p className="authinfo">{a.info}</p>}
      <button className="btn primary big" type="submit" disabled={a.busy}>{a.busy ? '…' : mode === 'in' ? '▶ Entrar' : '＋ Crear cuenta'}</button>
      <button className="btn ghost" type="button" onClick={() => void auth.playGuest()}>Jugar sin cuenta (solo este dispositivo)</button>
    </form>
  );
}

export function StartScreen() {
  const { ui } = useGame();
  const a = useAuth();
  const needAuth = a.enabled && !a.email && !a.guest;
  return (
    <div className="start">
      <div className="start-card">
        <div className="logo">GARAGE<span>LIFE</span></div>
        <p className="sub">Tu taller. Tus autos. Tu estilo.</p>
        {!a.ready ? <p className="muted">Cargando…</p> : needAuth ? <AuthForm /> : (
          <>
            {a.email && <p className="who">👤 {a.email}</p>}
            <div className="start-actions">
              {store.hasSave && <button className="btn primary big" disabled={!ui.loaded} onClick={() => store.startGame(false)}>▶ Continuar</button>}
              <button className={`btn big ${store.hasSave ? '' : 'primary'}`} disabled={!ui.loaded}
                onClick={() => { if (!store.hasSave || confirm('Esto borrará tu partida guardada. ¿Empezar de nuevo?')) store.startGame(true); }}>
                {store.hasSave ? '＋ Nueva partida' : '▶ Jugar'}
              </button>
              {a.enabled && <button className="btn ghost" onClick={() => void auth.signOut()}>{a.email ? 'Cerrar sesión' : 'Entrar con una cuenta'}</button>}
            </div>
            <ul className="howto">
              <li>👆 Arrastra para mover la cámara, rueda o pellizco para zoom</li>
              <li>🔧 Haz trabajos para ganar dinero y XP</li>
              <li>🎨 Cambia pintura y rines de tus autos</li>
              <li>🛒 Compra autos y desbloquea más plazas</li>
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
