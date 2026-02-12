import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { MessageCircle, X } from 'lucide-react';
import { FinnyChatContent } from './FinnyChatContent';

export default function FinnyFloatingChat() {
  const [open, setOpen] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [open]);

  const content = (
    <div className="pointer-events-none fixed inset-0 z-[2147483647]" style={{ pointerEvents: 'none' }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="pointer-events-auto flex items-center justify-center bg-primary text-white shadow-lg hover:bg-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 transition-colors"
        style={{
          pointerEvents: 'auto',
          position: 'fixed',
          bottom: '1.5rem',
          right: '1.5rem',
          width: 56,
          height: 56,
          borderRadius: '50%',
        }}
        aria-label={open ? 'Cerrar Finny' : 'Abrir Finny'}
      >
        <MessageCircle size={24} />
      </button>

      {open && (
        <>
          <div
            className="pointer-events-auto fixed inset-0 bg-black/20 backdrop-blur-sm"
            style={{ pointerEvents: 'auto' }}
            aria-hidden
            onClick={() => setOpen(false)}
          />
          <div
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="finny-modal-title"
            className="pointer-events-auto flex w-[min(calc(100vw-3rem),360px)] flex-col rounded-2xl border border-brand-200/60 bg-white/95 backdrop-blur-sm shadow-xl"
            style={{
              pointerEvents: 'auto',
              position: 'fixed',
              bottom: '1.5rem',
              right: '1.5rem',
              // Más alto y algo más estrecho para que se vea más vertical
              height: 'min(calc(100vh - 4rem), 640px)',
            }}
          >
            <div className="shrink-0 flex items-center justify-between border-b border-brand-200/60 px-4 py-3">
              <h2 id="finny-modal-title" className="font-subtitle text-primary text-lg">
                Finny
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="p-2 text-brand-500 hover:bg-brand-100/50 rounded-full transition-colors"
                aria-label="Cerrar"
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 min-h-0 overflow-hidden">
              <FinnyChatContent />
            </div>
          </div>
        </>
      )}
    </div>
  );

  if (typeof document === 'undefined') return null;
  const container = document.getElementById('finny-root');
  if (!container) return null;
  return createPortal(content, container);
}
