import React, { useMemo, useState } from 'react';
import type { EsBankAccount, EsBankMovement } from '../types';
import { Banknote, Calendar as CalendarIcon } from 'lucide-react';

function formatDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

const MOCK_ACCOUNTS: EsBankAccount[] = [
  {
    id: 'acc-1',
    name: 'Cuenta BBVA',
    iban: null,
    entity: 'BBVA',
    accountCode: '5720001',
    currency: 'EUR',
  },
  {
    id: 'acc-2',
    name: 'Cuenta Santander',
    iban: null,
    entity: 'Santander',
    accountCode: '5720002',
    currency: 'EUR',
  },
];

const MOCK_MOVEMENTS: EsBankMovement[] = [
  {
    id: 'mov-1',
    bankAccountId: 'acc-1',
    operationDate: '2025-01-05',
    valueDate: '2025-01-05',
    concept: 'Cobro factura S-2025/0001',
    amount: 1210,
    balanceAfter: 5000,
    reference: 'REF-001',
    matched: true,
  },
  {
    id: 'mov-2',
    bankAccountId: 'acc-1',
    operationDate: '2025-01-10',
    valueDate: '2025-01-10',
    concept: 'Pago proveedor SaaS',
    amount: -363,
    balanceAfter: 4637,
    reference: 'REF-002',
    matched: false,
  },
];

const BillingBankTab: React.FC = () => {
  const accounts = MOCK_ACCOUNTS;

  const today = new Date();
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(
    accounts[0]?.id ?? null
  );
  const [fromDate, setFromDate] = useState(formatDate(firstOfMonth));
  const [toDate, setToDate] = useState(formatDate(today));

  const activeAccount = useMemo(
    () => accounts.find((a) => a.id === selectedAccountId) ?? accounts[0],
    [accounts, selectedAccountId]
  );

  const { movements, isLoading } = useMemo(() => {
    const movements = MOCK_MOVEMENTS.filter(
      (m) =>
        m.bankAccountId === activeAccount?.id &&
        m.operationDate >= fromDate &&
        m.operationDate <= toDate,
    );
    return { movements, isLoading: false };
  }, [activeAccount?.id, fromDate, toDate]);

  return (
    <div className="bg-white rounded-2xl border border-brand-200/80 shadow-sm p-6 sm:p-7">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-lg sm:text-xl font-title text-primary mb-1">Banco y conciliación</h3>
          <p className="text-xs sm:text-sm text-slate-600 font-body">
            Visualiza los movimientos bancarios de tus cuentas y prepara la conciliación.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-body">Cuenta</span>
            <select
              value={activeAccount?.id ?? ''}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              className="px-3 py-2 rounded-lg border border-brand-200 text-xs sm:text-sm font-body bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            >
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} ({acc.entity || acc.currency})
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2 text-xs sm:text-sm">
            <CalendarIcon size={14} className="text-slate-500" />
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="px-2 py-1.5 rounded-lg border border-brand-200 text-xs font-body bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
            <span className="text-slate-500">–</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="px-2 py-1.5 rounded-lg border border-brand-200 text-xs font-body bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
        </div>
      </div>

      <div className="border border-brand-200 rounded-xl overflow-hidden bg-white max-h-[480px] sm:max-h-[540px] flex flex-col">
        <div className="overflow-x-auto overflow-y-auto flex-1">
          <table className="w-full text-left border-collapse min-w-[640px]">
            <thead className="sticky top-0 bg-brand-100/40 z-10 border-b border-brand-200">
              <tr className="text-[10px] sm:text-[11px] text-brand-500 font-bold uppercase tracking-wider">
                <th className="py-3 px-3 sm:px-4">Fecha</th>
                <th className="py-3 px-3 sm:px-4 hidden md:table-cell">Valor</th>
                <th className="py-3 px-3 sm:px-4">Concepto</th>
                <th className="py-3 px-3 sm:px-4 text-right">Importe</th>
                <th className="py-3 px-3 sm:px-4 text-right hidden lg:table-cell">Saldo</th>
                <th className="py-3 px-3 sm:px-4 text-center w-10">Conciliado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-100 text-xs sm:text-sm font-body">
              {isLoading && (
                <tr>
                  <td colSpan={6} className="py-6 px-4 text-center text-slate-500 text-sm">
                    Cargando movimientos…
                  </td>
                </tr>
              )}
              {!isLoading && movements.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-6 px-4 text-center text-slate-500 text-sm">
                    No hay movimientos para el periodo seleccionado.
                  </td>
                </tr>
              )}
              {!isLoading &&
                movements.map((m) => (
                  <tr key={m.id} className="hover:bg-brand-100/20 transition-colors">
                    <td className="py-3 px-3 sm:px-4 text-slate-700">{m.operationDate}</td>
                    <td className="py-3 px-3 sm:px-4 text-slate-700 hidden md:table-cell">
                      {m.valueDate ?? '—'}
                    </td>
                    <td className="py-3 px-3 sm:px-4 text-slate-800 truncate max-w-[260px]">
                      {m.concept}
                    </td>
                    <td className="py-3 px-3 sm:px-4 text-right">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                          m.amount >= 0
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-red-50 text-red-700'
                        }`}
                      >
                        <Banknote size={12} />
                        {m.amount.toFixed(2)} {activeAccount?.currency ?? 'EUR'}
                      </span>
                    </td>
                    <td className="py-3 px-3 sm:px-4 text-right text-slate-700 hidden lg:table-cell">
                      {m.balanceAfter != null ? m.balanceAfter.toFixed(2) : '—'}
                    </td>
                    <td className="py-3 px-3 sm:px-4 text-center">
                      <input
                        type="checkbox"
                        checked={m.matched}
                        readOnly
                        className="accent-primary cursor-default"
                      />
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default BillingBankTab;

