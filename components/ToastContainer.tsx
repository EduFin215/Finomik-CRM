import React from 'react';
import { X } from 'lucide-react';
import { useToast } from '../context/ToastContext';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full pointer-events-none"
      aria-live="polite"
    >
      <div className="flex flex-col gap-2 pointer-events-auto">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`flex items-center gap-3 px-4 py-3 rounded-2xl border shadow-xl backdrop-blur-sm ${
              t.type === 'error'
                ? 'bg-red-50/95 border-red-200/60 text-red-800'
                : 'bg-emerald-50/95 border-emerald-200/60 text-emerald-800'
            }`}
          >
            <p className="flex-1 text-sm font-body">{t.message}</p>
            <button
              type="button"
              onClick={() => removeToast(t.id)}
              className="p-1.5 rounded-xl hover:bg-black/10 transition-colors"
              aria-label="Cerrar"
            >
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
