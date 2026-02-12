import React from 'react';

interface ChartCardProps {
  title: string;
  children: React.ReactNode;
}

export function ChartCard({ title, children }: ChartCardProps) {
  return (
    <div className="rounded-2xl border border-brand-200/60 bg-white p-5 shadow-card">
      <h3 className="text-sm font-bold uppercase tracking-wide text-brand-600 mb-4">{title}</h3>
      <div className="min-h-[200px]">
        {children}
      </div>
    </div>
  );
}
