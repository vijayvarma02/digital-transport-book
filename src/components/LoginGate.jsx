import { useState, useEffect } from 'react';
import { getSupabaseClient } from '../lib/supabase';
import { loginWithPasscode, isRegisterSession } from '../services/authService';
import { Download } from 'lucide-react';

function useInstallPrompt() {
  const [prompt, setPrompt] = useState(null);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    // Already installed in standalone mode — nothing to show.
    if (window.matchMedia('(display-mode: standalone)').matches) return;
    if (window.navigator.standalone === true) return;

    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) && !/crios/i.test(navigator.userAgent);
    const safari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    if (ios && safari) { setIsIos(true); return; }

    const handler = e => { e.preventDefault(); setPrompt(e); };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const install = async () => {
    if (!prompt) return;
    prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === 'accepted') setPrompt(null);
  };

  return { prompt, isIos, install };
}

export default function LoginGate({ children }) {
  const client = getSupabaseClient();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(Boolean(client));
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [showIosHint, setShowIosHint] = useState(false);
  const { prompt, isIos, install } = useInstallPrompt();
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

    {/* Install App button — shown on Android/Chrome or iOS Safari */}
    {prompt && (
      <div className="mt-8 border-t border-slate-200 pt-6">
        <button
          type="button"
          onClick={install}
          className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-blue-700 p-3 font-bold text-blue-700 hover:bg-blue-50"
        >
          <Download size={18} />
          Install ARF Travels App
        </button>
        <p className="mt-2 text-center text-xs text-slate-500">Add to your home screen for quick access</p>
      </div>
    )}

    {isIos && (
      <div className="mt-8 border-t border-slate-200 pt-6">
        {!showIosHint ? (
          <button
            type="button"
            onClick={() => setShowIosHint(true)}
            className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-blue-700 p-3 font-bold text-blue-700 hover:bg-blue-50"
          >
            <Download size={18} />
            Install ARF Travels App
          </button>
        ) : (
          <div className="rounded-xl bg-blue-50 border border-blue-200 p-4 text-sm text-blue-900">
            <p className="font-semibold mb-1">Add to Home Screen</p>
            <p>Tap the <strong>Share</strong> button <span aria-label="share">⎙</span> at the bottom of Safari, then tap <strong>Add to Home Screen</strong>.</p>
            <button type="button" onClick={() => setShowIosHint(false)} className="mt-3 text-xs text-blue-500 underline">Got it</button>
          </div>
        )}
        <p className="mt-2 text-center text-xs text-slate-500">Add to your home screen for quick access</p>
      </div>
    )}
  </main>;
}
