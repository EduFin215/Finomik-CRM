import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from 'recharts';
import {
  getFinanceDashboardKpis,
  getIncomeExpensesByMonth,
  getExpensesByCategory,
  getForecastProjection,
  listFinanceInvoicesDue,
  listUpcomingRecurringExpenses,
  getFinanceSettings,
} from '../../services/finance';
import { formatCurrency } from './formatCurrency';
import { COLORS } from '../../constants';

const CHART_COLORS = [COLORS.brand[300], COLORS.brand[400], COLORS.brand[500], COLORS.brand[600], COLORS.primary];

function KPICard({
  title,
  value,
  subtitle,
  delta,
}: {
  title: string;
  value: string;
  subtitle?: string;
  delta?: { value: number; label: string };
}) {
  return (
    <div className="bg-white rounded-2xl border border-brand-200/60 shadow-card p-5 min-w-0">
      <p className="text-sm font-body text-brand-500 mb-1">{title}</p>
      <p className="text-xl sm:text-2xl font-title text-primary truncate">{value}</p>
      {subtitle && <p className="text-xs text-brand-500 font-body mt-1">{subtitle}</p>}
      {delta != null && (
        <p className={`text-xs mt-1 ${delta.value >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
          {delta.value >= 0 ? '+' : ''}
          {formatCurrency(delta.value)} vs {delta.label}
        </p>
      )}
    </div>
  );
}

export default function FinanceDashboard() {
  const { data: settings } = useQuery({
    queryKey: ['finance-settings'],
    queryFn: () => getFinanceSettings(),
  });
  const { data: kpis, isLoading: kpisLoading } = useQuery({
    queryKey: ['finance-dashboard-kpis', settings?.startingCash ?? null],
    queryFn: () => getFinanceDashboardKpis(settings?.startingCash ?? null),
    enabled: settings !== undefined,
  });
  const { data: incomeExpensesByMonth = [] } = useQuery({
    queryKey: ['finance-income-expenses-by-month'],
    queryFn: () => getIncomeExpensesByMonth(12),
  });
  const { data: expensesByCategory = [] } = useQuery({
    queryKey: ['finance-expenses-by-category'],
    queryFn: () => getExpensesByCategory(3),
  });
  const { data: forecastData = [] } = useQuery({
    queryKey: ['finance-forecast-projection'],
    queryFn: () => getForecastProjection(90),
  });
  const { data: invoicesDue = [] } = useQuery({
    queryKey: ['finance-invoices-due'],
    queryFn: () => listFinanceInvoicesDue(8),
  });
  const { data: upcomingRecurring = [] } = useQuery({
    queryKey: ['finance-upcoming-recurring'],
    queryFn: () => listUpcomingRecurringExpenses(8),
  });

  const k = kpis ?? {
    incomeThisMonth: 0,
    expensesThisMonth: 0,
    netResultThisMonth: 0,
    cashPosition: null,
    forecastNext30Days: 0,
    burnRateLast3Months: 0,
    incomePrevMonth: 0,
    expensesPrevMonth: 0,
  };

  return (
    <div className="p-6 sm:p-8 max-w-6xl mx-auto bg-brand-100/20 min-h-full">
      <section className="mb-8">
        <h1 className="text-2xl font-title text-primary mb-1">Finance</h1>
        <p className="text-brand-500 font-body text-sm">Financial overview and key metrics.</p>
      </section>

      {/* Section 1 — KPI strip */}
      <section className="mb-10">
        {kpisLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-white rounded-2xl border border-brand-200/60 p-5 h-24 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            <KPICard
              title="Income (This Month)"
              value={formatCurrency(k.incomeThisMonth)}
              delta={
                k.incomePrevMonth != null
                  ? { value: k.incomeThisMonth - k.incomePrevMonth, label: 'last month' }
                  : undefined
              }
            />
            <KPICard
              title="Expenses (This Month)"
              value={formatCurrency(k.expensesThisMonth)}
              delta={
                k.expensesPrevMonth != null
                  ? { value: k.expensesThisMonth - k.expensesPrevMonth, label: 'last month' }
                  : undefined
              }
            />
            <KPICard
              title="Net Result (This Month)"
              value={formatCurrency(k.netResultThisMonth)}
              subtitle={k.netResultThisMonth >= 0 ? 'Surplus' : 'Deficit'}
            />
            {k.cashPosition != null && (
              <KPICard title="Cash Position" value={formatCurrency(k.cashPosition)} subtitle="Current" />
            )}
            <KPICard title="Forecast (Next 30 Days)" value={formatCurrency(k.forecastNext30Days)} />
            <KPICard
              title="Burn Rate"
              value={formatCurrency(k.burnRateLast3Months)}
              subtitle="Avg last 3 months"
            />
          </div>
        )}
      </section>

      {/* Section 2 — Charts */}
      <section className="mb-10 space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white rounded-2xl border border-brand-200/60 shadow-card p-6 min-w-0">
            <h2 className="text-lg font-subtitle text-primary mb-4">Income vs Expenses (monthly)</h2>
            {incomeExpensesByMonth.length === 0 ? (
              <div className="h-[260px] flex items-center justify-center text-brand-500 text-sm font-body">
                No data yet. Add invoices and expenses to see the chart.
              </div>
            ) : (
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={incomeExpensesByMonth}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="month" fontSize={11} tickFormatter={(v) => v.slice(0, 7)} />
                    <YAxis fontSize={11} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip
                      formatter={(v: number) => [formatCurrency(v), '']}
                      labelFormatter={(l) => (l as string)?.slice(0, 7)}
                    />
                    <Line
                      type="monotone"
                      dataKey="income"
                      name="Income"
                      stroke={COLORS.brand[400]}
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="expenses"
                      name="Expenses"
                      stroke="#94a3b8"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
          <div className="bg-white rounded-2xl border border-brand-200/60 shadow-card p-6 min-w-0">
            <h2 className="text-lg font-subtitle text-primary mb-4">Expenses by Category</h2>
            {expensesByCategory.length === 0 ? (
              <div className="h-[260px] flex items-center justify-center text-brand-500 text-sm font-body">
                No expense data yet.
              </div>
            ) : (
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={expensesByCategory} layout="vertical" margin={{ left: 60 }}>
                    <XAxis type="number" fontSize={11} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <YAxis type="category" dataKey="category" width={60} fontSize={11} />
                    <Tooltip formatter={(v: number) => [formatCurrency(v), 'Amount']} />
                    <Bar dataKey="amount" name="Amount" radius={[0, 4, 4, 0]}>
                      {expensesByCategory.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
        {forecastData.length > 0 && (
          <div className="bg-white rounded-2xl border border-brand-200/60 shadow-card p-6 min-w-0">
            <h2 className="text-lg font-subtitle text-primary mb-4">Cashflow forecast (next 90 days)</h2>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={forecastData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="date" fontSize={11} tickFormatter={(v) => v.slice(5)} />
                  <YAxis fontSize={11} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    formatter={(v: number) => [formatCurrency(v), 'Projected']}
                    labelFormatter={(l) => l as string}
                  />
                  <Line
                    type="monotone"
                    dataKey="projectedCash"
                    name="Projected cash"
                    stroke={COLORS.brand[500]}
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </section>

      {/* Section 3 — Actionable lists */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white rounded-2xl border border-brand-200/60 shadow-card p-6">
          <h2 className="text-lg font-subtitle text-primary mb-4">Invoices Due / Overdue</h2>
          {invoicesDue.length === 0 ? (
            <p className="text-brand-500 font-body text-sm py-4">No invoices due right now.</p>
          ) : (
            <ul className="space-y-3">
              {invoicesDue.map((inv) => (
                <li
                  key={inv.id}
                  className="flex items-center justify-between gap-2 py-2 border-b border-brand-100 last:border-0"
                >
                  <div className="min-w-0">
                    <p className="font-subtitle text-primary truncate">{inv.title}</p>
                    <p className="text-xs text-brand-500 font-body">
                      Due {inv.dueDate ?? '–'} ·{' '}
                      <span
                        className={
                          inv.status === 'overdue'
                            ? 'text-red-600 font-medium'
                            : 'text-slate-600'
                        }
                      >
                        {inv.status}
                      </span>
                    </p>
                  </div>
                  <span className="font-subtitle text-primary shrink-0">{formatCurrency(inv.amount)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="bg-white rounded-2xl border border-brand-200/60 shadow-card p-6">
          <h2 className="text-lg font-subtitle text-primary mb-4">Upcoming Recurring Expenses</h2>
          {upcomingRecurring.length === 0 ? (
            <p className="text-brand-500 font-body text-sm py-4">No recurring expenses.</p>
          ) : (
            <ul className="space-y-3">
              {upcomingRecurring.map((e) => (
                <li
                  key={e.id}
                  className="flex items-center justify-between gap-2 py-2 border-b border-brand-100 last:border-0"
                >
                  <div className="min-w-0">
                    <p className="font-subtitle text-primary truncate">{e.title}</p>
                    <p className="text-xs text-brand-500 font-body">
                      {e.vendor} · Due {e.dueDate ?? e.date ?? '–'}
                    </p>
                  </div>
                  <span className="font-subtitle text-primary shrink-0">{formatCurrency(e.amount)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
