import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';

/**
 * Shows an "Install App" button when the browser fires the
 * beforeinstallprompt event (Chrome/Android).
 * On iOS Safari it shows a manual instruction banner instead,
 * since iOS does not support the prompt API.
 */
export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showIosHint, setShowIosHint] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Already installed — running in standalone mode, hide everything.
    if (window.matchMedia('(display-mode: standalone)').matches) return;
    if (window.navigator.standalone === true) return; // iOS standalone

    const isIos =
      /iphone|ipad|ipod/i.test(navigator.userAgent) &&
      !/crios/i.test(navigator.userAgent); // exclude Chrome on iOS
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

    if (isIos && isSafari) {
      // Only show the hint once per session.
      const seen = sessionStorage.getItem('arf-ios-hint');
      if (!seen) setShowIosHint(true);
      return;
    }

    const handler = e => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem('arf-ios-hint', '1');
    setShowIosHint(false);
    setDeferredPrompt(null);
  };

  if (dismissed) return null;

  // Android / Chrome — native install button
  if (deferredPrompt) {
    return (
      <div className="flex items-center justify-between gap-3 border-b border-blue-100 bg-blue-50 px-4 py-3">
        <div className="flex items-center gap-2 min-w-0">
          <Download size={16} className="shrink-0 text-blue-700" />
          <p className="text-sm text-blue-900 truncate">
            Install <strong>ARF Travels</strong> on your device
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleInstall}
            className="rounded-lg bg-blue-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-800"
          >
            Install
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Dismiss install prompt"
            className="min-h-9 min-w-9 font-bold text-blue-500 hover:text-blue-700"
          >
            ×
          </button>
        </div>
      </div>
    );
  }

  // iOS Safari — manual instructions banner
  if (showIosHint) {
    return (
      <div className="flex items-start justify-between gap-3 border-b border-blue-100 bg-blue-50 px-4 py-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-blue-900">Install ARF Travels</p>
          <p className="mt-0.5 text-xs text-blue-700">
            Tap the <strong>Share</strong> button (
            <span aria-label="share icon">⎙</span>) then{' '}
            <strong>Add to Home Screen</strong>
          </p>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dismiss install hint"
          className="min-h-9 min-w-9 shrink-0 font-bold text-blue-500 hover:text-blue-700"
        >
          ×
        </button>
      </div>
    );
  }

  return null;
}
