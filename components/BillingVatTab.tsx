import React, { useMemo, useState } from 'react';
import type { EsVatIssuedRow } from '../types';
import { Download } from 'lucide-react';

type Quarter = '1T' | '2T' | '3T' | '4T';

function getQuarterRange(year: number, quarter: Quarter) {
  const ranges: Record<Quarter, [string, string]> = {
    '1T': [`${year}-01-01`, `${year}-03-31`],
    '2T': [`${year}-04-01`, `${year}-06-30`],
    '3T': [`${year}-07-01`, `${year}-09-30`],
    '4T': [`${year}-10-01`, `${year}-12-31`],
  };
  return ranges[quarter];
}

const MOCK_VAT_ROWS: EsVatIssuedRow[] = [
  {
    invoiceId: 'inv-1',
    fullNumber: 'S-2025/0001',
    issueDate: '2025-01-15',
    operationDate: '2025-01-15',
    schoolId: 'sch-1',
    schoolName: 'Colegio San Martín',
    schoolTaxId: 'B12345678',
    taxRateId: null,
    taxCode: '21%',
    taxPercentage: 21,
    baseAmount: 1000,
    taxAmount: 210,
  },
  {
    invoiceId: 'inv-2',
    fullNumber: 'S-2025/0002',
    issueDate: '2025-01-20',
    operationDate: '2025-01-20',
    schoolId: 'sch-2',
    schoolName: 'IES Europa',
    schoolTaxId: 'B87654321',
    taxRateId: null,
    taxCode: '21%',
    taxPercentage: 21,
    baseAmount: 500,
    taxAmount: 105,
  },
];

