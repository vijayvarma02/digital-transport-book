import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Trash2, X } from 'lucide-react';

export default function DeleteDriverConfirmation({ driverName, busy, error, onCancel, onConfirm }) {
  const [confirmation, setConfirmation] = useState('');
  const dialog = useRef(null);
  const input = useRef(null);
  const busyRef = useRef(busy);
  useEffect(() => { busyRef.current = busy; }, [busy]);
  const canDelete = confirmation.trim().toLowerCase() === 'delete';
  useEffect(() => {
    const previousFocus = document.activeElement;
    input.current?.focus();
    const onKey = event => {
      if (event.key === 'Escape') { event.preventDefault(); if (!busyRef.current) onCancel(); }
      if (event.key !== 'Tab') return;
      const buttons = [...dialog.current.querySelectorAll('button:not(:disabled), input:not(:disabled)')];
      if (!buttons.length) { event.preventDefault(); return; }
      const first = buttons[0], last = buttons[buttons.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('keydown', onKey); previousFocus?.focus(); };
  }, [onCancel]);

  return createPortal(<div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs" onClick={() => { if (!busy) onCancel(); }}>
    <div ref={dialog} role="alertdialog" aria-modal="true" aria-labelledby="delete-driver-title" aria-describedby="delete-driver-description" aria-busy={busy} className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl" onClick={event => event.stopPropagation()}>
      <div className="mb-4 flex items-center justify-between"><span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600"><Trash2 size={24} /></span><button type="button" disabled={busy} onClick={onCancel} aria-label="Close delete confirmation" className="flex min-h-11 min-w-11 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 disabled:opacity-40"><X size={22} /></button></div>
      <h2 id="delete-driver-title" className="break-words text-xl font-extrabold text-slate-900">Delete {driverName}?</h2>
      <p id="delete-driver-description" className="mt-2 text-sm leading-relaxed text-slate-600">This permanently deletes this driver’s profile, all daily and pending amount records, and uploaded photos and documents. This cannot be undone.</p>
      <form className="mt-5 space-y-4" onSubmit={event => { event.preventDefault(); if (canDelete && !busy) onConfirm(); }}>
        <div><label htmlFor="delete-driver-input" className="mb-2 block text-sm font-semibold text-slate-700">Type <span className="font-extrabold text-red-600">DELETE</span> to confirm</label><input ref={input} id="delete-driver-input" type="text" autoComplete="off" autoCorrect="off" spellCheck={false} disabled={busy} value={confirmation} onChange={event => setConfirmation(event.target.value)} className="w-full rounded-xl border-2 border-slate-200 px-3 py-3 text-base font-semibold outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100 disabled:opacity-50" /></div>
        {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm leading-relaxed text-red-700">{error}</p>}
        <div className="flex gap-3"><button type="button" disabled={busy} onClick={onCancel} className="min-h-12 flex-1 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50">Cancel</button><button type="submit" disabled={!canDelete || busy} className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-red-600 text-sm font-bold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"><Trash2 size={16} />{busy ? 'Deleting…' : 'Delete driver'}</button></div>
      </form>
    </div>
  </div>, document.body);
}
