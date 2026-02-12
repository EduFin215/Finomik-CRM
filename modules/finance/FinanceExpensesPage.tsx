import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { Plus, Filter, X, Repeat } from 'lucide-react';
import {
  listFinanceExpenses,
  getFinanceExpense,
  createFinanceExpense,
} from '../../services/finance';
import type { FinanceExpense } from '../../types';
import { formatCurrency } from './formatCurrency';

const STATUS_BADGE: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-800',
  paid: 'bg-emerald-100 text-emerald-800',
  cancelled: 'bg-slate-100 text-slate-600',
};

const CATEGORIES = ['software', 'marketing', 'office', 'travel', 'payroll', 'other'];

function SideDrawer({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <>
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} aria-hidden />
      <div className="fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-xl z-50 flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-brand-200">
          <h3 className="text-lg font-bold text-primary">Expense details</h3>
          <button type="button" onClick={onClose} className="p-2 text-slate-500 hover:text-primary">
            <X size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-auto p-4">{children}</div>
      </div>
    </>
  );
}

function ExpenseFormModal({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (data: Omit<FinanceExpense, 'id' | 'createdAt' | 'updatedAt'>) => void;
}) {
  const [title, setTitle] = useState('');
  const [vendor, setVendor] = useState('');
  const [category, setCategory] = useState('other');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('EUR');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState('');
  const [status, setStatus] = useState<FinanceExpense['status']>('pending');
  const [isRecurring, setIsRecurring] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      title: title.trim() || 'Untitled expense',
      vendor: vendor.trim() || '–',
      category,
      amount: parseFloat(amount) || 0,
      currency,
      date,
      dueDate: dueDate || null,
      status,
      isRecurring,
      recurrenceRule: null,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} aria-hidden />
      <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full p-6 max-h-[90vh] overflow-auto">
        <h2 className="text-xl font-bold text-primary mb-4">Add Expense</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-brand-200 rounded-lg text-primary"
              placeholder="e.g. SaaS subscription"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Vendor</label>
            <input
              type="text"
              value={vendor}
              onChange={(e) => setVendor(e.target.value)}
              className="w-full px-3 py-2 border border-brand-200 rounded-lg text-primary"
              placeholder="Vendor name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 border border-brand-200 rounded-lg text-primary"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Amount</label>
              <input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-3 py-2 border border-brand-200 rounded-lg text-primary"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Currency</label>
              <input
                type="text"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full px-3 py-2 border border-brand-200 rounded-lg text-primary"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 border border-brand-200 rounded-lg text-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Due date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 border border-brand-200 rounded-lg text-primary"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as FinanceExpense['status'])}
              className="w-full px-3 py-2 border border-brand-200 rounded-lg text-primary"
            >
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="recurring"
              checked={isRecurring}
              onChange={(e) => setIsRecurring(e.target.checked)}
              className="rounded border-brand-200"
            />
            <label htmlFor="recurring" className="text-sm text-slate-700">Recurring expense</label>
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">
              Cancel
            </button>
            <button type="submit" className="px-4 py-2 bg-primary text-white rounded-lg font-medium hover:opacity-90">
              Add Expense
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function FinanceExpensesPage() {
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const [filterCategory, setFilterCategory] = useState<string>(() => searchParams.get('category') || '');
  const [filterStatus, setFilterStatus] = useState<string>(() => searchParams.get('status') || '');
  const [filterFrom, setFilterFrom] = useState<string>(() => searchParams.get('from') || '');
  const [filterTo, setFilterTo] = useState<string>(() => searchParams.get('to') || '');
  const queryClient = useQueryClient();

  useEffect(() => {
    const cat = searchParams.get('category');
    const status = searchParams.get('status');
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    if (cat !== null) setFilterCategory(cat || '');
    if (status !== null) setFilterStatus(status || '');
    if (from) setFilterFrom(from);
    if (to) setFilterTo(to);
  }, [searchParams]);

  const { data: expenses = [], isLoading } = useQuery({
    queryKey: ['finance-expenses', filterCategory || undefined, filterStatus || undefined, filterFrom || undefined, filterTo || undefined],
    queryFn: () =>
      listFinanceExpenses({
        category: filterCategory || undefined,
        status: filterStatus ? (filterStatus as FinanceExpense['status']) : undefined,
        fromDate: filterFrom || undefined,
        toDate: filterTo || undefined,
      }),
  });
  const { data: selectedExpense } = useQuery({
    queryKey: ['finance-expense', drawerId],
    queryFn: () => getFinanceExpense(drawerId!),
    enabled: !!drawerId,
  });

  const handleAddExpense = async (data: Omit<FinanceExpense, 'id' | 'createdAt' | 'updatedAt'>) => {
    await createFinanceExpense(data);
    queryClient.invalidateQueries({ queryKey: ['finance-expenses'] });
    queryClient.invalidateQueries({ queryKey: ['finance-dashboard-kpis'] });
    queryClient.invalidateQueries({ queryKey: ['finance-expenses-by-category'] });
    queryClient.invalidateQueries({ queryKey: ['finance-upcoming-recurring'] });
  };

  return (
    <div className="p-6 sm:p-8 max-w-6xl mx-auto bg-slate-50/50 min-h-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-title text-primary mb-1">Expenses</h1>
          <p className="text-slate-600 text-sm">Track and manage expenses.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setFilterOpen((o) => !o)}
            className="inline-flex items-center gap-2 px-4 py-2 border border-brand-200 bg-white rounded-lg text-slate-700 hover:bg-slate-50"
          >
            <Filter size={18} />
            Filter
          </button>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg font-medium hover:opacity-90"
          >
            <Plus size={18} />
            Add Expense
          </button>
        </div>
      </div>

      {filterOpen && (
        <div className="mb-4 p-4 bg-white rounded-xl border border-brand-200 flex flex-wrap items-center gap-3">
          <div>
            <label className="block text-xs text-slate-500 mb-1">Category</label>
            <select
              value={filterCategory}
              onChange={(e) => {
                const v = e.target.value;
                setFilterCategory(v);
                setSearchParams((p) => { const n = new URLSearchParams(p); if (v) n.set('category', v); else n.delete('category'); return n; });
              }}
              className="px-3 py-2 border border-brand-200 rounded-lg text-sm text-primary"
            >
              <option value="">All</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => {
                const v = e.target.value;
                setFilterStatus(v);
                setSearchParams((p) => { const n = new URLSearchParams(p); if (v) n.set('status', v); else n.delete('status'); return n; });
              }}
              className="px-3 py-2 border border-brand-200 rounded-lg text-sm text-primary"
            >
              <option value="">All</option>
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">From</label>
            <input
              type="date"
              value={filterFrom}
              onChange={(e) => {
                const v = e.target.value;
                setFilterFrom(v);
                setSearchParams((p) => { const n = new URLSearchParams(p); if (v) n.set('from', v); else n.delete('from'); return n; });
              }}
              className="px-3 py-2 border border-brand-200 rounded-lg text-sm text-primary"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">To</label>
            <input
              type="date"
              value={filterTo}
              onChange={(e) => {
                const v = e.target.value;
                setFilterTo(v);
                setSearchParams((p) => { const n = new URLSearchParams(p); if (v) n.set('to', v); else n.delete('to'); return n; });
              }}
              className="px-3 py-2 border border-brand-200 rounded-lg text-sm text-primary"
            />
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-brand-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-slate-500">Loading…</div>
        ) : expenses.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-slate-500 mb-4">No expenses yet.</p>
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="text-primary font-medium hover:underline"
            >
              Add your first expense
            </button>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-brand-200 bg-slate-50/80">
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700 w-8" />
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Title</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Vendor</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Category</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Amount</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Date</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Status</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((e) => (
                <tr
                  key={e.id}
                  onClick={() => setDrawerId(e.id)}
                  className="border-b border-brand-100 hover:bg-slate-50/80 cursor-pointer transition-colors"
                >
                  <td className="py-3 px-4">
                    {e.isRecurring && <Repeat size={16} className="text-slate-400" title="Recurring" />}
                  </td>
                  <td className="py-3 px-4 font-medium text-primary">{e.title}</td>
                  <td className="py-3 px-4 text-slate-600">{e.vendor}</td>
                  <td className="py-3 px-4 text-slate-600">{e.category}</td>
                  <td className="py-3 px-4">{formatCurrency(e.amount, e.currency)}</td>
                  <td className="py-3 px-4 text-slate-600">{e.date}</td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${STATUS_BADGE[e.status] ?? 'bg-slate-100'}`}>
                      {e.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <SideDrawer open={!!drawerId} onClose={() => setDrawerId(null)}>
        {selectedExpense && (
          <dl className="space-y-3">
            <div><dt className="text-xs text-slate-500">Title</dt><dd className="font-medium text-primary">{selectedExpense.title}</dd></div>
            <div><dt className="text-xs text-slate-500">Vendor</dt><dd>{selectedExpense.vendor}</dd></div>
            <div><dt className="text-xs text-slate-500">Category</dt><dd>{selectedExpense.category}</dd></div>
            <div><dt className="text-xs text-slate-500">Amount</dt><dd>{formatCurrency(selectedExpense.amount, selectedExpense.currency)}</dd></div>
            <div><dt className="text-xs text-slate-500">Date</dt><dd>{selectedExpense.date}</dd></div>
            <div><dt className="text-xs text-slate-500">Due date</dt><dd>{selectedExpense.dueDate ?? '–'}</dd></div>
            <div><dt className="text-xs text-slate-500">Status</dt><dd><span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${STATUS_BADGE[selectedExpense.status] ?? ''}`}>{selectedExpense.status}</span></dd></div>
            {selectedExpense.isRecurring && <div><dt className="text-xs text-slate-500">Recurring</dt><dd>Yes</dd></div>}
          </dl>
        )}
      </SideDrawer>

      {modalOpen && <ExpenseFormModal onClose={() => setModalOpen(false)} onSave={handleAddExpense} />}
    </div>
  );
}
