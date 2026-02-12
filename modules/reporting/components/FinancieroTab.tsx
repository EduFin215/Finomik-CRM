import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { getFinancieroKpis, getFinancieroCharts } from '../services/reporting';
import { KpiCard } from './KpiCard';
import { ChartCard } from './ChartCard';
import { formatCurrency } from '../../finance/formatCurrency';
import type { ReportingDateRangeInput } from '../services/reporting';

interface FinancieroTabProps {
  range: ReportingDateRangeInput;
  drillDownQuery: { range?: string; from?: string; to?: string };
}

function buildQueryString(q: { range?: string; from?: string; to?: string }): string {
  const params = new URLSearchParams();
  if (q.range) params.set('range', q.range);
  if (q.from) params.set('from', q.from);
  if (q.to) params.set('to', q.to);
  const s = params.toString();
  return s ? `?${s}` : '';
}

export function FinancieroTab({ range, drillDownQuery }: FinancieroTabProps) {
  const navigate = useNavigate();
  const qs = buildQueryString(drillDownQuery);
  const fromTo = `?from=${range.from}&to=${range.to}`;

  const { data: kpis, isLoading: kpisLoading } = useQuery({
    queryKey: ['reporting', 'financiero', 'kpis', range.from, range.to],
    queryFn: () => getFinancieroKpis(range),
  });

  const { data: charts, isLoading: chartsLoading } = useQuery({
    queryKey: ['reporting', 'financiero', 'charts', range.from, range.to],
    queryFn: () => getFinancieroCharts(range),
  });

  const loading = kpisLoading || chartsLoading;

  if (loading && !kpis) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-brand-500 text-sm">Cargando…</p>
      </div>
    );
  }

  const k = kpis!;

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <KpiCard value={formatCurrency(k.incomeInRange)} label="Ingresos" onClick={() => navigate(`/finance/income${qs || fromTo}`)} />
        <KpiCard value={formatCurrency(k.expensesInRange)} label="Gastos" onClick={() => navigate(`/finance/expenses${qs || fromTo}`)} />
        <KpiCard value={formatCurrency(k.netResult)} label="Resultado neto" onClick={() => navigate('/finance/dashboard')} />
        <KpiCard value={formatCurrency(k.pendingInvoicesSum)} label="Facturas pendientes" subtext={`${k.pendingInvoicesCount} facturas`} onClick={() => navigate('/finance/income?status=sent')} />
        <KpiCard value={formatCurrency(k.burnRate)} label="Burn rate" subtext="Últimos 3 meses" />
        <KpiCard value={formatCurrency(k.forecast60)} label="Forecast 60 días" onClick={() => navigate('/finance/forecast')} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <ChartCard title="Ingresos vs Gastos mensual">
          {charts?.incomeExpensesByMonth && charts.incomeExpensesByMonth.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={charts.incomeExpensesByMonth.map((d) => ({ ...d, month: d.month.slice(0, 7) }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} labelFormatter={(l) => l} />
                <Line type="monotone" dataKey="income" name="Ingresos" stroke="#6366f1" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="expenses" name="Gastos" stroke="#f43f5e" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-brand-400 py-8 text-center">Sin datos en el rango</p>
          )}
        </ChartCard>

        <ChartCard title="Gastos por categoría">
          {charts?.expensesByCategory && charts.expensesByCategory.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={charts.expensesByCategory} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="category" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Bar dataKey="amount" name="Gastos" fill="#f43f5e" radius={[4, 4, 0, 0]} onClick={(data) => data?.category && navigate(`/finance/expenses?category=${data.category}&from=${range.from}&to=${range.to}`)} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-brand-400 py-8 text-center">Sin datos en el rango</p>
          )}
        </ChartCard>

        <ChartCard title="Proyección de cashflow (60 días)">
          {charts?.forecast && charts.forecast.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={charts.forecast.map((d) => ({ ...d, date: d.date.slice(0, 10) }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} labelFormatter={(l) => l} />
                <Line type="monotone" dataKey="projectedCash" name="Caja proyectada" stroke="#22c55e" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-brand-400 py-8 text-center">Sin datos</p>
          )}
        </ChartCard>
      </div>
    </div>
  );
}
