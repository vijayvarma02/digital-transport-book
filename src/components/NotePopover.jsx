import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export default function NotePopover({ text, anchor, onClose }) {
  const closeButton = useRef(null);
  useEffect(() => {
    const previous = document.activeElement;
    closeButton.current?.focus();
    const keydown = event => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'Tab') { event.preventDefault(); closeButton.current?.focus(); }
    };
    const dismiss = () => onClose();
    window.addEventListener('keydown', keydown);
    window.addEventListener('resize', dismiss);
    return () => { window.removeEventListener('keydown', keydown); window.removeEventListener('resize', dismiss); previous?.focus(); };
  }, [onClose]);
  const width = Math.min(280, window.innerWidth - 24);
  const left = Math.max(12, Math.min(anchor.right - width, window.innerWidth - width - 12));
  const top = Math.max(12, Math.min(anchor.bottom + 6, window.innerHeight - 260));
  return createPortal(<div className="fixed inset-0 z-40" onClick={event => { event.stopPropagation(); onClose(); }}>
    <div role="dialog" aria-modal="true" aria-label="Daily note" style={{ top, left, width }} className="fixed rounded-xl border border-slate-200 bg-white p-3 shadow-xl" onClick={event => event.stopPropagation()}>
      <div className="mb-1 flex items-center justify-between"><span className="text-xs font-bold text-slate-600">Note</span><button ref={closeButton} type="button" onClick={onClose} aria-label="Close note" className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100"><X size={16} /></button></div>
      <p className="max-h-40 overflow-y-auto whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-700 [overflow-wrap:anywhere]">{text}</p>
    </div>
  </div>, document.body);
}
