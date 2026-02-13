import React, { useState, useEffect, useRef } from 'react';
import type { DateRangeKey } from '../../../services/crm/dashboard';
import { DateTimePicker } from '../../tasks/DateTimePicker';
import { Calendar as CalendarIcon, ChevronDown } from 'lucide-react';

const LABELS: Record<DateRangeKey, string> = {
  last30: 'Últimos 30 días',
  last90: 'Últimos 90 días',
  ytd: 'Año actual (YTD)',
  custom: 'Personalizado',
};

interface DateRangeSelectorProps {
  value: DateRangeKey;
  customFrom: string;
  customTo: string;
  onChangeKey: (key: DateRangeKey) => void;
  onCustomRange: (from: string, to: string) => void;
}

export function DateRangeSelector({
  value,
  customFrom,
  customTo,
  onChangeKey,
  onCustomRange,
}: DateRangeSelectorProps) {
  const [open, setOpen] = useState(false);
  const [customFromLocal, setCustomFromLocal] = useState(customFrom);
  const [customToLocal, setCustomToLocal] = useState(customTo);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCustomFromLocal(customFrom);
    setCustomToLocal(customTo);
  }, [customFrom, customTo]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const onOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, [open]);

  const handleSelect = (key: DateRangeKey) => {
    if (key === 'custom') {
      const from = customFromLocal || new Date().toISOString().slice(0, 10);
      const to = customToLocal || new Date().toISOString().slice(0, 10);
      onCustomRange(from, to);
    } else {
      onChangeKey(key);
    }
    setOpen(false);
  };

  const displayLabel = value === 'custom' && (customFrom || customTo)
    ? `${new Date(customFrom).toLocaleDateString()} – ${new Date(customTo).toLocaleDateString()}`
    : LABELS[value];

  return (
    <div ref={ref} className="relative z-50">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`
          flex items-center gap-2.5 rounded-xl border px-3.5 py-2 text-sm font-bold transition-all duration-200
          ${open
            ? 'bg-primary text-white border-primary shadow-md'
            : 'bg-white text-primary border-brand-very-soft/60 hover:border-brand-300 hover:shadow-sm'
          }
        `}
      >
        <CalendarIcon className={`w-4 h-4 ${open ? 'text-white' : 'text-brand-400'}`} />
        <span>{displayLabel}</span>
        <ChevronDown className={`w-4 h-4 ${open ? 'text-white' : 'text-brand-300'}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-[60] mt-2 w-[280px] rounded-2xl border border-brand-very-soft/60 bg-white/95 backdrop-blur-xl shadow-xl animate-in fade-in zoom-in-95 origin-top-right overflow-hidden">
          <div className="p-2 space-y-1">
            {(['last30', 'last90', 'ytd'] as const).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => handleSelect(key)}
                className={`
                  w-full px-4 py-2.5 text-left text-sm font-bold rounded-xl transition-all
                  ${value === key
                    ? 'bg-brand-50 text-primary'
                    : 'text-brand-600 hover:bg-brand-50/50 hover:text-primary'
                  }
                `}
              >
                {LABELS[key]}
              </button>
            ))}
          </div>

          <div className="border-t border-brand-very-soft/50 p-4 bg-brand-50/20">
            <p className="text-[10px] font-bold uppercase tracking-wider text-brand-400 mb-2">Rango Personalizado</p>
            <div className="space-y-3">
              <DateTimePicker
                dateValue={customFromLocal}
                onChangeDate={setCustomFromLocal}
                showTime={false}
                placeholder="Desde"
                className="w-full"
              />
              <DateTimePicker
                dateValue={customToLocal}
                onChangeDate={setCustomToLocal}
                showTime={false}
                placeholder="Hasta"
                className="w-full"
              />

              <button
                type="button"
                onClick={() => handleSelect('custom')}
                className="w-full rounded-xl bg-primary px-3 py-2.5 text-sm font-bold text-white shadow-md shadow-primary/20 hover:bg-brand-600 transition-all hover:translate-y-[-1px]"
              >
                Aplicar Rango
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
