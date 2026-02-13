import React, { Fragment } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: React.ReactNode;
    children: React.ReactNode;
    footer?: React.ReactNode;
    // maxWidth prop is deprecated but kept for backward compatibility to avoid TS errors
    maxWidth?: string;
}

export function Modal({
    isOpen,
    onClose,
    title,
    children,
    footer,
}: ModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 top-14 sm:top-16 z-50 flex justify-end overflow-hidden" role="dialog" aria-modal="true">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-primary/20 backdrop-blur-[2px] transition-opacity animate-in fade-in duration-300"
                onClick={onClose}
                aria-hidden="true"
            />

            {/* Side Panel */}
            <div
                className={`
          relative w-1/3 min-w-[500px] h-full
          bg-white shadow-2xl 
          border-l border-brand-very-soft/50 
          flex flex-col
          transform transition-transform
          animate-in slide-in-from-right duration-300
        `}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-brand-very-soft/50 shrink-0 bg-white/50 backdrop-blur-sm z-10">
                    <div className="flex-1 min-w-0 pr-4">
                        {/* Wrap title in standard container if it's a string, otherwise render node */}
                        {typeof title === 'string' ? (
                            <h2 className="text-xl font-extrabold text-primary break-words leading-tight">{title}</h2>
                        ) : (
                            <div className="break-words leading-tight">{title}</div>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 -mr-2 text-brand-muted/70 hover:bg-slate-100 hover:text-primary rounded-full transition-colors"
                        aria-label="Close modal"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-8 scrollbar-thin scrollbar-thumb-brand-muted/20 scrollbar-track-transparent">
                    {children}
                </div>

                {/* Footer */}
                {footer && (
                    <div className="p-6 border-t border-brand-very-soft/50 bg-slate-50/80 backdrop-blur-sm shrink-0 flex justify-end gap-3 z-10">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
}
