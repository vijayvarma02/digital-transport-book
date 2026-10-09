import { useEffect, useRef, useState } from 'react';
import { Camera, CreditCard, FileCheck2, ImagePlus, ShieldCheck, Trash2, Upload, X, ZoomIn } from 'lucide-react';
import { fileUrl, uploadDriverFiles, removeDriverFile, validateDriverImages } from '../services/fileService';

const sections = [
  { field: 'profile_photo', label: 'Profile picture', hint: 'A clear photo of the driver', Icon: Camera },
  { field: 'aadhaar_photos', label: 'Aadhaar card', hint: 'Add front and back photos', Icon: CreditCard },
  { field: 'license_photos', label: 'Driving licence', hint: 'Add front and back photos', Icon: FileCheck2 },
];

function SavedPhoto({ path, label, portrait, disabled, onPreview, onRemove }) {
  const [url, setUrl] = useState(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    const refresh = async () => {
      try { const next = await fileUrl(path); if (active) { setUrl(next); setFailed(!next); } }
      catch { if (active) setFailed(true); }
    };
    refresh();
    const timer = setInterval(refresh, 240000);
    return () => { active = false; clearInterval(timer); };
  }, [path]);
  return <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
    <button type="button" disabled={!url || failed || disabled} onClick={() => onPreview({ path, label })} className="relative flex aspect-[4/3] w-full items-center justify-center bg-slate-50" aria-label={`Enlarge ${label}`}>
      {url && !failed ? <><img src={url} alt={label} onError={() => setFailed(true)} className={`h-full w-full ${portrait ? 'object-cover' : 'object-contain p-2'}`} /><span className="absolute bottom-2 right-2 rounded-full bg-slate-900/70 p-1.5 text-white"><ZoomIn size={15} /></span></> : <span className="p-3 text-xs text-slate-500">{failed ? 'Preview unavailable' : 'Loading photo…'}</span>}
    </button>
    <div className="flex items-center justify-between gap-1 px-2 py-1.5"><span className="truncate text-xs font-medium text-slate-600">{label}</span><button type="button" disabled={disabled} onClick={onRemove} className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-40" aria-label={`Remove ${label}`}><Trash2 size={16} /></button></div>
  </div>;
}

