import React from 'react';

const INVOICE_STATUS_CLASS: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-600',
  sent: 'bg-blue-100 text-blue-800',
  paid: 'bg-emerald-100 text-emerald-800',
  overdue: 'bg-red-100 text-red-800',
  cancelled: 'bg-slate-100 text-slate-500',
};

const CONTRACT_STATUS_CLASS: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-800',
  pending: 'bg-amber-100 text-amber-800',
  cancelled: 'bg-slate-100 text-slate-500',
  ended: 'bg-slate-100 text-slate-500',
};

const EXPENSE_STATUS_CLASS: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-800',
  paid: 'bg-emerald-100 text-emerald-800',
  cancelled: 'bg-slate-100 text-slate-500',
};

export type StatusBadgeVariant = 'invoice' | 'contract' | 'expense';

const VARIANT_MAP: Record<StatusBadgeVariant, Record<string, string>> = {
  invoice: INVOICE_STATUS_CLASS,
  contract: CONTRACT_STATUS_CLASS,
  expense: EXPENSE_STATUS_CLASS,
};

interface StatusBadgeProps {
  status: string;
  variant?: StatusBadgeVariant;
  className?: string;
}

export function StatusBadge({ status, variant = 'invoice', className = '' }: StatusBadgeProps) {
  const map = VARIANT_MAP[variant];
  const cls = map[status] ?? 'bg-slate-100 text-slate-600';
  return (
    <span
      className={`inline-flex px-2 py-0.5 rounded-md text-xs font-medium ${cls} ${className}`}
    >
      {status}
    </span>
  );
}
