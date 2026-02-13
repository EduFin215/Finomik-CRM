import React, { useState, useRef, useEffect } from 'react';
import { Calendar, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import { Select } from './Select';

const MONTHS_ES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const WEEKDAYS_ES = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'];

function getDaysInMonth(year: number, month: number): (number | null)[] {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const startPad = (first.getDay() + 6) % 7; // Lunes = 0
  const days: (number | null)[] = Array(startPad).fill(null);
  for (let d = 1; d <= last.getDate(); d++) days.push(d);
  const total = 42;
  while (days.length < total) days.push(null);
  return days.slice(0, total);
}

interface DateTimePickerProps {
  label?: string;
  dateValue: string; // YYYY-MM-DD
  timeValue?: string; // HH:mm (omit or use '' when showTime is false)
  onChangeDate: (date: string) => void;
  onChangeTime?: (time: string) => void;
  placeholder?: string;
  className?: string;
  /** When false, only date is shown and time row is hidden (solo fecha). */
  showTime?: boolean;
}

export function DateTimePicker({
  label,
  dateValue,
  timeValue = '',
  onChangeDate,
  onChangeTime,
  placeholder = 'Elegir fecha y hora',
  className = '',
  showTime = true,
}: DateTimePickerProps) {
  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(() => (dateValue ? new Date(dateValue + 'T12:00:00').getFullYear() : new Date().getFullYear()));
  const [viewMonth, setViewMonth] = useState(() => (dateValue ? new Date(dateValue + 'T12:00:00').getMonth() : new Date().getMonth()));
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    if (dateValue) {
      const d = new Date(dateValue + 'T12:00:00');
      setViewYear(d.getFullYear());
      setViewMonth(d.getMonth());
    }
  }, [open, dateValue]);

  useEffect(() => {
    if (!open) return;
    const onOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, [open]);

  const displayText = showTime && dateValue && timeValue
    ? `${new Date(dateValue + 'T' + timeValue).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })} · ${timeValue}`
    : dateValue
    ? new Date(dateValue + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
    : '';

  const days = getDaysInMonth(viewYear, viewMonth);
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const setDate = (day: number) => {
    const d = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    onChangeDate(d);
    if (!showTime) setOpen(false);
  };

  const hourOptions = Array.from({ length: 24 }, (_, i) => {
    const h = String(i).padStart(2, '0');
    return { value: h, label: `${h}:00` };
  });
  const minuteOptions = ['00', '15', '30', '45'].map((m) => ({ value: m, label: `:${m}` }));

  const defaultPlaceholder = showTime ? 'Elegir fecha y hora' : 'Elegir fecha';

  return (
    <div ref={ref} className={`relative ${className}`}>
      {label != null && (
        <label className="block text-xs font-semibold text-brand-600 uppercase tracking-wider mb-2">{label}</label>
      )}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 rounded-xl border border-brand-200 bg-white px-4 py-3 text-left text-sm text-primary placeholder:text-brand-400 hover:border-brand-300 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
      >
        <span className="flex items-center justify-center w-9 h-9 rounded-lg bg-brand-100 text-brand-600 shrink-0">
          <Calendar className="w-4 h-4" />
        </span>
        <span className={displayText ? 'font-medium' : 'text-brand-400'}>{displayText || (placeholder || defaultPlaceholder)}</span>
      </button>

      {open && (
        <div className="absolute z-[60] mt-2 left-0 right-0 rounded-2xl border border-brand-200 bg-white shadow-xl overflow-hidden">
          <div className={`p-4 ${showTime ? 'border-b border-brand-100 bg-brand-50/50' : 'bg-brand-50/50'}`}>
            <div className="flex items-center justify-between mb-3">
              <button
                type="button"
                onClick={() => {
                  if (viewMonth === 0) {
                    setViewMonth(11);
                    setViewYear((y) => y - 1);
                  } else setViewMonth((m) => m - 1);
                }}
                className="p-2 rounded-xl text-brand-600 hover:bg-white hover:shadow-sm transition-all"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="font-bold text-primary text-sm">
                {MONTHS_ES[viewMonth]} {viewYear}
              </span>
              <button
                type="button"
                onClick={() => {
                  if (viewMonth === 11) {
                    setViewMonth(0);
                    setViewYear((y) => y + 1);
                  } else setViewMonth((m) => m + 1);
                }}
                className="p-2 rounded-xl text-brand-600 hover:bg-white hover:shadow-sm transition-all"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-7 gap-0.5 text-center">
              {WEEKDAYS_ES.map((w) => (
                <span key={w} className="text-[10px] font-bold text-brand-500 py-1">
                  {w}
                </span>
              ))}
              {days.map((day, i) => {
                if (day === null) return <div key={i} />;
                const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const isSelected = dateValue === dateStr;
                const isToday = dateStr === todayStr;
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setDate(day)}
                    className={`
                      w-8 h-8 rounded-xl text-sm font-medium transition-colors
                      ${isSelected ? 'bg-primary text-white shadow-md' : 'hover:bg-brand-100 text-primary'}
                      ${isToday && !isSelected ? 'ring-2 ring-primary/40' : ''}
                    `}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </div>
          {showTime && (
            <div className="p-4 flex items-center gap-3">
              <span className="flex items-center justify-center w-9 h-9 rounded-lg bg-brand-100 text-brand-600 shrink-0">
                <Clock className="w-4 h-4" />
              </span>
              <div className="flex gap-2 flex-1 min-w-0">
                <Select
                  value={timeValue.length >= 2 ? timeValue.slice(0, 2) : ''}
                  options={hourOptions}
                  onChange={(h) => {
                    const m = timeValue.length >= 5 ? timeValue.slice(3, 5) : '00';
                    onChangeTime?.(h ? `${h}:${m}` : '');
                  }}
                  placeholder="Hora"
                  className="flex-1"
                />
                <Select
                  value={timeValue.length >= 5 ? timeValue.slice(3, 5) : ''}
                  options={minuteOptions}
                  onChange={(m) => {
                    const h = timeValue.length >= 2 ? timeValue.slice(0, 2) : '12';
                    onChangeTime?.(m ? `${h}:${m}` : `${h}:00`);
                  }}
                  placeholder="Min"
                  className="flex-1"
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
