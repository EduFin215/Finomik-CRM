import React, { useState, useEffect } from 'react';
import type { DateRangeKey } from '../../../services/crm/dashboard';
import { DateTimePicker } from '../../tasks/DateTimePicker';

const LABELS: Record<DateRangeKey, string> = {
  last30: '30 días',
  last90: '90 días',
  ytd: 'YTD',
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

  useEffect(() => {
    setCustomFromLocal(customFrom);
    setCustomToLocal(customTo);
  }, [customFrom, customTo]);

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
    ? `${customFrom || '…'} – ${customTo || '…'}`
    : LABELS[value];

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-xl border border-brand-200/60 bg-white px-3 py-2.5 text-sm font-bold text-primary hover:bg-brand-100/50 transition-colors"
      >
        <span>{displayLabel}</span>
        <svg className="h-4 w-4 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-[55]" aria-hidden onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-[60] mt-2 min-w-[200px] rounded-xl border border-brand-200/60 bg-white/95 backdrop-blur-sm py-1 shadow-dropdown">
            {(['last30', 'last90', 'ytd'] as const).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => handleSelect(key)}
                className={`block w-full px-4 py-3 text-left text-sm font-bold transition-colors ${value === key ? 'bg-brand-100/50 text-primary' : 'text-brand-600 hover:bg-brand-100/50'}`}
              >
                {LABELS[key]}
              </button>
            ))}
            <div className="border-t border-brand-100 px-4 py-3">
              <p className="text-xs font-bold uppercase text-brand-500 mb-2">Personalizado</p>
              <div className="flex gap-2 items-center flex-wrap">
                <DateTimePicker
                  dateValue={customFromLocal}
                  onChangeDate={setCustomFromLocal}
                  showTime={false}
                  placeholder="Desde"
                  className="flex-1 min-w-[140px]"
                />
                <span className="text-brand-400 shrink-0">–</span>
                <DateTimePicker
                  dateValue={customToLocal}
                  onChangeDate={setCustomToLocal}
                  showTime={false}
                  placeholder="Hasta"
                  className="flex-1 min-w-[140px]"
                />
              </div>
              <button
                type="button"
                onClick={() => handleSelect('custom')}
                className="mt-2 w-full rounded-xl bg-primary px-3 py-2 text-sm font-bold text-white hover:bg-brand-600 transition-colors"
              >
                Aplicar
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
