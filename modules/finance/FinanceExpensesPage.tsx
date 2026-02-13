import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { Plus, Filter, X, Repeat } from 'lucide-react';
import {
  listFinanceExpenses,
  getFinanceExpense,
  createFinanceExpense,
  getExpensesSummary,
} from '../../services/finance';
import type { FinanceExpense } from '../../types';
import { formatCurrency } from './formatCurrency';
import { DateTimePicker } from '../tasks/DateTimePicker';
import { Select } from '../tasks/Select';
import { FinanceModal, FormField, StatusBadge } from './components';

const CATEGORIES = ['software', 'marketing', 'office', 'travel', 'payroll', 'other'];
const CATEGORY_OPTIONS = CATEGORIES.map((c) => ({ value: c, label: c }));
const EXPENSE_STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'paid', label: 'Paid' },
  { value: 'cancelled', label: 'Cancelled' },
];
const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'amount', label: 'Amount high–low' },
  { value: 'date', label: 'Date' },
];

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
    <FinanceModal
      open
      onClose={onClose}
      title="Add Expense"
      footer={
        <>
          <button type="button" onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-medium">
            Cancel
          </button>
          <button type="submit" form="expense-form" className="px-4 py-2 bg-primary text-white rounded-xl font-medium hover:opacity-90">
            Add Expense
          </button>
        </>
      }
    >
      <form id="expense-form" onSubmit={handleSubmit} className="space-y-4">
        <FormField label="Title">
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full px-3 py-2 border border-brand-200 rounded-xl text-primary" placeholder="e.g. SaaS subscription" />
        </FormField>
        <FormField label="Vendor">
          <input type="text" value={vendor} onChange={(e) => setVendor(e.target.value)} className="w-full px-3 py-2 border border-brand-200 rounded-xl text-primary" placeholder="Vendor name" />
        </FormField>
        <FormField label="Category">
          <Select value={category} onChange={setCategory} options={CATEGORY_OPTIONS} placeholder="Select" />
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Amount">
            <input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full px-3 py-2 border border-brand-200 rounded-xl text-primary" placeholder="0" />
          </FormField>
          <FormField label="Currency">
            <input type="text" value={currency} onChange={(e) => setCurrency(e.target.value)} className="w-full px-3 py-2 border border-brand-200 rounded-xl text-primary" />
          </FormField>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Date">
            <DateTimePicker dateValue={date} onChangeDate={setDate} showTime={false} placeholder="Select" />
          </FormField>
          <FormField label="Due date">
            <DateTimePicker dateValue={dueDate} onChangeDate={setDueDate} showTime={false} placeholder="Select" />
          </FormField>
        </div>
        <FormField label="Status">
          <Select value={status} onChange={(v) => setStatus(v as FinanceExpense['status'])} options={EXPENSE_STATUS_OPTIONS} placeholder="Select" />
        </FormField>
        <div className="flex items-center gap-2">
          <input type="checkbox" id="recurring" checked={isRecurring} onChange={(e) => setIsRecurring(e.target.checked)} className="rounded border-brand-200" />
          <label htmlFor="recurring" className="text-sm text-slate-700">Recurring expense</label>
        </div>
      </form>
    </FinanceModal>
  );
}

