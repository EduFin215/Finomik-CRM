import React from 'react';

interface ChartCardProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}

export function ChartCard({ title, subtitle, action, children }: ChartCardProps) {
  return (
    <div className="bg-white rounded-2xl border border-brand-very-soft/50 shadow-card p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-extrabold text-primary">{title}</h3>
          {subtitle && <p className="text-sm text-brand-muted mt-1">{subtitle}</p>}
        </div>
        {action}
      </div>
      <div className="flex-1 w-full min-h-[220px]">
        {children}
      </div>
    </div>
  );
}
