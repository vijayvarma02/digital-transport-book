import React, { useState } from 'react';
import { X, Database, Check, RefreshCw } from 'lucide-react';
import { saveSupabaseCredentials, getSavedSupabaseCredentials, isSupabaseConfigured } from '../lib/supabase';

export default function DatabaseSettingsModal({ isOpen, onClose, onConfigChanged, onResetDemo }) {
  const currentCreds = getSavedSupabaseCredentials();
  const [url, setUrl] = useState(currentCreds.url);
  const [key, setKey] = useState(currentCreds.key);
  const [savedNotice, setSavedNotice] = useState(false);

  if (!isOpen) return null;

  const handleSave = (e) => {
    e.preventDefault();
    saveSupabaseCredentials(url, key);
    setSavedNotice(true);
    setTimeout(() => {
      setSavedNotice(false);
      onConfigChanged();
      onClose();
    }, 600);
  };

  const handleClear = () => {
    saveSupabaseCredentials('', '');
    setUrl('');
    setKey('');
    setSavedNotice(true);
    setTimeout(() => {
      setSavedNotice(false);
      onConfigChanged();
      onClose();
    }, 600);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 border border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-slate-100 text-slate-800 rounded-lg">
              <Database size={20} />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Database Settings</h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 -mr-2 text-slate-400 hover:text-slate-700 rounded-full active:bg-slate-100 min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Close"
          >
            <X size={22} />
          </button>
        </div>

        <div className="mt-4 mb-3">
          <div className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
            isSupabaseConfigured()
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-amber-50 text-amber-800 border border-amber-200'
          }`}>
            <span className={`w-2.5 h-2.5 rounded-full ${isSupabaseConfigured() ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
            {isSupabaseConfigured()
              ? 'Connected to Supabase PostgreSQL'
              : 'Using Local Storage (Works 100% offline on this device)'}
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              SUPABASE PROJECT URL
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://xyz.supabase.co"
              className="w-full text-sm font-mono text-slate-800 px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              SUPABASE ANON KEY
            </label>
            <input
              type="password"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="eyJhbGciOiJIUzI1NiIsIn..."
              className="w-full text-sm font-mono text-slate-800 px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
            />
          </div>

          <div className="pt-2 flex flex-col gap-2">
            <button
              type="submit"
              className="w-full py-3 text-sm font-bold rounded-xl bg-blue-700 hover:bg-blue-800 text-white min-h-[48px] flex items-center justify-center gap-2"
            >
              {savedNotice ? (
                <>
                  <Check size={18} /> Saved!
                </>
              ) : (
                'Save Connection'
              )}
            </button>

            {isSupabaseConfigured() && (
              <button
                type="button"
                onClick={handleClear}
                className="w-full py-2.5 text-xs font-semibold text-slate-500 hover:text-slate-800"
              >
                Switch back to Local Storage
              </button>
            )}
          </div>
        </form>

        <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>Need demo data?</span>
          <button
            type="button"
            onClick={() => {
              if (window.confirm('Reset all drivers and daily records to default demo data?')) {
                onResetDemo();
                onClose();
              }
            }}
            className="flex items-center gap-1 font-semibold text-blue-700 hover:text-blue-900 py-1 px-2 rounded hover:bg-blue-50"
          >
            <RefreshCw size={13} /> Reset Demo Data
          </button>
        </div>
      </div>
    </div>
  );
}
