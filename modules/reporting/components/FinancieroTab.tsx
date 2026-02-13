import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import {
  DollarSign,
  CreditCard,
  Wallet,
  FileText,
  TrendingDown,
  TrendingUp
} from 'lucide-react';
import { getFinancieroKpis, getFinancieroCharts } from '../services/reporting';
import { KpiCard } from './KpiCard';
import { ChartCard } from './ChartCard';
import { formatCurrency } from '../../finance/formatCurrency';
import { COLORS } from '../../../constants';
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
      <div className="flex flex-col items-center justify-center py-20 text-brand-muted">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
        <p className="text-sm font-medium">Calculando métricas financieras...</p>
      </div>
    );
  }

  const k = kpis!;

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-6">
        <KpiCard
          value={formatCurrency(k.incomeInRange)}
          label="Ingresos"
          icon={DollarSign}
          trendColor="green"
          onClick={() => navigate(`/finance/income${qs || fromTo}`)}
        />
        <KpiCard
          value={formatCurrency(k.expensesInRange)}
          label="Gastos"
          icon={CreditCard}
          trendColor="red"
          onClick={() => navigate(`/finance/expenses${qs || fromTo}`)}
        />
        <KpiCard
          value={formatCurrency(k.netResult)}
          label="Resultado Neto"
          icon={Wallet}
          subtext="Beneficio en rango"
          onClick={() => navigate('/finance/dashboard')}
        />
        <KpiCard
          value={formatCurrency(k.pendingInvoicesSum)}
          label="Facturas x Cobrar"
          icon={FileText}
          subtext={`${k.pendingInvoicesCount} facturas`}
          onClick={() => navigate('/finance/income?status=sent')}
        />
        <KpiCard
          value={formatCurrency(k.burnRate)}
          label="Burn Rate"
          icon={TrendingDown}
          subtext="Promedio mensual (3m)"
        />
        <KpiCard
          value={formatCurrency(k.forecast60)}
          label="Forecast 60 Días"
          icon={TrendingUp}
          onClick={() => navigate('/finance/dashboard')}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <ChartCard title="Ingresos vs Gastos Mensual">
            {charts?.incomeExpensesByMonth && charts.incomeExpensesByMonth.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={charts.incomeExpensesByMonth.map((d) => ({ ...d, month: d.month.slice(0, 7) }))} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} dy={10} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    formatter={(v: number) => formatCurrency(v)}
                  />
                  <Line type="monotone" dataKey="income" name="Ingresos" stroke={COLORS.brand[600]} strokeWidth={3} dot={{ r: 4, strokeWidth: 0, fill: COLORS.brand[600] }} />
                  <Line type="monotone" dataKey="expenses" name="Gastos" stroke="#f43f5e" strokeWidth={3} dot={{ r: 4, strokeWidth: 0, fill: "#f43f5e" }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-brand-muted text-sm">Sin datos en el rango</div>
            )}
          </ChartCard>
        </div>

        <ChartCard title="Gastos por Categoría">
          {charts?.expensesByCategory && charts.expensesByCategory.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={charts.expensesByCategory} layout="vertical" margin={{ left: 0 }}>
                <XAxis type="number" hide />
                <YAxis dataKey="category" type="category" width={100} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '8px' }} formatter={(v: number) => formatCurrency(v)} />
                <Bar dataKey="amount" name="Gastos" fill="#f43f5e" radius={[0, 4, 4, 0]} barSize={20} onClick={(data) => data?.category && navigate(`/finance/expenses?category=${data.category}&from=${range.from}&to=${range.to}`)} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-brand-muted text-sm">Sin datos en el rango</div>
          )}
        </ChartCard>

        <div className="lg:col-span-3">
          <ChartCard title="Proyección de Cashflow (60 días)">
            {charts?.forecast && charts.forecast.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={charts.forecast.map((d) => ({ ...d, date: d.date.slice(0, 10) }))} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} interval="preserveStartEnd" dy={10} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    formatter={(v: number) => formatCurrency(v)}
                    labelFormatter={(l) => l}
                  />
                  <Line type="monotone" dataKey="projectedCash" name="Caja proyectada" stroke="#10b981" strokeWidth={3} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-brand-muted text-sm">Sin datos</div>
            )}
          </ChartCard>
        </div>
      </div>
    </div>
  );
}
