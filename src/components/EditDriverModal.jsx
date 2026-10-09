import { useCallback, useState } from 'react';
import { X, Phone, Save, Trash2, UserRound } from 'lucide-react';
import DriverAvatar from './DriverAvatar';
import DriverFiles from './DriverFiles';
import DeleteDriverConfirmation from './DeleteDriverConfirmation';

export default function EditDriverModal({ isOpen, onClose, driver, onUpdateDriver, onDeleteDriver, onProfileUpdated }) {
  const [name, setName] = useState(() => driver?.name || '');
  const [phone, setPhone] = useState(() => driver?.phone || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filesBusy, setFilesBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const closeDelete = useCallback(() => { setDeleteOpen(false); setDeleteError(''); }, []);
  const locked = isSubmitting || filesBusy;
  if (!isOpen || !driver) return null;

  async function handleSubmit(event) {
    event.preventDefault();
    if (locked) return;
    const trimmedName = name.trim();
    const trimmedPhone = phone.trim();
    if (!trimmedName) { setError('Please enter the driver’s name'); return; }
    if (trimmedPhone.replace(/\D/g, '').length < 10) { setError('Please enter a valid 10-digit phone number'); return; }
    setIsSubmitting(true); setError(''); setSaved(false);
    try { await onUpdateDriver(driver.id, trimmedName, trimmedPhone); setSaved(true); }
    catch (err) { setError(err.message || 'Failed to update driver details.'); }
    finally { setIsSubmitting(false); }
  }
  async function handleDelete() {
    if (locked) return;
    setIsSubmitting(true); setDeleteError('');
    try { await onDeleteDriver(driver.id); onClose(); }
    catch (err) {
      setDeleteError(err.code === '23503'
        ? 'The driver’s linked records could not be removed. Please update the database deletion setup and try again.'
        : err.code === '42501' || err.code === 'PGRST301'
          ? 'Your session cannot delete this driver. Please log in again and retry.'
          : 'Could not delete this driver. Check your connection and try again.');
      setIsSubmitting(false);
    }
  }

  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 backdrop-blur-xs sm:items-center sm:p-4" onClick={() => { if (!locked && !deleteOpen) onClose(); }}>
    <div role="dialog" aria-modal="true" aria-labelledby="driver-profile-title" className="flex max-h-[94dvh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl bg-slate-50 shadow-2xl sm:max-h-[90dvh] sm:rounded-3xl" onClick={event => event.stopPropagation()}>
      <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-5 py-3"><div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-blue-700">Driver records</p><h2 id="driver-profile-title" className="text-lg font-bold text-slate-900">Driver profile</h2></div><button type="button" disabled={locked} onClick={onClose} className="flex min-h-11 min-w-11 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-800 disabled:opacity-40" aria-label="Close driver profile"><X size={22} /></button></div>
      <div className="overflow-y-auto overscroll-contain p-5">
        <div className="mb-6 rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-slate-100 p-5">
          <div className="flex items-center gap-4"><DriverAvatar driver={driver} large /><div className="min-w-0 flex-1"><h3 className="break-words text-xl font-extrabold text-slate-900">{driver.name}</h3><p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500"><Phone size={13} />{driver.phone}</p><span className="mt-2 inline-flex rounded-full border border-blue-100 bg-white px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-blue-700">Driver</span></div></div>
          <div className="mt-4 flex flex-wrap gap-2 border-t border-blue-100 pt-3">{[['Aadhaar', driver.aadhaar_photos?.length], ['Licence', driver.license_photos?.length]].map(([label, count]) => <span key={label} className={`rounded-full px-2.5 py-1 text-xs font-semibold ${count ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{label} · {count ? `${count} photo${count > 1 ? 's' : ''}` : 'Not added'}</span>)}</div>
        </div>

        <form onSubmit={handleSubmit} className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <h4 className="mb-4 flex items-center gap-2 text-base font-bold text-slate-900"><UserRound size={17} className="text-blue-700" />Contact details</h4>
          <div className="space-y-4">
            <div><label htmlFor="edit-driver-name" className="mb-1.5 block text-xs font-semibold text-slate-600">Driver name</label><input id="edit-driver-name" type="text" required disabled={locked} value={name} onChange={event => { setName(event.target.value); setSaved(false); }} className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-3 text-base font-medium text-slate-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 disabled:opacity-50" /></div>
            <div><label htmlFor="edit-driver-phone" className="mb-1.5 block text-xs font-semibold text-slate-600">Phone number</label><input id="edit-driver-phone" type="tel" inputMode="tel" required disabled={locked} value={phone} onChange={event => { setPhone(event.target.value); setSaved(false); }} className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-3 text-base font-medium text-slate-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 disabled:opacity-50" /></div>
            <button type="submit" disabled={locked} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-700 text-sm font-bold text-white hover:bg-blue-800 disabled:opacity-50"><Save size={16} />{isSubmitting ? 'Saving…' : 'Save details'}</button>
            {saved && <p role="status" className="text-center text-xs font-semibold text-emerald-700">Contact details saved.</p>}
          </div>
        </form>
        {error && <p role="alert" className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <DriverFiles driver={driver} onUpdated={onProfileUpdated} onBusyChange={setFilesBusy} disabled={isSubmitting || deleteOpen} />
        {onDeleteDriver && <div className="mt-6 border-t border-slate-200 pt-4"><button type="button" disabled={locked} onClick={() => { setDeleteOpen(true); setDeleteError(''); }} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-40"><Trash2 size={16} />Delete driver</button></div>}
      </div>
    </div>
    {deleteOpen && <DeleteDriverConfirmation driverName={driver.name} busy={isSubmitting} error={deleteError} onCancel={closeDelete} onConfirm={handleDelete} />}
  </div>;
}
