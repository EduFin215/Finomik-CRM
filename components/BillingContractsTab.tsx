import React, { useMemo, useState } from 'react';
import type { EsContract } from '../types';

const STATUSES: EsContract['status'][] = ['Activo', 'Pendiente', 'Cancelado', 'Finalizado'];

const MOCK_CONTRACTS: EsContract[] = [
  {
    id: 'ctr-1',
    schoolId: 'sch-1',
    schoolName: 'Colegio San Martín',
    externalRef: 'C-2025-001',
    startDate: '2025-01-01',
    endDate: null,
    frequency: 'Mensual',
    status: 'Activo',
    defaultTaxRateId: null,
    paymentTerms: '30 días',
  },
  {
    id: 'ctr-2',
    schoolId: 'sch-2',
    schoolName: 'IES Europa',
    externalRef: 'C-2025-002',
    startDate: '2025-02-15',
    endDate: null,
    frequency: 'Trimestral',
    status: 'Pendiente',
    defaultTaxRateId: null,
    paymentTerms: '30 días',
  },
];

const BillingContractsTab: React.FC = () => {
  const contracts = MOCK_CONTRACTS;
  const isLoading = false;

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<EsContract['status'][]>(['Activo']);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return contracts.filter((c) => {
      const matchesStatus = statusFilter.length === 0 || statusFilter.includes(c.status);
      const matchesSearch =
        !q ||
        c.schoolName?.toLowerCase().includes(q) ||
        c.externalRef?.toLowerCase().includes(q ?? '') ||
        c.id.toLowerCase().includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [contracts, search, statusFilter]);

  const toggleStatus = (s: EsContract['status']) => {
    setStatusFilter((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );
  };

  return (
    <div className="bg-white rounded-2xl border border-brand-200/80 shadow-sm p-6 sm:p-7">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-lg sm:text-xl font-title text-primary mb-1">Contratos por centro</h3>
          <p className="text-xs sm:text-sm text-slate-600 font-body">
            Lista de contratos activos y su frecuencia de facturación.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="text"
            placeholder="Buscar por centro o referencia…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-3 py-2 rounded-lg border border-brand-200 text-sm font-body text-primary placeholder:text-slate-400 bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary min-w-[220px]"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {STATUSES.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => toggleStatus(s)}
            className={`px-3 py-1.5 rounded-full text-[11px] font-bold border transition-all ${
              statusFilter.includes(s)
                ? 'bg-primary text-white border-primary'
                : 'bg-white text-brand-600 border-brand-200 hover:border-brand-400'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="mt-2 border border-brand-200 rounded-xl overflow-hidden bg-white max-h-[480px] sm:max-h-[540px] flex flex-col">
        <div className="overflow-x-auto overflow-y-auto flex-1">
          <table className="w-full text-left border-collapse min-w-[640px]">
            <thead className="sticky top-0 bg-brand-100/40 z-10 border-b border-brand-200">
              <tr className="text-[10px] sm:text-[11px] text-brand-500 font-bold uppercase tracking-wider">
                <th className="py-3 px-3 sm:px-4">Centro</th>
                <th className="py-3 px-3 sm:px-4">Frecuencia</th>
                <th className="py-3 px-3 sm:px-4 hidden md:table-cell">Inicio</th>
                <th className="py-3 px-3 sm:px-4 hidden md:table-cell">Fin</th>
                <th className="py-3 px-3 sm:px-4">Estado</th>
                <th className="py-3 px-3 sm:px-4 hidden lg:table-cell">Condiciones pago</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-100 text-sm">
              {isLoading && (
                <tr>
                  <td colSpan={6} className="py-6 px-4 text-center text-slate-500 font-body text-sm">
                    Cargando contratos…
                  </td>
                </tr>
              )}
              {!isLoading && filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-6 px-4 text-center text-slate-500 font-body text-sm">
                    No hay contratos que coincidan con los filtros.
                  </td>
                </tr>
              )}
              {!isLoading &&
                filtered.map((c) => (
                  <tr key={c.id} className="hover:bg-brand-100/20 transition-colors">
                    <td className="py-3 px-3 sm:px-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-primary truncate max-w-[220px]">
                          {c.schoolName || 'Centro sin nombre'}
                        </span>
                        {c.externalRef && (
                          <span className="text-[11px] text-slate-500 font-body truncate">
                            Ref: {c.externalRef}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-3 sm:px-4 text-slate-700 font-body text-sm">{c.frequency}</td>
                    <td className="py-3 px-3 sm:px-4 text-slate-700 font-body text-sm hidden md:table-cell">
                      {c.startDate}
                    </td>
                    <td className="py-3 px-3 sm:px-4 text-slate-700 font-body text-sm hidden md:table-cell">
                      {c.endDate ?? '—'}
                    </td>
                    <td className="py-3 px-3 sm:px-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                          c.status === 'Activo'
                            ? 'bg-emerald-100 text-emerald-800'
                            : c.status === 'Pendiente'
                            ? 'bg-amber-100 text-amber-800'
                            : c.status === 'Cancelado'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {c.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 sm:px-4 text-slate-700 font-body text-xs hidden lg:table-cell">
                      {c.paymentTerms}
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

export default BillingContractsTab;

