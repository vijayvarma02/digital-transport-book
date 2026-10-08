import React, { useState } from 'react';
import { X, UserPlus } from 'lucide-react';

export default function AddDriverModal({ isOpen, onClose, onAddDriver }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

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

    // Basic 10-digit validation
    const digitsOnly = trimmedPhone.replace(/\D/g, '');
    if (digitsOnly.length < 10) {
      setError('Please enter a valid 10-digit phone number');
      return;
    }

    setIsSubmitting(true);
    setError('');
    try {
      await onAddDriver(trimmedName, trimmedPhone);
      setName('');
      setPhone('');
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to add driver. Please try again.');
    } finally {
      setIsSubmitting(false);
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
              <UserPlus size={20} />
            </div>
            <h3 className="text-xl font-bold text-slate-900">Add New Driver</h3>
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
            <label htmlFor="driver-name-input" className="block text-sm font-semibold text-slate-700 mb-1.5">
              Driver Name <span className="text-red-500">*</span>
            </label>
            <input
              id="driver-name-input"
              type="text"
              required
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Ramesh"
              className="w-full text-lg font-medium text-slate-900 px-4 py-3 bg-slate-50 border-2 border-slate-300 rounded-xl focus:outline-none focus:border-blue-600 focus:bg-white transition-colors"
            />
          </div>

          <div>
            <label htmlFor="driver-phone-input" className="block text-sm font-semibold text-slate-700 mb-1.5">
              Phone Number <span className="text-red-500">*</span>
            </label>
            <input
              id="driver-phone-input"
              type="tel"
              inputMode="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. 9848011223"
              className="w-full text-lg font-medium text-slate-900 px-4 py-3 bg-slate-50 border-2 border-slate-300 rounded-xl focus:outline-none focus:border-blue-600 focus:bg-white transition-colors"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 text-red-700 text-sm font-medium rounded-lg border border-red-200">
              {error}
            </div>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 text-lg font-bold rounded-xl bg-blue-700 hover:bg-blue-800 text-white shadow-md active:scale-98 transition-all min-h-[54px] flex items-center justify-center"
            >
              {isSubmitting ? 'Adding...' : 'Add Driver'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
