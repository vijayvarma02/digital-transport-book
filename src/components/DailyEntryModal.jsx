import React, { useState, useEffect, useRef } from 'react';
import { formatModalDate } from '../utils/dateUtils';
import { Check, X } from 'lucide-react';

export default function DailyEntryModal({
  isOpen,
  onClose,
  driverName,
  dateString,
  currentAmount,
  onSave,
}) {
  const [amount, setAmount] = useState(() => (
    currentAmount !== null && currentAmount !== undefined ? String(currentAmount) : ''
  ));
  const [status, setStatus] = useState('idle'); // 'idle' | 'saving' | 'saved' | 'error'
  const [errorMessage, setErrorMessage] = useState('');
  const inputRef = useRef(null);

  // Quick preset amounts common for daily transport drivers
  const quickPresets = [500, 750, 800, 850, 1000];

  useEffect(() => {
    // Focus input after opening
    const timer = setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        inputRef.current.select();
      }
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  if (!isOpen) return null;

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    if (status === 'saving' || status === 'saved') return;

    setStatus('saving');
    setErrorMessage('');

    try {
      // If blank, treat as clearing the record
      const valueToSave = amount.trim() === '' ? null : Number(amount.trim());
      if (valueToSave !== null && (isNaN(valueToSave) || valueToSave < 0)) {
        setStatus('error');
        setErrorMessage('Please enter a valid number');
        return;
      }

      await onSave(dateString, valueToSave);
      setStatus('saved');
      
      // Auto close after brief "Saved" confirmation
      setTimeout(() => {
        onClose();
      }, 400);
    } catch {
      setStatus('error');
      setErrorMessage('Could not save. Please try again.');
    }
  };

  const handleClear = async () => {
    setStatus('saving');
    try {
      await onSave(dateString, null);
      setStatus('saved');
      setTimeout(() => {
        onClose();
      }, 350);
    } catch {
      setStatus('error');
      setErrorMessage('Could not clear amount.');
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
        {/* Top Header */}
        <div className="flex items-start justify-between pb-3 border-b border-slate-100">
          <div>
            <span className="text-xs font-semibold tracking-wider uppercase text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">
              {driverName}
            </span>
            <h2 className="text-xl font-bold text-slate-900 mt-1">
              {formatModalDate(dateString)}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 -mr-2 -mt-2 text-slate-400 hover:text-slate-700 rounded-full active:bg-slate-100 min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Close"
          >
            <X size={24} />
          </button>
        </div>

        {/* Input Form */}
        <form onSubmit={handleSave} className="mt-5 space-y-5">
          <div>
            <label htmlFor="daily-amount-input" className="block text-sm font-semibold text-slate-600 mb-2">
              Enter Amount
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-4 text-2xl font-bold text-slate-700 select-none">
                ₹
              </span>
              <input
                id="daily-amount-input"
                ref={inputRef}
                type="number"
                inputMode="numeric"
                pattern="[0-9]*"
                min="0"
                step="1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                className="w-full text-3xl font-extrabold text-slate-900 pl-11 pr-4 py-3.5 bg-slate-50 border-2 border-slate-300 rounded-xl focus:outline-none focus:border-blue-600 focus:bg-white transition-colors"
              />
            </div>
          </div>

          {/* Quick preset amount chips for one-tap entry */}
          <div>
            <div className="text-xs font-medium text-slate-500 mb-2">Quick amounts:</div>
            <div className="flex flex-wrap gap-2">
              {quickPresets.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setAmount(String(preset))}
                  className={`px-3 py-2 text-sm font-bold rounded-lg border transition-all active:scale-95 min-h-[40px] ${
                    amount === String(preset)
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-slate-100 text-slate-800 border-slate-200 hover:bg-slate-200'
                  }`}
                >
                  ₹{preset}
                </button>
              ))}
            </div>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="p-3 bg-red-50 text-red-700 text-sm font-medium rounded-lg border border-red-200">
              {errorMessage}
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3 pt-2">
            <button
              type="submit"
              disabled={status === 'saving' || status === 'saved'}
              className={`w-full py-4 text-lg font-bold rounded-xl shadow-md transition-all active:scale-98 flex items-center justify-center gap-2 min-h-[56px] ${
                status === 'saved'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-blue-700 hover:bg-blue-800 text-white'
              }`}
            >
              {status === 'saving' && (
                <span className="flex items-center gap-2">
                  <span className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></span>
                  Saving...
                </span>
              )}
              {status === 'saved' && (
                <span className="flex items-center gap-2">
                  <Check size={22} className="stroke-[3]" />
                  Saved
                </span>
              )}
              {status !== 'saving' && status !== 'saved' && 'Save'}
            </button>

            {/* Clear / Empty option if an amount already exists */}
            {currentAmount !== null && currentAmount !== undefined && (
              <button
                type="button"
                onClick={handleClear}
                disabled={status === 'saving' || status === 'saved'}
                className="w-full py-3 text-sm font-semibold text-slate-500 hover:text-red-600 bg-transparent rounded-lg active:bg-slate-100 min-h-[44px]"
              >
                Clear this day (leave blank —)
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
