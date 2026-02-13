import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { MessageCircle, X, Sparkles, Minimize2, Maximize2 } from 'lucide-react';
import { FinnyChatContent } from './FinnyChatContent';

export default function FinnyFloatingChat() {
  const [open, setOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
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
      {/* Floating Button */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`
          pointer-events-auto fixed bottom-6 right-6 w-14 h-14 rounded-full flex items-center justify-center 
          transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 z-[60]
          ${open
            ? 'bg-white text-primary rotate-90 ring-2 ring-brand-100'
            : 'bg-gradient-to-br from-primary via-brand-600 to-accent text-white shadow-primary/30'
          }
        `}
        aria-label={open ? 'Cerrar Finny' : 'Abrir Finny'}
      >
        {open ? <X size={24} /> : <MessageCircle size={24} />}
      </button>

      {/* Chat Window */}
      {open && (
        <>
          {/* Backdrop only on mobile */}
          <div
            className="pointer-events-auto fixed inset-0 bg-black/20 backdrop-blur-[2px] sm:hidden"
            style={{ pointerEvents: 'auto' }}
            aria-hidden
            onClick={() => setOpen(false)}
          />

          <div
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="finny-modal-title"
            className={`
              pointer-events-auto fixed bottom-24 right-4 sm:right-6 flex flex-col 
              bg-white/80 backdrop-blur-xl border border-white/40 shadow-2xl rounded-[2rem] overflow-hidden
              transition-all duration-300 origin-bottom-right ring-1 ring-black/5
              ${isExpanded
                ? 'w-[min(calc(100vw-2rem),800px)] h-[min(calc(100vh-8rem),800px)]'
                : 'w-[min(calc(100vw-2rem),380px)] h-[min(calc(100vh-8rem),600px)]'
              }
            `}
            style={{ pointerEvents: 'auto' }}
          >
            {/* Header */}
            <div className="shrink-0 flex items-center justify-between px-5 py-4 bg-white/50 backdrop-blur-md border-b border-white/20">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary to-accent flex items-center justify-center shadow-inner">
                  <Sparkles size={16} className="text-white" />
                </div>
                <div>
                  <h2 id="finny-modal-title" className="font-bold text-primary text-base leading-none">
                    Finny AI
                  </h2>
                  <p className="text-[10px] text-brand-500 font-medium mt-0.5">Asistente Inteligente</p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="p-2 text-brand-400 hover:text-primary hover:bg-black/5 rounded-full transition-colors hidden sm:flex"
                  title={isExpanded ? "Contraer" : "Expandir"}
                >
                  {isExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="p-2 text-brand-400 hover:text-primary hover:bg-black/5 rounded-full transition-colors"
                  aria-label="Cerrar"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Content area with subtle gradient background */}
            <div className="flex-1 min-h-0 overflow-hidden bg-gradient-to-b from-transparent to-brand-50/30">
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
