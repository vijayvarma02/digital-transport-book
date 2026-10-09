import { useState, useEffect } from 'react';
import { getSupabaseClient } from '../lib/supabase';
import { loginWithPasscode, isRegisterSession } from '../services/authService';
export default function LoginGate({ children }) {
  const client = getSupabaseClient();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(Boolean(client));
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!client) return;
    let active = true;
    client.auth.getSession().then(({ data, error: err }) => { if (active) { setSession(isRegisterSession(data.session) ? data.session : null); setError(err?.message || ''); setLoading(false); } }).catch(() => { if (active) { setError('Could not restore your login.'); setLoading(false); } });
    const { data } = client.auth.onAuthStateChange((_event, next) => setSession(isRegisterSession(next) ? next : null));
    return () => { active = false; data.subscription.unsubscribe(); };
  }, [client]);
  if (!client) return <><div className="bg-amber-50 p-2 text-center text-xs">Local demo · Connect Supabase for protected login and private uploads.</div>{children}</>;
  if (loading) return <p className="p-8 text-center">Opening register...</p>;
  if (session) return <><div className="text-right bg-white px-4 py-2"><button className="text-sm font-semibold text-blue-700" onClick={async () => { const { error: err } = await client.auth.signOut(); if (err) setError(err.message); }}>Log out</button>{error && <p role="alert">{error}</p>}</div>{children}</>;
  return <main className="max-w-md mx-auto p-6 pt-20"><h1 className="text-2xl font-bold">Driver Records</h1><p className="mt-2 text-slate-600">Enter your passcode to open the register.</p>
    <form className="space-y-4 mt-6" onSubmit={async e => {
      e.preventDefault(); setBusy(true); setError('');
      try {
        await loginWithPasscode(passcode);
        setPasscode('');
      } catch (err) { setError(err.message); } finally { setBusy(false); }
    }}><label htmlFor="passcode" className="block font-semibold">Passcode</label><input id="passcode" type="password" autoComplete="current-password" required value={passcode} onChange={e => setPasscode(e.target.value)} className="w-full border-2 border-slate-300 rounded-xl p-3 text-xl" />{error && <p role="alert" className="text-red-700 text-sm">{error}</p>}<button disabled={busy} className="w-full rounded-xl p-3 font-bold bg-blue-700 text-white">{busy ? 'Logging in...' : 'Log in'}</button></form>
  </main>;
}
