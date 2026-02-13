import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import {
  Plus,
  Filter,
  X,
  Repeat,
  Search,
  CreditCard,
  Briefcase,
  Calendar,
  MoreHorizontal,
  ArrowUpDown,
  DollarSign
} from 'lucide-react';
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
import { COLORS } from '../../constants';

// --- Constants ---

const CATEGORIES = ['software', 'marketing', 'office', 'travel', 'payroll', 'other'];
const CATEGORY_OPTIONS = CATEGORIES.map((c) => ({ value: c, label: c.charAt(0).toUpperCase() + c.slice(1) }));
const EXPENSE_STATUS_OPTIONS = [
  { value: 'pending', label: 'Pendiente' },
  { value: 'paid', label: 'Pagado' },
  { value: 'cancelled', label: 'Cancelado' },
];
const SORT_OPTIONS = [
  { value: 'newest', label: 'Más recientes' },
  { value: 'oldest', label: 'Más antiguos' },
  { value: 'amount', label: 'Importe alto–bajo' },
  { value: 'date', label: 'Fecha' },
];

// --- Components ---

function SummaryMetric({
  label,
  value,
  icon: Icon,
  colorClass
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  colorClass: string
}) {
  return (
    <div className="bg-white rounded-xl border border-brand-very-soft/60 p-4 flex items-start justify-between shadow-sm hover:shadow-md transition-shadow">
      <div>
        <p className="text-brand-muted text-xs font-medium uppercase tracking-wider mb-1">{label}</p>
        <p className="text-xl font-extrabold text-primary">{value}</p>
      </div>
      <div className={`p-2 rounded-lg ${colorClass}`}>
        <Icon size={20} />
      </div>
    </div>
  );
}

function SideDrawer({
  open,
  onClose,
  children,
  title
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
}) {
  if (!open) return null;
  return (
    <>
      <div className="fixed inset-0 bg-primary/20 backdrop-blur-sm z-40 transition-opacity" onClick={onClose} aria-hidden />
      <div className="fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-300">
        <div className="flex items-center justify-between p-6 border-b border-brand-very-soft/50 bg-slate-50/50">
          <h3 className="text-xl font-bold text-primary">{title || 'Detalles'}</h3>
          <button type="button" onClick={onClose} className="p-2 text-brand-muted hover:text-primary hover:bg-brand-100/50 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-brand-100">{children}</div>
      </div>
    </>
  );
}

function ExpenseFormModal({ onClose, onSave }: { onClose: () => void; onSave: (data: any) => void }) {
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
      title: title.trim() || 'Gasto sin título',
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
      title="Añadir Gasto"
      footer={
        <>
          <button type="button" onClick={onClose} className="px-4 py-2 text-brand-600 font-bold text-sm hover:bg-brand-50 rounded-xl transition-colors">Cancelar</button>
          <button type="submit" form="expense-form" className="px-5 py-2 bg-primary text-white font-bold text-sm rounded-xl hover:bg-brand-600 shadow-md transition-all">Guardar Gasto</button>
        </>
      }
    >
      <form id="expense-form" onSubmit={handleSubmit} className="space-y-5">
        <FormField label="Título del Gasto">
          <input type="text" value={title} onChange={e => setTitle(e.target.value)} className="w-full px-4 py-2.5 border border-brand-200/60 rounded-xl text-primary focus:ring-2 focus:ring-primary/10 focus:border-primary outline-none transition-all" placeholder="Ej. Adobe Creative Cloud" autoFocus />
        </FormField>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Proveedor">
            <input type="text" value={vendor} onChange={e => setVendor(e.target.value)} className="w-full px-4 py-2.5 border border-brand-200/60 rounded-xl text-primary focus:ring-2 focus:ring-primary/10 focus:border-primary outline-none transition-all" placeholder="Nombre Proveedor" />
          </FormField>
          <FormField label="Categoría">
            <Select value={category} onChange={setCategory} options={CATEGORY_OPTIONS} placeholder="Seleccionar" />
          </FormField>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2">
            <FormField label="Importe">
              <input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} className="w-full px-4 py-2.5 border border-brand-200/60 rounded-xl text-primary focus:ring-2 focus:ring-primary/10 focus:border-primary outline-none transition-all" placeholder="0.00" />
            </FormField>
          </div>
          <FormField label="Moneda">
            <input type="text" value={currency} onChange={e => setCurrency(e.target.value)} className="w-full px-4 py-2.5 border border-brand-200/60 rounded-xl text-primary focus:ring-2 focus:ring-primary/10 focus:border-primary outline-none transition-all" />
          </FormField>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Fecha del Gasto">
            <DateTimePicker dateValue={date} onChangeDate={setDate} showTime={false} placeholder="Seleccionar" />
          </FormField>
          <FormField label="Fecha Vencimiento (Opcional)">
            <DateTimePicker dateValue={dueDate} onChangeDate={setDueDate} showTime={false} placeholder="Seleccionar" />
          </FormField>
        </div>
        <div className="space-y-3">
          <FormField label="Estado">
            <Select value={status} onChange={v => setStatus(v as any)} options={EXPENSE_STATUS_OPTIONS} placeholder="Seleccionar" />
          </FormField>

          <div className="flex items-center gap-3 p-3 bg-brand-50/50 rounded-xl border border-brand-100">
            <input
              type="checkbox"
              id="recurring"
              checked={isRecurring}
              onChange={e => setIsRecurring(e.target.checked)}
              className="w-5 h-5 rounded border-brand-300 text-primary focus:ring-primary/20"
            />
            <label htmlFor="recurring" className="text-sm font-medium text-brand-700 cursor-pointer select-none">Este es un gasto recurrente (suscripción, alquiler, etc.)</label>
          </div>
        </div>
      </form>
    </FinanceModal>
  );
}