export default function FinanceExpensesPage() {
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [searchParams] = useSearchParams();
  const [pill, setPill] = useState<'all' | 'pending' | 'paid'>('all');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const queryClient = useQueryClient();

  useEffect(() => {
    if (searchParams.get('filter') === 'overdue') setPill('pending');
  }, [searchParams]);

  const { data: summary } = useQuery({
    queryKey: ['finance-expenses-summary'],
    queryFn: getExpensesSummary,
  });
  const expenseListParams = useMemo(() => {
    const p: { category?: string; status?: FinanceExpense['status']; fromDate?: string; toDate?: string } = {};
    if (filterStatus) p.status = filterStatus as FinanceExpense['status'];
    else if (pill === 'pending') p.status = 'pending';
    else if (pill === 'paid') p.status = 'paid';
    if (filterCategory) p.category = filterCategory;
    if (filterFrom) p.fromDate = filterFrom;
    if (filterTo) p.toDate = filterTo;
    return Object.keys(p).length ? p : undefined;
  }, [pill, filterCategory, filterStatus, filterFrom, filterTo]);
  const { data: expenses = [], isLoading } = useQuery({
    queryKey: ['finance-expenses', expenseListParams],
    queryFn: () => listFinanceExpenses(expenseListParams),
  });
  const filteredAndSortedExpenses = useMemo(() => {
    let list = expenses;
    if (sortBy === 'oldest') list = [...list].sort((a, b) => a.date.localeCompare(b.date));
    else if (sortBy === 'amount') list = [...list].sort((a, b) => b.amount - a.amount);
    else if (sortBy === 'date') list = [...list].sort((a, b) => b.date.localeCompare(a.date));
    else list = [...list].sort((a, b) => b.date.localeCompare(a.date));
    return list;
  }, [expenses, sortBy]);
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
    queryClient.invalidateQueries({ queryKey: ['finance-expenses-summary'] });
    queryClient.invalidateQueries({ queryKey: ['finance-payable-owing'] });
  };

  return (
    <div className="p-6 sm:p-8 max-w-6xl mx-auto bg-slate-50/50 min-h-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-title text-primary mb-1">Expenses</h1>
          <p className="text-slate-600 text-sm">Track and manage expenses.</p>
        </div>
        <button type="button" onClick={() => setModalOpen(true)} className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl font-medium hover:opacity-90">
          <Plus size={18} />
          Add expense
        </button>
      </div>

      {summary && (
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-brand-200/60 p-4">
            <p className="text-xs text-brand-500 font-body mb-1">Pending total</p>
            <p className="text-lg font-bold text-primary">{formatCurrency(summary.pendingTotal)}</p>
          </div>
          <div className="bg-white rounded-xl border border-brand-200/60 p-4">
            <p className="text-xs text-brand-500 font-body mb-1">Paid this month</p>
            <p className="text-lg font-bold text-primary">{formatCurrency(summary.paidThisMonth)}</p>
          </div>
          <div className="bg-white rounded-xl border border-brand-200/60 p-4">
            <p className="text-xs text-brand-500 font-body mb-1">Recurring</p>
            <p className="text-lg font-bold text-primary">{summary.recurringCount}</p>
          </div>
        </section>
      )}

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative">
          <button type="button" onClick={() => setFilterOpen((o) => !o)} className="inline-flex items-center gap-2 px-4 py-2 border border-brand-200 bg-white rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50">
            <Filter size={18} />
            Filter
          </button>
          {filterOpen && (
            <>
              <div className="fixed inset-0 z-40" aria-hidden onClick={() => setFilterOpen(false)} />
              <div className="absolute left-0 top-full z-50 mt-2 w-72 p-4 bg-white rounded-xl border border-brand-200 shadow-lg">
                <FormField label="Category" className="mb-3">
                  <Select value={filterCategory} onChange={setFilterCategory} options={[{ value: '', label: 'All' }, ...CATEGORY_OPTIONS]} placeholder="All" />
                </FormField>
                <FormField label="Status" className="mb-3">
                  <Select value={filterStatus} onChange={setFilterStatus} options={[{ value: '', label: 'All' }, ...EXPENSE_STATUS_OPTIONS]} placeholder="All" />
                </FormField>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <FormField label="From">
                    <DateTimePicker dateValue={filterFrom} onChangeDate={setFilterFrom} showTime={false} placeholder="From" />
                  </FormField>
                  <FormField label="To">
                    <DateTimePicker dateValue={filterTo} onChangeDate={setFilterTo} showTime={false} placeholder="To" />
                  </FormField>
                </div>
                <button type="button" onClick={() => setFilterOpen(false)} className="w-full py-2 bg-primary text-white rounded-xl font-medium text-sm">
                  Apply filters
                </button>
              </div>
            </>
          )}
        </div>
        <Select value={sortBy} onChange={setSortBy} options={SORT_OPTIONS} placeholder="Sort" className="w-40" />
        <div className="flex flex-wrap gap-1">
          {(['all', 'pending', 'paid'] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPill(p)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium ${pill === p ? 'bg-primary text-white' : 'bg-white border border-brand-200 text-slate-600 hover:bg-slate-50'}`}
            >
              {p === 'all' && `All (${expenses.length})`}
              {p === 'pending' && `Pending (${expenses.filter((e) => e.status === 'pending').length})`}
              {p === 'paid' && `Paid (${expenses.filter((e) => e.status === 'paid').length})`}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-brand-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-slate-500">Loading…</div>
        ) : filteredAndSortedExpenses.length === 0 ? (
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
              {filteredAndSortedExpenses.map((e) => (
                <tr key={e.id} onClick={() => setDrawerId(e.id)} className="border-b border-brand-100 hover:bg-slate-50/80 cursor-pointer transition-colors">
                  <td className="py-3 px-4 w-8">{e.isRecurring && <Repeat size={16} className="text-slate-400" title="Recurring" />}</td>
                  <td className="py-3 px-4 font-medium text-primary">{e.title}</td>
                  <td className="py-3 px-4 text-slate-600">{e.vendor}</td>
                  <td className="py-3 px-4 text-slate-600">{e.category}</td>
                  <td className="py-3 px-4">{formatCurrency(e.amount, e.currency)}</td>
                  <td className="py-3 px-4 text-slate-600">{e.date}</td>
                  <td className="py-3 px-4">
                    <StatusBadge status={e.status} variant="expense" />
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
            <div><dt className="text-xs text-slate-500">Status</dt><dd><StatusBadge status={selectedExpense.status} variant="expense" /></dd></div>
            {selectedExpense.isRecurring && <div><dt className="text-xs text-slate-500">Recurring</dt><dd>Yes</dd></div>}
          </dl>
        )}
      </SideDrawer>

      {modalOpen && <ExpenseFormModal onClose={() => setModalOpen(false)} onSave={handleAddExpense} />}
    </div>
  );
}
