import React from 'react';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';

interface KpiCardProps {
  value: number | string;
  label: string;
  subtext?: string;
  trend?: number;
  trendLabel?: string;
  icon?: React.ElementType;
  trendColor?: 'green' | 'red' | 'neutral';
  onClick?: () => void;
  delay?: number;
}

export function KpiCard({
  value,
  label,
  subtext,
  trend,
  trendLabel,
  icon: Icon,
  trendColor = 'green',
  onClick,
  delay = 0
}: KpiCardProps) {
  const isClickable = typeof onClick === 'function';
  const isPositive = trend && trend >= 0;
  const TrendIcon = trend ? (isPositive ? ArrowUpRight : ArrowDownRight) : Minus;

  const trendTextColor = trendColor === 'green' ? 'text-emerald-600' : trendColor === 'red' ? 'text-rose-600' : 'text-slate-500';
  const trendBgColor = trendColor === 'green' ? 'bg-emerald-50' : trendColor === 'red' ? 'bg-rose-50' : 'bg-slate-50';

  return (
    <div
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onClick={onClick}
      onKeyDown={isClickable ? (e) => { if (e.key === 'Enter' || e.key === ' ') onClick(); } : undefined}
      style={{ animationDelay: `${delay}ms` }}
      className={`bg-white rounded-2xl border border-brand-very-soft/50 shadow-sm p-5 flex flex-col justify-between h-full animate-in fade-in slide-in-from-bottom-4 fill-mode-backwards transition-all duration-300 ${isClickable ? 'cursor-pointer hover:border-brand-300 hover:shadow-md hover:-translate-y-1' : ''
        }`}
    >
      <div className="flex justify-between items-start mb-3">
        {Icon ? (
          <div className="p-2.5 bg-brand-50 rounded-xl text-primary">
            <Icon className="w-5 h-5" />
          </div>
        ) : (
          <div className="h-10"></div> // Spacer if no icon
        )}

        {trend != null && (
          <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${trendBgColor} ${trendTextColor}`}>
            <TrendIcon className="w-3 h-3" />
            <span>{Math.abs(trend)}%</span>
          </div>
        )}
      </div>

      <div>
        <p className="text-brand-muted text-xs font-bold uppercase tracking-wider mb-1">{label}</p>
        <h3 className="text-2xl sm:text-3xl font-extrabold text-primary tracking-tight leading-tight">
          {typeof value === 'number' ? value.toLocaleString('es-ES') : value}
        </h3>
        {(subtext || trendLabel) && (
          <p className="text-xs text-brand-soft mt-1.5 font-medium">{subtext || trendLabel}</p>
        )}
      </div>
    </div>
  );
}
