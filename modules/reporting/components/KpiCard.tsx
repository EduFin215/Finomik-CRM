import React from 'react';

interface KpiCardProps {
  value: number | string;
  label: string;
  subtext?: string;
  onClick?: () => void;
}

export function KpiCard({ value, label, subtext, onClick }: KpiCardProps) {
  const isClickable = typeof onClick === 'function';

  return (
    <div
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onClick={onClick}
      onKeyDown={isClickable ? (e) => { if (e.key === 'Enter' || e.key === ' ') onClick(); } : undefined}
      className={`rounded-2xl border border-brand-200/60 bg-white p-5 shadow-card transition-all ${
        isClickable ? 'cursor-pointer hover:border-brand-300 hover:shadow-md hover:bg-brand-100/30' : ''
      }`}
    >
      <p className="text-2xl sm:text-3xl font-bold text-primary tabular-nums">
        {typeof value === 'number' ? value.toLocaleString('es-ES') : value}
      </p>
      <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-brand-500">{label}</p>
      {subtext && <p className="mt-0.5 text-xs text-brand-400">{subtext}</p>}
    </div>
  );
}