const BillingVatTab: React.FC = () => {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [quarter, setQuarter] = useState<Quarter>('1T');

  const [fromDate, toDate] = getQuarterRange(year, quarter);

  const { rows, isLoading } = useMemo(() => {
    const rows = MOCK_VAT_ROWS.filter((r) => r.issueDate >= fromDate && r.issueDate <= toDate);
    return { rows, isLoading: false };
  }, [fromDate, toDate]);

  const summary = useMemo(() => {
    const totalBase = rows.reduce((sum, r) => sum + r.baseAmount, 0);
    const totalTax = rows.reduce((sum, r) => sum + r.taxAmount, 0);
    const byType = new Map<
      string,
      { taxCode: string; percentage: number; base: number; tax: number }
    >();
    rows.forEach((r) => {
      const key = r.taxCode || String(r.taxPercentage);
      const existing = byType.get(key) ?? {
        taxCode: r.taxCode ?? key,
        percentage: r.taxPercentage,
        base: 0,
        tax: 0,
      };
      existing.base += r.baseAmount;
      existing.tax += r.taxAmount;
      byType.set(key, existing);
    });
    return {
      totalBase,
      totalTax,
      byType: Array.from(byType.values()),
    };
  }, [rows]);

  const handleExportCsv = (type: '303' | '390') => {
    if (rows.length === 0) return;
    const headers = [
      'fullNumber',
      'issueDate',
      'schoolName',
      'schoolTaxId',
      'taxCode',
      'taxPercentage',
      'baseAmount',
      'taxAmount',
    ];
    const lines = rows.map((r) =>
      [
        r.fullNumber,
        r.issueDate,
        r.schoolName,
        r.schoolTaxId ?? '',
        r.taxCode ?? '',
        r.taxPercentage.toFixed(2),
        r.baseAmount.toFixed(2),
        r.taxAmount.toFixed(2),
      ].join(',')
    );
    const csv = [headers.join(','), ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = type === '303' ? `finomik_modelo_303_${year}_${quarter}.csv` : `finomik_modelo_390_${year}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white rounded-2xl border border-brand-200/80 shadow-sm p-6 sm:p-7">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-lg sm:text-xl font-title text-primary mb-1">IVA e informes AEAT</h3>
          <p className="text-xs sm:text-sm text-slate-600 font-body">
            Resumen de bases e IVA repercutido para preparar el 303 y el 390.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="px-3 py-2 rounded-lg border border-brand-200 text-xs sm:text-sm font-body bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          >
            {[currentYear, currentYear - 1, currentYear - 2].map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <select
            value={quarter}
            onChange={(e) => setQuarter(e.target.value as Quarter)}
            className="px-3 py-2 rounded-lg border border-brand-200 text-xs sm:text-sm font-body bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          >
            <option value="1T">1T</option>
            <option value="2T">2T</option>
            <option value="3T">3T</option>
            <option value="4T">4T</option>
          </select>
        </div>
      </div>

      <div className="grid gap-4 sm:gap-6 sm:grid-cols-3 mb-6">
        <div className="bg-slate-50 rounded-xl border border-slate-100 p-4">
          <p className="text-xs text-slate-500 font-body mb-1">Base imponible total</p>
          <p className="text-xl font-title text-primary">
            {summary.totalBase.toFixed(2)} €
          </p>
        </div>
        <div className="bg-slate-50 rounded-xl border border-slate-100 p-4">
          <p className="text-xs text-slate-500 font-body mb-1">Cuota IVA total</p>
          <p className="text-xl font-title text-primary">
            {summary.totalTax.toFixed(2)} €
          </p>
        </div>
        <div className="bg-slate-50 rounded-xl border border-slate-100 p-4 flex flex-col justify-between">
          <p className="text-xs text-slate-500 font-body mb-2">Exportar</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => handleExportCsv('303')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold bg-primary text-white hover:bg-brand-600 transition-colors"
              disabled={rows.length === 0}
            >
              <Download size={14} />
              303 (CSV)
            </button>
            <button
              type="button"
              onClick={() => handleExportCsv('390')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold bg-white text-primary border border-brand-200 hover:border-primary transition-colors"
              disabled={rows.length === 0}
            >
              <Download size={14} />
              390 (CSV)
            </button>
          </div>
        </div>
      </div>

      <div className="border border-brand-200 rounded-xl overflow-hidden bg-white max-h-[420px] flex flex-col">
        <div className="overflow-x-auto overflow-y-auto flex-1">
          <table className="w-full text-left border-collapse min-w-[720px]">
            <thead className="sticky top-0 bg-brand-100/40 z-10 border-b border-brand-200">
              <tr className="text-[10px] sm:text-[11px] text-brand-500 font-bold uppercase tracking-wider">
                <th className="py-3 px-3 sm:px-4">Nº factura</th>
                <th className="py-3 px-3 sm:px-4">Fecha</th>
                <th className="py-3 px-3 sm:px-4 hidden md:table-cell">Cliente</th>
                <th className="py-3 px-3 sm:px-4 hidden lg:table-cell">NIF/CIF</th>
                <th className="py-3 px-3 sm:px-4">Tipo IVA</th>
                <th className="py-3 px-3 sm:px-4 text-right">Base</th>
                <th className="py-3 px-3 sm:px-4 text-right">Cuota</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-100 text-xs sm:text-sm">
              {isLoading && (
                <tr>
                  <td colSpan={7} className="py-6 px-4 text-center text-slate-500 font-body text-sm">
                    Cargando datos de IVA…
                  </td>
                </tr>
              )}
              {!isLoading && rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-6 px-4 text-center text-slate-500 font-body text-sm">
                    No hay facturas en el periodo seleccionado.
                  </td>
                </tr>
              )}
              {!isLoading &&
                rows.map((r) => (
                  <tr key={`${r.invoiceId}-${r.taxCode}-${r.taxPercentage}-${r.baseAmount}`} className="hover:bg-brand-100/20 transition-colors">
                    <td className="py-3 px-3 sm:px-4 text-primary font-body font-semibold">
                      {r.fullNumber}
                    </td>
                    <td className="py-3 px-3 sm:px-4 text-slate-700 font-body">
                      {r.issueDate}
                    </td>
                    <td className="py-3 px-3 sm:px-4 text-slate-700 font-body hidden md:table-cell truncate max-w-[220px]">
                      {r.schoolName}
                    </td>
                    <td className="py-3 px-3 sm:px-4 text-slate-700 font-body hidden lg:table-cell">
                      {r.schoolTaxId ?? '—'}
                    </td>
                    <td className="py-3 px-3 sm:px-4 text-slate-700 font-body">
                      {r.taxCode || `${r.taxPercentage.toFixed(2)}%`}
                    </td>
                    <td className="py-3 px-3 sm:px-4 text-right text-slate-800 font-body">
                      {r.baseAmount.toFixed(2)} €
                    </td>
                    <td className="py-3 px-3 sm:px-4 text-right text-slate-800 font-body">
                      {r.taxAmount.toFixed(2)} €
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-4">
        <h5 className="text-xs font-title text-primary uppercase tracking-wide mb-2">Desglose por tipo de IVA</h5>
        <div className="flex flex-wrap gap-3 text-xs sm:text-sm font-body">
          {summary.byType.length === 0 && (
            <p className="text-slate-500">Sin datos de IVA para este periodo.</p>
          )}
          {summary.byType.map((t) => (
            <div
              key={t.taxCode}
              className="bg-slate-50 rounded-lg border border-slate-100 px-3 py-2 min-w-[150px]"
            >
              <p className="font-semibold text-slate-800 mb-0.5">
                {t.taxCode || `${t.percentage.toFixed(2)}%`}
              </p>
              <p className="text-[11px] text-slate-500">
                Base {t.base.toFixed(2)} € · IVA {t.tax.toFixed(2)} €
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default BillingVatTab;

