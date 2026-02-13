import React from 'react';

interface FinanceModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}

export function FinanceModal({ open, onClose, title, children, footer }: FinanceModalProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div
        className="relative bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] flex flex-col border border-brand-200/60"
        role="dialog"
        aria-modal="true"
        aria-labelledby="finance-modal-title"
      >
        <div className="p-6 border-b border-brand-100">
          <h2 id="finance-modal-title" className="text-xl font-bold text-primary">
            {title}
          </h2>
        </div>
        <div className="flex-1 overflow-auto p-6">{children}</div>
        <div className="p-6 pt-4 border-t border-brand-100 flex justify-end gap-2">
          {footer}
        </div>
      </div>
    </div>
  );
}
