import React, { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Filter, Download, PlusCircle, CheckCircle2, XCircle } from 'lucide-react';
import { useCRM } from '../context/CRMContext';
import type { Expense } from '../types';
import { getExpenses, createExpense, updateExpense, markExpensesExported, buildAccountingExportRows } from '../services/expenses';
import NewExpenseModal from './NewExpenseModal';

const startOfMonth = () => {
  const d = new Date();
  d.setDate(1);
  return d.toISOString().slice(0, 10);
};

const today = () => new Date().toISOString().slice(0, 10);

const ExpensesView: React.FC = () => {
  const queryClient = useQueryClient();
  const { schools } = useCRM();

  const [fromDate, setFromDate] = useState<string>(startOfMonth());
  const [toDate, setToDate] = useState<string>(today());
  const [onlyUnpaid, setOnlyUnpaid] = useState(false);
  const [onlyUnexported, setOnlyUnexported] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const { data: expenses = [], isLoading } = useQuery({
    queryKey: ['expenses', { fromDate, toDate, onlyUnexported }],
    queryFn: () => getExpenses({ fromDate, toDate, onlyUnexported }),
  });

  const schoolById = useMemo(
    () => new Map(schools.map((s) => [s.id, s.name] as const)),
    [schools],
  );

  const filteredExpenses = useMemo(
    () => (onlyUnpaid ? expenses.filter((e) => !e.paid) : expenses),
    [expenses, onlyUnpaid],
  );

  const { totalThisPeriod, totalPending } = useMemo(() => {
    let total = 0;
    let pending = 0;
    for (const e of filteredExpenses) {
      total += e.totalAmount;
      if (!e.paid) pending += e.totalAmount;
    }
    return { totalThisPeriod: total, totalPending: pending };
  }, [filteredExpenses]);

  const handleCreated = async (payload: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>) => {
    await createExpense(payload);
    await queryClient.invalidateQueries({ queryKey: ['expenses'] });
    setModalOpen(false);
  };

  const togglePaid = async (expense: Expense) => {
    await updateExpense(expense.id, {
      paid: !expense.paid,
      paidDate: !expense.paid ? today() : null,
    });
    await queryClient.invalidateQueries({ queryKey: ['expenses'] });
  };

  const handleExport = async () => {
    if (filteredExpenses.length === 0) return;

    const rows = buildAccountingExportRows(filteredExpenses);
    const header = Object.keys(rows[0] ?? {});
    const escapeCell = (value: unknown) => {
      if (value == null) return '';
      const str = String(value);
      if (/[",;\n]/.test(str)) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };
    const csvLines = [
      header.join(','),
      ...rows.map((r) => header.map((key) => escapeCell((r as Record<string, unknown>)[key])).join(',')),
    ];
    const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const datePart = fromDate === toDate ? fromDate : `${fromDate}_a_${toDate}`;
    link.download = `gastos-finomik-${datePart}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    if (onlyUnexported) {
      await markExpensesExported(filteredExpenses.map((e) => e.id));
      await queryClient.invalidateQueries({ queryKey: ['expenses'] });
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 h-full flex flex-col min-h-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div className="min-w-0">
          <h2 className="text-xl sm:text-2xl font-extrabold text-primary">Gastos</h2>
          <p className="text-brand-500 font-body text-sm">
            Registra gastos y expórtalos fácilmente a tu ERP contable.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-white text-sm font-bold hover:bg-brand-600 shadow-md shadow-primary/20"
          >
            <PlusCircle size={18} />
            Nuevo gasto
          </button>
          <button
            type="button"
            onClick={handleExport}
            className="bg-white text-brand-600 px-4 py-2 border border-brand-200 rounded-lg text-sm font-bold hover:bg-brand-100/50 transition-all flex items-center gap-2 disabled:opacity-50"
            disabled={filteredExpenses.length === 0}
          >
            <Download size={16} /> Exportar CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 shrink-0">
        <div className="bg-white rounded-xl border border-brand-200 p-4 shadow-sm">
          <p className="text-xs font-bold text-brand-500 uppercase tracking-wider mb-1">Gasto en el periodo</p>
          <p className="text-2xl font-extrabold text-primary">
            {totalThisPeriod.toFixed(2)} €
          </p>
        </div>
        <div className="bg-white rounded-xl border border-brand-200 p-4 shadow-sm">
          <p className="text-xs font-bold text-brand-500 uppercase tracking-wider mb-1">Pendiente de pago</p>
          <p className="text-2xl font-extrabold text-primary">
            {totalPending.toFixed(2)} €
          </p>
        </div>
      </div>

      <div className="bg-white p-3 sm:p-4 rounded-xl border border-brand-200 flex flex-wrap items-center gap-3 sm:gap-4 shrink-0">
        <div className="flex items-center gap-2 text-brand-500 text-xs font-bold uppercase tracking-wider border-r pr-3 border-brand-200">
          <Filter size={14} /> Filtros
        </div>
        <div className="flex items-center gap-2 text-xs font-body">
          <span className="text-brand-500 font-bold">Desde</span>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="px-2 py-1 rounded-lg border border-brand-200 text-xs text-primary font-body focus:ring-1 focus:ring-primary focus:border-transparent outline-none"
          />
          <span className="text-brand-500 font-bold">Hasta</span>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="px-2 py-1 rounded-lg border border-brand-200 text-xs text-primary font-body focus:ring-1 focus:ring-primary focus:border-transparent outline-none"
          />
        </div>
        <div className="flex items-center gap-3 text-xs font-body">
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={onlyUnpaid}
              onChange={(e) => setOnlyUnpaid(e.target.checked)}
              className="w-4 h-4 rounded border-brand-300 text-primary focus:ring-primary"
            />
            <span className="text-primary">Sólo pendientes de pago</span>
          </label>
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={onlyUnexported}
              onChange={(e) => setOnlyUnexported(e.target.checked)}
              className="w-4 h-4 rounded border-brand-300 text-primary focus:ring-primary"
            />
            <span className="text-primary">Sólo no exportados</span>
          </label>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-brand-200 shadow-sm overflow-hidden flex-1 flex flex-col min-h-0">
        <div className="overflow-x-auto overflow-y-auto flex-1">
          <table className="w-full text-left border-collapse min-w-[640px]">
            <thead className="sticky top-0 bg-brand-100/30 z-10 border-b border-brand-200">
              <tr className="text-brand-400 text-[11px] font-bold uppercase tracking-wider">
                <th className="py-3 px-3 sm:px-4">Fecha</th>
                <th className="py-3 px-3 sm:px-4">Proveedor</th>
                <th className="py-3 px-3 sm:px-4">Descripción</th>
                <th className="py-3 px-3 sm:px-4 text-right">Total</th>
                <th className="py-3 px-3 sm:px-4 hidden md:table-cell">Centro</th>
                <th className="py-3 px-3 sm:px-4 text-center">Estado</th>
                <th className="py-3 px-3 sm:px-4 text-center hidden sm:table-cell">Exportado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-100">
              {filteredExpenses.map((expense) => {
                const schoolName = expense.schoolId ? schoolById.get(expense.schoolId) ?? '' : '';
                return (
                  <tr key={expense.id} className="hover:bg-brand-100/30 transition-colors">
                    <td className="py-3 px-3 sm:px-4 text-sm text-primary font-body">
                      {expense.date}
                    </td>
                    <td className="py-3 px-3 sm:px-4">
                      <div className="flex flex-col min-w-0">
                        <span className="text-sm font-bold text-primary truncate">{expense.supplierName}</span>
                        {expense.documentNumber && (
                          <span className="text-[10px] text-brand-400 font-body truncate">
                            Doc: {expense.documentNumber}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-3 sm:px-4">
                      <span className="text-sm text-brand-500 font-body truncate max-w-xs sm:max-w-sm block">
                        {expense.description}
                      </span>
                    </td>
                    <td className="py-3 px-3 sm:px-4 text-right text-sm font-bold text-primary">
                      {expense.totalAmount.toFixed(2)} €
                    </td>
                    <td className="py-3 px-3 sm:px-4 text-xs text-brand-500 font-body hidden md:table-cell">
                      {schoolName || '-'}
                    </td>
                    <td className="py-3 px-3 sm:px-4 text-center">
                      <button
                        type="button"
                        onClick={() => void togglePaid(expense)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border transition-colors ${
                          expense.paid
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}
                      >
                        {expense.paid ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                        {expense.paid ? 'Pagado' : 'Pendiente'}
                      </button>
                    </td>
                    <td className="py-3 px-3 sm:px-4 text-center text-[11px] hidden sm:table-cell">
                      {expense.exportedAt ? (
                        <span className="inline-flex px-2 py-0.5 rounded-full bg-brand-100 text-brand-600 font-bold">
                          Sí
                        </span>
                      ) : (
                        <span className="inline-flex px-2 py-0.5 rounded-full bg-slate-50 text-brand-400 font-body">
                          No
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {!isLoading && filteredExpenses.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-brand-400">
            <Filter size={40} className="mb-3 opacity-20" />
            <p className="text-base sm:text-lg font-bold">No hay gastos en el periodo seleccionado</p>
            <p className="text-xs sm:text-sm font-body mt-1">Ajusta las fechas o crea tu primer gasto.</p>
          </div>
        )}
      </div>

      {modalOpen && (
        <NewExpenseModal
          onClose={() => setModalOpen(false)}
          onSave={async (payload) => {
            await handleCreated(payload);
          }}
        />
      )}
    </div>
  );
};

export default ExpensesView;

