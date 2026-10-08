import React, { useState } from 'react';
import { X, UserCheck, Trash2 } from 'lucide-react';

export default function EditDriverModal({
  isOpen,
  onClose,
  driver,
  onUpdateDriver,
  onDeleteDriver,
}) {
  const [name, setName] = useState(() => driver?.name || '');
  const [phone, setPhone] = useState(() => driver?.phone || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !driver) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmedName = name.trim();
    const trimmedPhone = phone.trim();

    if (!trimmedName) {
      setError('Please enter the driver’s name');
      return;
    }

    if (!trimmedPhone) {
      setError('Please enter the phone number');
      return;
    }

    const digitsOnly = trimmedPhone.replace(/\D/g, '');
    if (digitsOnly.length < 10) {
      setError('Please enter a valid 10-digit phone number');
      return;
    }

    setIsSubmitting(true);
    setError('');
    try {
      await onUpdateDriver(driver.id, trimmedName, trimmedPhone);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to update driver details.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (window.confirm(`Are you sure you want to remove ${driver.name} and all their records?`)) {
      setIsSubmitting(true);
      try {
        await onDeleteDriver(driver.id);
        onClose();
      } catch (err) {
        setError(err.message || 'Failed to delete driver.');
        setIsSubmitting(false);
      }
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl p-6 border border-slate-200 animate-in fade-in slide-in-from-bottom duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-50 text-blue-700 rounded-lg">
              <UserCheck size={20} />
            </div>
            <h3 className="text-xl font-bold text-slate-900">Edit Driver Details</h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 -mr-2 text-slate-400 hover:text-slate-700 rounded-full active:bg-slate-100 min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Close"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label htmlFor="edit-driver-name" className="block text-sm font-semibold text-slate-700 mb-1.5">
              Driver Name <span className="text-red-500">*</span>
            </label>
            <input
              id="edit-driver-name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full text-lg font-medium text-slate-900 px-4 py-3 bg-slate-50 border-2 border-slate-300 rounded-xl focus:outline-none focus:border-blue-600 focus:bg-white transition-colors"
            />
          </div>

          <div>
            <label htmlFor="edit-driver-phone" className="block text-sm font-semibold text-slate-700 mb-1.5">
              Phone Number <span className="text-red-500">*</span>
            </label>
            <input
              id="edit-driver-phone"
              type="tel"
              inputMode="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full text-lg font-medium text-slate-900 px-4 py-3 bg-slate-50 border-2 border-slate-300 rounded-xl focus:outline-none focus:border-blue-600 focus:bg-white transition-colors"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 text-red-700 text-sm font-medium rounded-lg border border-red-200">
              {error}
            </div>
          )}

          <div className="pt-2 space-y-2.5">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 text-lg font-bold rounded-xl bg-blue-700 hover:bg-blue-800 text-white shadow-md active:scale-98 transition-all min-h-[54px] flex items-center justify-center"
            >
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>

            {onDeleteDriver && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={isSubmitting}
                className="w-full py-2.5 text-sm font-bold text-red-600 hover:text-red-700 hover:bg-red-50 active:bg-red-100 rounded-xl transition-colors flex items-center justify-center gap-1.5 min-h-[44px]"
              >
                <Trash2 size={16} />
                <span>Remove Driver</span>
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
