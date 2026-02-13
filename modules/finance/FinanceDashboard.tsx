import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from 'recharts';
import {
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  TrendingUp,
  TrendingDown,
  CreditCard,
  MoreHorizontal,
  FileText,
  AlertCircle
} from 'lucide-react';
import {
  getFinanceDashboardKpis,
  getIncomeExpensesByMonth,
  getExpensesByCategory,
  getPayableOwingSummary,
  listFinanceInvoicesDue,
  listUpcomingRecurringExpenses,
  getFinanceSettings,
} from '../../services/finance';
import { Select } from '../tasks/Select';
import { formatCurrency } from './formatCurrency';
import { COLORS } from '../../constants';

// --- Components ---

function MetricCard({
  title,
  value,
  trend,
  trendLabel,
  icon: Icon,
  trendColor = 'green',
  delay = 0,
}: {
  title: string;
  value: string;
  trend?: number;
  trendLabel?: string;
  icon: React.ElementType;
  trendColor?: 'green' | 'red' | 'neutral';
  delay?: number;
}) {
  const isPositive = trend && trend >= 0;
  const TrendIcon = isPositive ? ArrowUpRight : ArrowDownRight;

  const trendTextColor = trendColor === 'green' ? 'text-emerald-600' : trendColor === 'red' ? 'text-rose-600' : 'text-slate-500';
  const trendBgColor = trendColor === 'green' ? 'bg-emerald-50' : trendColor === 'red' ? 'bg-rose-50' : 'bg-slate-50';

  return (
    <div
      className="bg-white rounded-2xl border border-brand-very-soft/50 shadow-sm hover:shadow-md transition-all duration-300 p-6 flex flex-col justify-between h-full animate-in fade-in slide-in-from-bottom-4 fill-mode-backwards"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex justify-between items-start mb-4">
        <div className="p-3 bg-brand-50 rounded-xl text-primary">
          <Icon className="w-6 h-6" />
        </div>
        {trend != null && (
          <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${trendBgColor} ${trendTextColor}`}>
            <TrendIcon className="w-3 h-3" />
            <span>{Math.abs(trend)}%</span>
          </div>
        )}
      </div>
      <div>
        <p className="text-brand-muted text-sm font-medium mb-1">{title}</p>
        <h3 className="text-3xl font-extrabold text-primary tracking-tight">{value}</h3>
        {trendLabel && <p className="text-xs text-brand-soft mt-2 font-medium">{trendLabel}</p>}
      </div>
    </div>
  );
}

function SectionHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-6">
      <h2 className="text-lg font-bold text-primary flex items-center gap-2">
        {title}
      </h2>
      {action}
    </div>
  );
}

const CHART_COLORS = [COLORS.brand[400], '#818cf8', '#fb7185', '#34d399', '#f472b6'];

export default function FinanceDashboard() {
  const [periodMonths, setPeriodMonths] = useState('6');

  const { data: settings } = useQuery({
    queryKey: ['finance-settings'],
    queryFn: () => getFinanceSettings(),
  });

  const { data: kpis, isLoading: kpisLoading } = useQuery({
    queryKey: ['finance-dashboard-kpis', settings?.startingCash ?? null],
    queryFn: () => getFinanceDashboardKpis(settings?.startingCash ?? null),
    enabled: settings !== undefined,
  });

  const { data: payableOwing } = useQuery({
    queryKey: ['finance-payable-owing'],
    queryFn: () => getPayableOwingSummary(),
  });

  const monthsBack = parseInt(periodMonths, 10) || 6;
  const { data: incomeExpenses = [] } = useQuery({
    queryKey: ['finance-income-expenses-by-month', monthsBack],
    queryFn: () => getIncomeExpensesByMonth(monthsBack),
  });

  const { data: expensesByCategory = [] } = useQuery({
    queryKey: ['finance-expenses-by-category', 3],
    queryFn: () => getExpensesByCategory(3),
  });

  const { data: invoicesDue = [] } = useQuery({
    queryKey: ['finance-invoices-due'],
    queryFn: () => listFinanceInvoicesDue(5), // Limit to top 5
  });

  const { data: upcomingRecurring = [] } = useQuery({
    queryKey: ['finance-upcoming-recurring'],
    queryFn: () => listUpcomingRecurringExpenses(5),
  });

  const k = kpis ?? {
    incomeThisMonth: 0,
    expensesThisMonth: 0,
    netResultThisMonth: 0,
    cashPosition: 0,
    incomePrevMonth: 0,
    expensesPrevMonth: 0,
  };

  // Safe trend calculation
  const calcTrend = (current: number, prev?: number) => {
    if (!prev) return 0;
    return Math.round(((current - prev) / prev) * 100);
  };

  const incomeTrend = calcTrend(k.incomeThisMonth, k.incomePrevMonth);
  const expensesTrend = calcTrend(k.expensesThisMonth, k.expensesPrevMonth);

  return (
    <div className="p-6 sm:p-8 max-w-[1600px] mx-auto min-h-full space-y-8">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-primary tracking-tight">Financial Overview</h1>
          <p className="text-brand-muted mt-1">Track your cashflow and business health.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-white border border-brand-very-soft/60 rounded-xl px-4 py-2 text-sm font-medium text-brand-muted shadow-sm">
            Last updated: Just now
          </div>
          <Link
            to="/finance/income"
            className="bg-primary hover:bg-brand-600 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-brand-500/20 transition-all text-sm"
          >
            New Transaction
          </Link>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <MetricCard
          title="Total Revenue"
          value={formatCurrency(k.incomeThisMonth)}
          trend={incomeTrend}
          trendLabel="vs last month"
          icon={TrendingUp}
          trendColor={incomeTrend >= 0 ? "green" : "red"}
          delay={0}
        />
        <MetricCard
          title="Total Expenses"
          value={formatCurrency(k.expensesThisMonth)}
          trend={expensesTrend}
          trendLabel="vs last month"
          icon={TrendingDown}
          trendColor={expensesTrend <= 0 ? "green" : "red"} // Expenses going down is green
          delay={100}
        />
        <MetricCard
          title="Net Profit"
          value={formatCurrency(k.netResultThisMonth)}
          icon={Wallet}
          trendLabel={k.netResultThisMonth >= 0 ? "Healthy margin" : "Deficit warning"}
          trendColor="neutral"
          delay={200}
        />
        <MetricCard
          title="Cash on Hand"
          value={formatCurrency(k.cashPosition ?? 0)}
          icon={CreditCard}
          trendLabel="Current balance"
          trendColor="neutral"
          delay={300}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">

        {/* Left Column (Charts - Takes 2/3 width on XL) */}
        <div className="xl:col-span-2 space-y-8">

          {/* Main Chart */}
          <div className="bg-white rounded-2xl border border-brand-very-soft/50 shadow-card p-6 sm:p-8">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-xl font-extrabold text-primary">Revenue vs Expenses</h2>
                <p className="text-sm text-brand-muted mt-1">Comparitive analysis over time</p>
              </div>
              <Select
                value={periodMonths}
                onChange={setPeriodMonths}
                options={[{ value: '3', label: 'Last 3 months' }, { value: '6', label: 'Last 6 months' }, { value: '12', label: 'Last year' }]}
                className="w-40"
              />
            </div>

            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={incomeExpenses} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={COLORS.brand[500]} stopOpacity={0.1} />
                      <stop offset="95%" stopColor={COLORS.brand[500]} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.1} />
                      <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="month"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#94a3b8', fontSize: 12 }}
                    dy={10}
                    tickFormatter={(v) => v.slice(0, 7)}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#94a3b8', fontSize: 12 }}
                    tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    formatter={(value: number) => formatCurrency(value)}
                  />
                  <Area
                    type="monotone"
                    dataKey="income"
                    stroke={COLORS.brand[500]}
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorIncome)"
                    name="Income"
                  />
                  <Area
                    type="monotone"
                    dataKey="expenses"
                    stroke="#f43f5e"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorExpense)"
                    name="Expenses"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Secondary Charts Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Expenses by Category */}
            <div className="bg-white rounded-2xl border border-brand-very-soft/50 shadow-card p-6">
              <h3 className="text-lg font-bold text-primary mb-6">Top Expenses</h3>
              <div className="h-[250px]">
                {expensesByCategory.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={expensesByCategory.slice(0, 5)} layout="vertical" margin={{ left: 0 }}>
                      <XAxis type="number" hide />
                      <YAxis
                        dataKey="category"
                        type="category"
                        axisLine={false}
                        tickLine={false}
                        width={80}
                        tick={{ fill: '#64748b', fontSize: 12, fontWeight: 500 }}
                      />
                      <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '8px' }} formatter={(v: number) => formatCurrency(v)} />
                      <Bar dataKey="amount" radius={[0, 4, 4, 0]} barSize={24}>
                        {expensesByCategory.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-brand-muted text-sm">No expense data</div>
                )}
              </div>
            </div>

            {/* Payable/Owing Summary */}
            <div className="bg-white rounded-2xl border border-brand-very-soft/50 shadow-card p-6 flex flex-col justify-center">
              <h3 className="text-lg font-bold text-primary mb-6">Pending Actions</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-red-50/50 rounded-xl border border-red-100">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white rounded-lg text-red-500 shadow-sm"><AlertCircle size={18} /></div>
                    <span className="text-sm font-semibold text-brand-700">Invoices Overdue</span>
                  </div>
                  <span className="font-bold text-red-600">
                    {formatCurrency((payableOwing?.invoicesOverdue1_30 ?? 0) + (payableOwing?.invoicesOverdue31_60 ?? 0))}
                  </span>
                </div>

                <div className="flex items-center justify-between p-4 bg-amber-50/50 rounded-xl border border-amber-100">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white rounded-lg text-amber-500 shadow-sm"><FileText size={18} /></div>
                    <span className="text-sm font-semibold text-brand-700">Bills to Pay</span>
                  </div>
                  <span className="font-bold text-amber-600">
                    {formatCurrency((payableOwing?.expensesComingDue ?? 0) + (payableOwing?.expensesOverdue1_30 ?? 0))}
                  </span>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Right Column (Lists - Takes 1/3 width on XL) */}
        <div className="space-y-8">

          {/* Invoices Due List */}
          <div className="bg-white rounded-2xl border border-brand-very-soft/50 shadow-card p-6 flex flex-col h-[500px]">
            <SectionHeader
              title="Invoices Due"
              action={<Link to="/finance/income" className="text-xs font-bold text-primary hover:underline">View All</Link>}
            />

            <div className="flex-1 overflow-y-auto pr-2 space-y-4 scrollbar-thin scrollbar-thumb-brand-100">
              {invoicesDue.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-4">
                  <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center text-brand-muted mb-3"><FileText size={20} /></div>
                  <p className="text-sm text-brand-muted">No pending invoices</p>
                </div>
              ) : (
                invoicesDue.map(inv => (
                  <div key={inv.id} className="group p-4 rounded-xl border border-brand-very-soft/40 hover:border-brand-soft/30 hover:bg-slate-50 transition-all cursor-default">
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-bold text-brand-700 text-sm truncate max-w-[140px]">{inv.title}</span>
                      <span className="font-extrabold text-primary text-sm">{formatCurrency(inv.amount)}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-brand-muted">{inv.dueDate}</span>
                      <span className={`px-2 py-0.5 rounded-md font-bold uppercase tracking-wider text-[10px] ${inv.status === 'overdue' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                        }`}>
                        {inv.status}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recurring Expenses List */}
          <div className="bg-white rounded-2xl border border-brand-very-soft/50 shadow-card p-6 flex flex-col">
            <SectionHeader
              title="Upcoming Recurring"
              action={<Link to="/finance/expenses" className="text-xs font-bold text-primary hover:underline">View All</Link>}
            />
            <div className="space-y-4">
              {upcomingRecurring.length === 0 ? (
                <p className="text-brand-muted text-sm text-center py-4">No recurring expenses</p>
              ) : (
                upcomingRecurring.map(exp => (
                  <div key={exp.id} className="flex items-center justify-between py-2 border-b border-brand-very-soft/30 last:border-0">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center text-brand-400">
                        <CreditCard size={14} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-primary">{exp.title}</p>
                        <p className="text-xs text-brand-muted">{exp.vendor}</p>
                      </div>
                    </div>
                    <span className="text-sm font-bold text-primary">{formatCurrency(exp.amount)}</span>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
