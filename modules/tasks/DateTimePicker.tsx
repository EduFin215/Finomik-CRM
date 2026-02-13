import React, { useState, useRef, useEffect } from 'react';
import { Calendar, Clock, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Select } from './Select';

const MONTHS_ES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const WEEKDAYS_ES = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'];

function getDaysInMonth(year: number, month: number): (number | null)[] {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const startPad = (first.getDay() + 6) % 7; // Lunes = 0
  const days: (number | null)[] = Array(startPad).fill(null);
  for (let d = 1; d <= last.getDate(); d++) days.push(d);
  const total = 42; // Always show 6 rows for consistency
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
  showTime?: boolean;
}

export function DateTimePicker({
  label,
  dateValue,
  timeValue = '',
  onChangeDate,
  onChangeTime,
  placeholder = 'Select date',
  className = '',
  showTime = true,
}: DateTimePickerProps) {
  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(() => (dateValue ? new Date(dateValue + 'T12:00:00').getFullYear() : new Date().getFullYear()));
  const [viewMonth, setViewMonth] = useState(() => (dateValue ? new Date(dateValue + 'T12:00:00').getMonth() : new Date().getMonth()));
  const ref = useRef<HTMLDivElement>(null);

  // Sync view when opening or value changes
  useEffect(() => {
    if (!open) return;
    if (dateValue) {
      const d = new Date(dateValue + 'T12:00:00');
      setViewYear(d.getFullYear());
      setViewMonth(d.getMonth());
    }
  }, [open, dateValue]);

  // Click outside to close
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

  return (
    <div ref={ref} className={`relative ${className}`}>
      {label && (
        <label className="block text-xs font-bold text-brand-500 uppercase tracking-wider mb-1.5 ml-1">{label}</label>
      )}

      {/* Input Trigger */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`
          w-full flex items-center gap-3 rounded-xl border bg-white px-4 py-3 text-left text-sm transition-all duration-200
          ${open ? 'border-primary ring-2 ring-primary/10 shadow-md' : 'border-brand-very-soft/60 hover:border-brand-300 shadow-sm'}
        `}
      >
        <div className={`p-1.5 rounded-lg ${open || displayText ? 'bg-primary/10 text-primary' : 'bg-brand-50 text-brand-400'}`}>
          <Calendar className="w-4 h-4" />
        </div>
        <span className={`block truncate ${displayText ? 'font-semibold text-primary' : 'text-brand-400'}`}>
          {displayText || placeholder}
        </span>
        {displayText && (
          <div
            className="ml-auto p-1 text-brand-300 hover:text-brand-500 rounded-full hover:bg-brand-50 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              onChangeDate('');
              if (showTime && onChangeTime) onChangeTime('');
            }}
          >
            <X className="w-3.5 h-3.5" />
          </div>
        )}
      </button>

      {/* Dropdown Panel */}
      {open && (
        <div className="absolute z-[60] mt-2 left-0 w-[300px] sm:w-[340px] rounded-2xl border border-brand-very-soft/60 bg-white/95 backdrop-blur-xl shadow-xl animate-in fade-in zoom-in-95 duration-200 origin-top-left overflow-hidden">
          {/* Header */}
          <div className="p-4 border-b border-brand-very-soft/50 bg-brand-50/30 flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
                else setViewMonth((m) => m - 1);
              }}
              className="p-1.5 rounded-lg hover:bg-white hover:text-primary hover:shadow-sm text-brand-400 transition-all"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <div className="font-bold text-primary text-sm tracking-tight flex gap-1">
              <span>{MONTHS_ES[viewMonth]}</span>
              <span className="text-brand-400">{viewYear}</span>
            </div>

            <button
              type="button"
              onClick={() => {
                if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
                else setViewMonth((m) => m + 1);
              }}
              className="p-1.5 rounded-lg hover:bg-white hover:text-primary hover:shadow-sm text-brand-400 transition-all"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Calendar Grid */}
          <div className="p-4">
            <div className="grid grid-cols-7 gap-1 mb-2">
              {WEEKDAYS_ES.map((w) => (
                <div key={w} className="text-[10px] font-bold text-brand-400 text-center uppercase tracking-wider py-1">
                  {w}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1 text-center">
              {days.map((day, i) => {
                if (day === null) return <div key={i} className="h-9" />; // Empty cell

                const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const isSelected = dateValue === dateStr;
                const isToday = dateStr === todayStr;

                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setDate(day)}
                    className={`
                      h-9 w-9 rounded-xl text-sm font-medium transition-all duration-200 flex items-center justify-center relative
                      ${isSelected
                        ? 'bg-primary text-white shadow-md scale-105'
                        : isToday
                          ? 'bg-brand-50 text-primary font-bold border border-primary/20'
                          : 'text-brand-600 hover:bg-brand-50 hover:text-primary'
                      }
                    `}
                  >
                    {day}
                    {isToday && !isSelected && (
                      <span className="absolute bottom-1 w-1 h-1 bg-primary rounded-full"></span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Time Picker Footer */}
          {showTime && (
            <div className="p-4 border-t border-brand-very-soft/50 bg-brand-50/20 flex items-center gap-3">
              <div className="p-1.5 rounded-lg bg-brand-100 text-primary">
                <Clock className="w-4 h-4" />
              </div>
              <div className="flex gap-2 flex-1">
                <Select
                  value={timeValue.length >= 2 ? timeValue.slice(0, 2) : ''}
                  options={hourOptions}
                  onChange={(h) => {
                    const m = timeValue.length >= 5 ? timeValue.slice(3, 5) : '00';
                    onChangeTime?.(h ? `${h}:${m}` : '');
                  }}
                  placeholder="HH"
                  className="flex-1"
                />
                <span className="text-brand-300 self-center font-bold">:</span>
                <Select
                  value={timeValue.length >= 5 ? timeValue.slice(3, 5) : ''}
                  options={minuteOptions}
                  onChange={(m) => {
                    const h = timeValue.length >= 2 ? timeValue.slice(0, 2) : '12';
                    onChangeTime?.(m ? `${h}:${m}` : `${h}:00`);
                  }}
                  placeholder="MM"
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