// --- Main Page Component ---

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
  const [search, setSearch] = useState('');
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
    // Search
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      list = list.filter(e => e.title.toLowerCase().includes(q) || e.vendor.toLowerCase().includes(q));
    }
    // Sort
    if (sortBy === 'oldest') list = [...list].sort((a, b) => a.date.localeCompare(b.date));
    else if (sortBy === 'amount') list = [...list].sort((a, b) => b.amount - a.amount);
    else if (sortBy === 'date') list = [...list].sort((a, b) => b.date.localeCompare(a.date));
    else list = [...list].sort((a, b) => b.date.localeCompare(a.date)); // Default newest
    return list;
  }, [expenses, sortBy, search]);

  const { data: selectedExpense } = useQuery({
    queryKey: ['finance-expense', drawerId],
    queryFn: () => getFinanceExpense(drawerId!),
    enabled: !!drawerId,
  });

  const handleAddExpense = async (data: any) => {
    await createFinanceExpense(data);
    queryClient.invalidateQueries({ queryKey: ['finance-expenses'] });
    queryClient.invalidateQueries({ queryKey: ['finance-dashboard-kpis'] });
    queryClient.invalidateQueries({ queryKey: ['finance-expenses-summary'] });
  };

  return (
    <div className="p-6 sm:p-8 max-w-[1600px] mx-auto min-h-full space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-extrabold text-primary tracking-tight">Gestión de Gastos</h1>
          <p className="text-brand-muted mt-1">Controla los gastos de la empresa y facturas recurrentes.</p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="bg-primary hover:bg-brand-600 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-brand-500/20 transition-all text-sm flex items-center gap-2"
        >
          <Plus size={18} strokeWidth={2.5} />
          Añadir Gasto
        </button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
          <SummaryMetric
            label="Total Pendiente"
            value={formatCurrency(summary.pendingTotal)}
            icon={CreditCard}
            colorClass="bg-red-50 text-red-600"
          />
          <SummaryMetric
            label="Pagado este Mes"
            value={formatCurrency(summary.paidThisMonth)}
            icon={DollarSign}
            colorClass="bg-emerald-50 text-emerald-600"
          />
          <SummaryMetric
            label="Recurrentes Activos"
            value={summary.recurringCount}
            icon={Repeat}
            colorClass="bg-indigo-50 text-indigo-600"
          />
        </div>
      )}

      {/* Filter Bar */}
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between bg-white p-2 rounded-2xl border border-brand-very-soft/50 shadow-sm">

        {/* Left: Search & Filters */}
        <div className="flex flex-1 items-center gap-3 w-full lg:w-auto">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-400 w-4 h-4" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar gastos..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border-none rounded-xl text-sm font-medium text-primary placeholder:text-brand-soft focus:ring-2 focus:ring-primary/10 transition-all"
            />
          </div>

          <div className="relative">
            <button
              onClick={() => setFilterOpen(!filterOpen)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold transition-colors ${filterOpen || filterCategory || filterFrom ? 'bg-brand-50 text-primary' : 'bg-transparent text-brand-muted hover:bg-slate-50'}`}
            >
              <Filter size={16} />
              <span>Filtrar</span>
            </button>

            {filterOpen && (
              <div className="absolute top-full left-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-brand-very-soft/60 p-4 z-50 animate-in zoom-in-95 duration-200">
                <h4 className="text-xs font-bold text-brand-muted uppercase tracking-wider mb-4 border-b border-brand-very-soft/50 pb-2">Filtrar Gastos</h4>
                <div className="space-y-4">
                  <FormField label="Categoría">
                    <Select value={filterCategory} onChange={setFilterCategory} options={[{ value: '', label: 'Todas' }, ...CATEGORY_OPTIONS]} placeholder="Todas" />
                  </FormField>
                  <FormField label="Estado">
                    <Select value={filterStatus} onChange={setFilterStatus} options={[{ value: '', label: 'Todos' }, ...EXPENSE_STATUS_OPTIONS]} placeholder="Todos" />
                  </FormField>
                  <div className="grid grid-cols-2 gap-2">
                    <FormField label="Desde">
                      <DateTimePicker dateValue={filterFrom} onChangeDate={setFilterFrom} showTime={false} placeholder="Selec." />
                    </FormField>
                    <FormField label="Hasta">
                      <DateTimePicker dateValue={filterTo} onChangeDate={setFilterTo} showTime={false} placeholder="Selec." />
                    </FormField>
                  </div>
                  <button onClick={() => setFilterOpen(false)} className="w-full py-2 bg-primary text-white rounded-xl text-sm font-bold">Aplicar Filtros</button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Sort & Pills */}
        <div className="flex items-center gap-4 w-full lg:w-auto justify-between lg:justify-end">
          <div className="flex bg-slate-50 p-1 rounded-xl">
            <button onClick={() => setPill('all')} className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all ${pill === 'all' ? 'bg-white text-primary shadow-sm ring-1 ring-black/5' : 'text-brand-muted hover:text-primary'}`}>Todos</button>
            <button onClick={() => setPill('pending')} className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all ${pill === 'pending' ? 'bg-white text-primary shadow-sm ring-1 ring-black/5' : 'text-brand-muted hover:text-primary'}`}>Pendientes</button>
            <button onClick={() => setPill('paid')} className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all ${pill === 'paid' ? 'bg-white text-primary shadow-sm ring-1 ring-black/5' : 'text-brand-muted hover:text-primary'}`}>Pagados</button>
          </div>
          <div className="w-px h-6 bg-brand-very-soft/60 mx-1 hidden lg:block" />
          <Select
            value={sortBy}
            onChange={setSortBy}
            options={SORT_OPTIONS}
            className="w-40"
            icon={<ArrowUpDown size={14} />}
          />
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-brand-very-soft/50 shadow-card overflow-hidden min-h-[400px]">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-20 text-brand-muted">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
            <p className="text-sm font-medium">Cargando...</p>
          </div>
        ) : filteredAndSortedExpenses.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-20 text-center">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-brand-muted mb-4 shadow-sm">
              <CreditCard size={32} strokeWidth={1.5} />
            </div>
            <h3 className="text-lg font-bold text-primary mb-1">No se encontraron gastos</h3>
            <p className="text-brand-muted text-sm max-w-xs mx-auto mb-6">No tienes gastos que coincidan con los filtros.</p>
            <button
              onClick={() => setModalOpen(true)}
              className="text-primary font-bold text-sm hover:underline"
            >
              Añadir tu primer gasto
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50/50 border-b border-brand-very-soft/50">
                  <th className="w-8"></th>
                  <th className="text-left py-4 px-6 text-xs font-bold text-brand-muted uppercase tracking-wider">Título</th>
                  <th className="text-left py-4 px-6 text-xs font-bold text-brand-muted uppercase tracking-wider">Proveedor</th>
                  <th className="text-left py-4 px-6 text-xs font-bold text-brand-muted uppercase tracking-wider">Categoría</th>
                  <th className="text-left py-4 px-6 text-xs font-bold text-brand-muted uppercase tracking-wider">Fecha</th>
                  <th className="text-left py-4 px-6 text-xs font-bold text-brand-muted uppercase tracking-wider">Estado</th>
                  <th className="text-right py-4 px-6 text-xs font-bold text-brand-muted uppercase tracking-wider">Importe</th>
                </tr>
              </thead>
              <tbody>
                {filteredAndSortedExpenses.map(e => (
                  <tr
                    key={e.id}
                    onClick={() => setDrawerId(e.id)}
                    className="group border-b border-brand-very-soft/30 hover:bg-brand-50/30 transition-colors cursor-pointer last:border-0"
                  >
                    <td className="w-8 pl-6">
                      {e.isRecurring && (
                        <div className="text-brand-400 group-hover:text-primary transition-colors" title="Gasto Recurrente">
                          <Repeat size={16} />
                        </div>
                      )}
                    </td>
                    <td className="py-4 px-6 font-bold text-primary group-hover:text-brand-600 transition-colors text-sm">{e.title}</td>
                    <td className="py-4 px-6 text-sm text-brand-700 font-medium">{e.vendor}</td>
                    <td className="py-4 px-6 text-sm text-brand-muted capitalize">
                      <span className="bg-brand-50 text-brand-600 px-2 py-1 rounded-md text-xs font-bold">{e.category}</span>
                    </td>
                    <td className="py-4 px-6 text-sm text-brand-muted">{e.date}</td>
                    <td className="py-4 px-6">
                      <StatusBadge status={e.status} variant="expense" />
                    </td>
                    <td className="py-4 px-6 text-right font-bold text-primary text-sm">
                      {formatCurrency(e.amount, e.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <SideDrawer
        open={!!drawerId}
        onClose={() => setDrawerId(null)}
        title="Detalles del Gasto"
      >
        {selectedExpense && (
          <div className="space-y-6">
            <div className="p-4 bg-slate-50 rounded-xl border border-brand-very-soft/50 flex justify-between items-center">
              <div>
                <p className="text-xs text-brand-muted uppercase tracking-wider mb-1">Importe Total</p>
                <p className="text-2xl font-extrabold text-primary">{formatCurrency(selectedExpense.amount, selectedExpense.currency)}</p>
              </div>
              <StatusBadge status={selectedExpense.status} variant="expense" />
            </div>

            <div className="space-y-4">
              <div className="py-3 border-b border-brand-very-soft/30">
                <span className="block text-xs text-brand-muted font-medium uppercase mb-1">Título del Gasto</span>
                <span className="text-base font-bold text-primary">{selectedExpense.title}</span>
              </div>

              <div className="flex justify-between items-center py-3 border-b border-brand-very-soft/30">
                <span className="text-sm text-brand-muted font-medium">Proveedor</span>
                <span className="text-sm font-bold text-primary">{selectedExpense.vendor}</span>
              </div>

              <div className="flex justify-between items-center py-3 border-b border-brand-very-soft/30">
                <span className="text-sm text-brand-muted font-medium">Categoría</span>
                <span className="bg-brand-50 text-brand-600 px-2.5 py-1 rounded-lg text-xs font-bold capitalize">{selectedExpense.category}</span>
              </div>

              <div className="flex justify-between items-center py-3 border-b border-brand-very-soft/30">
                <span className="text-sm text-brand-muted font-medium">Fecha del Gasto</span>
                <span className="text-sm font-medium text-primary">{selectedExpense.date}</span>
              </div>

              {selectedExpense.dueDate && (
                <div className="flex justify-between items-center py-3 border-b border-brand-very-soft/30">
                  <span className="text-sm text-brand-muted font-medium">Fecha Vencimiento</span>
                  <span className="text-sm font-medium text-primary">{selectedExpense.dueDate}</span>
                </div>
              )}

              {selectedExpense.isRecurring && (
                <div className="flex items-center gap-2 p-3 bg-brand-50/50 rounded-xl border border-brand-100 text-brand-700 font-medium text-sm">
                  <Repeat size={16} />
                  Gasto Recurrente Activo
                </div>
              )}

              <div className="pt-4 flex gap-3">
                <button className="flex-1 py-2.5 bg-brand-50 text-brand-700 border border-brand-200 rounded-xl font-bold text-sm hover:bg-brand-100 transition-colors">
                  Descargar Recibo
                </button>
                {selectedExpense.status === 'pending' && (
                  <button className="flex-1 py-2.5 bg-primary text-white rounded-xl font-bold text-sm hover:bg-brand-600 transition-colors shadow-md">
                    Marcar Pagado
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </SideDrawer>

      {modalOpen && <ExpenseFormModal onClose={() => setModalOpen(false)} onSave={handleAddExpense} />}
    </div>
  );
}