export default function DriverFiles({ driver, onUpdated, onBusyChange, disabled = false }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [pending, setPending] = useState({});
  const [preview, setPreview] = useState(null);
  const objectUrls = useRef(new Set());
  const viewerClose = useRef(null);
  const previousFocus = useRef(null);
  const locked = busy || disabled;

  useEffect(() => {
    const urls = objectUrls.current;
    return () => { urls.forEach(url => URL.revokeObjectURL(url)); urls.clear(); };
  }, []);
  useEffect(() => {
    if (!preview) return;
    previousFocus.current = document.activeElement;
    viewerClose.current?.focus();
    const onKey = event => {
      if (event.key === 'Escape') { event.stopPropagation(); setPreview(null); }
      if (event.key === 'Tab') { event.preventDefault(); viewerClose.current?.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('keydown', onKey); previousFocus.current?.focus(); };
  }, [preview]);
  const release = items => items.forEach(item => { URL.revokeObjectURL(item.url); objectUrls.current.delete(item.url); });
  const clearSelection = field => { release(pending[field] || []); setPending(previous => ({ ...previous, [field]: [] })); };
  async function run(action) {
    setBusy(true); onBusyChange?.(true); setError(''); setNotice('');
    try { await action(); } catch (err) { setError(err.message || 'Could not update photos. Please try again.'); }
    finally { setBusy(false); onBusyChange?.(false); }
  }
  function selectFiles(field, files) {
    if (!files.length) return;
    setError(''); setNotice('');
    try {
      validateDriverImages(files);
      const items = (field === 'profile_photo' ? files.slice(0, 1) : files).map(file => {
        const url = URL.createObjectURL(file); objectUrls.current.add(url);
        return { file, url, id: crypto.randomUUID() };
      });
      if (field === 'profile_photo') release(pending[field] || []);
      setPending(previous => ({ ...previous, [field]: field === 'profile_photo' ? items : [...(previous[field] || []), ...items] }));
    } catch (err) { setError(err.message); }
  }

  return <section className="space-y-4">
    <div className="flex items-center justify-between gap-2"><h4 className="text-base font-bold text-slate-900">Photos & documents</h4><span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700"><ShieldCheck size={13} />Private</span></div>
    <p className="text-xs leading-relaxed text-slate-500">Choose photos, check the preview, then upload. JPG, PNG or WebP · Up to 5 MB each.</p>
    {sections.map(({ field, label, hint, Icon }) => {
      const paths = field === 'profile_photo' ? (driver[field] ? [driver[field]] : []) : (driver[field] || []);
      const selected = pending[field] || [];
      return <div key={field} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="mb-3 flex items-start gap-3"><span className="rounded-xl bg-blue-50 p-2.5 text-blue-700"><Icon size={20} /></span><div className="min-w-0 flex-1"><h5 className="text-sm font-bold text-slate-900">{label}</h5><p className="mt-0.5 text-xs text-slate-500">{hint}</p></div><span className={`rounded-full px-2 py-1 text-[10px] font-bold ${paths.length ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{paths.length ? `${paths.length} saved` : 'Not added'}</span></div>
        {paths.length > 0 && <div className="mb-3 grid grid-cols-2 gap-2">{paths.map((path, i) => <SavedPhoto key={path} path={path} portrait={field === 'profile_photo'} label={`${label}${paths.length > 1 ? ` ${i + 1}` : ''}`} disabled={locked} onPreview={item => run(async () => { const url = await fileUrl(item.path); if (!url) throw new Error('Could not load this photo.'); setPreview({ url, label: item.label }); })} onRemove={() => run(async () => { onUpdated(await removeDriverFile(driver, field, path)); setNotice(`${label} removed.`); })} />)}</div>}
        {selected.length > 0 && <div className="mb-3 rounded-xl border border-blue-200 bg-blue-50/60 p-3">
          <p className="mb-2 text-xs font-bold text-blue-800">Preview · {selected.length} selected</p>
          <div className="grid grid-cols-2 gap-2">{selected.map(item => <div key={item.id} className="overflow-hidden rounded-lg border border-blue-100 bg-white">
            <button type="button" className="relative block aspect-[4/3] w-full bg-slate-50" onClick={() => setPreview({ url: item.url, label: item.file.name })} aria-label={`Preview ${item.file.name}`}><img src={item.url} alt={`Selected ${label.toLowerCase()}`} className={`h-full w-full ${field === 'profile_photo' ? 'object-cover' : 'object-contain p-1'}`} /><span className="absolute bottom-1 right-1 rounded-full bg-slate-900/70 p-1 text-white"><ZoomIn size={14} /></span></button>
            <div className="flex items-center gap-1 p-1.5"><p className="min-w-0 flex-1 truncate text-[11px] text-slate-600" title={item.file.name}>{item.file.name}</p><button type="button" disabled={locked} className="flex min-h-11 min-w-11 items-center justify-center rounded-md text-slate-400 hover:text-red-600" aria-label={`Discard ${item.file.name}`} onClick={() => { release([item]); setPending(previous => ({ ...previous, [field]: previous[field].filter(value => value.id !== item.id) })); }}><X size={15} /></button></div>
          </div>)}</div>
          <div className="mt-3 flex gap-2"><button type="button" disabled={locked} className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-blue-700 px-3 text-sm font-bold text-white hover:bg-blue-800 disabled:opacity-50" onClick={() => run(async () => { const updated = await uploadDriverFiles(driver, field, selected.map(item => item.file)); onUpdated(updated); clearSelection(field); setNotice(`${label} uploaded.`); })}><Upload size={16} />{busy ? 'Please wait…' : field === 'profile_photo' && paths.length ? 'Replace photo' : 'Upload photos'}</button><button type="button" disabled={locked} className="min-h-11 rounded-xl px-3 text-xs font-semibold text-slate-600 hover:bg-white disabled:opacity-50" onClick={() => clearSelection(field)}>Cancel</button></div>
        </div>}
        <label className={`relative flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 text-sm font-semibold text-slate-600 hover:border-blue-400 hover:bg-blue-50 focus-within:ring-2 focus-within:ring-blue-600 ${locked ? 'pointer-events-none opacity-50' : ''}`}><ImagePlus size={18} />{field === 'profile_photo' ? paths.length || selected.length ? 'Choose another photo' : 'Choose profile photo' : 'Choose document photos'}<input type="file" aria-label={`Choose ${label.toLowerCase()}`} accept="image/jpeg,image/png,image/webp" multiple={field !== 'profile_photo'} disabled={locked} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" onChange={event => { const files = Array.from(event.target.files); event.target.value = ''; selectFiles(field, files); }} /></label>
      </div>;
    })}
    {error && <p role="alert" className="rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {notice && <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">{notice}</p>}
    {preview && <div role="dialog" aria-modal="true" aria-label={preview.label} className="fixed inset-0 z-[70] flex flex-col bg-slate-950/95 p-4" onClick={() => setPreview(null)}>
      <div className="flex items-center justify-between gap-3 text-white" onClick={event => event.stopPropagation()}><p className="truncate text-sm font-semibold">{preview.label}</p><button ref={viewerClose} type="button" onClick={() => setPreview(null)} className="flex min-h-12 min-w-12 items-center justify-center rounded-full bg-white/10 hover:bg-white/20" aria-label="Close photo preview"><X size={24} /></button></div>
      <div className="flex min-h-0 flex-1 items-center justify-center py-4"><img src={preview.url} alt={preview.label} onClick={event => event.stopPropagation()} className="max-h-full max-w-full rounded-lg object-contain" /></div><p className="pb-2 text-center text-xs text-slate-400">Full image preview</p>
    </div>}
  </section>;
}
