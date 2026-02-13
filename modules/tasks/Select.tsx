import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  label?: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  /** Optional icon to show left of the trigger */
  icon?: React.ReactNode;
}

const triggerBase =
  'w-full flex items-center justify-between gap-2 rounded-xl border border-brand-200 bg-white px-4 py-3 text-left text-sm text-primary transition-all hover:border-brand-300 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none';

export function Select({
  label,
  value,
  options,
  onChange,
  placeholder = 'Seleccionar',
  className = '',
  icon,
}: SelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, [open]);

  const selected = options.find((o) => o.value === value);
  const display = selected ? selected.label : placeholder;

  return (
    <div ref={ref} className={`relative ${className}`}>
      {label && (
        <label className="block text-xs font-semibold text-brand-600 uppercase tracking-wider mb-2">{label}</label>
      )}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`${triggerBase} ${!selected ? 'text-brand-400' : ''}`}
      >
        <span className="flex items-center gap-2 min-w-0">
          {icon && <span className="shrink-0 text-brand-500">{icon}</span>}
          <span className="truncate">{display}</span>
        </span>
        <ChevronDown
          className={`w-4 h-4 shrink-0 text-brand-500 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-[55]" aria-hidden onClick={() => setOpen(false)} />
          <div className="absolute left-0 right-0 top-full mt-2 z-[60] max-h-56 overflow-y-auto bg-white/95 backdrop-blur-sm rounded-xl border border-brand-200/60 shadow-dropdown py-1">
            <button
              type="button"
              onClick={() => {
                onChange('');
                setOpen(false);
              }}
              className={`w-full px-4 py-3 text-left text-sm font-bold transition-colors ${value === '' ? 'bg-brand-100/50 text-primary' : 'text-brand-600 hover:bg-brand-100/50'}`}
            >
              {placeholder}
            </button>
            {options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className={`w-full px-4 py-3 text-left text-sm font-bold transition-colors ${value === opt.value ? 'bg-brand-100/50 text-primary' : 'text-brand-600 hover:bg-brand-100/50'}`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
