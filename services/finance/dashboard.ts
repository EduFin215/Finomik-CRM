import { supabase, isSupabaseConfigured } from '../supabase';

export interface FinanceDashboardKpis {
  incomeThisMonth: number;
  expensesThisMonth: number;
  netResultThisMonth: number;
  cashPosition: number | null;
  forecastNext30Days: number;
  burnRateLast3Months: number;
  incomePrevMonth?: number;
  expensesPrevMonth?: number;
}

export interface IncomeExpensesByMonth {
  month: string;
  income: number;
  expenses: number;
}

export interface ExpensesByCategoryItem {
  category: string;
  amount: number;
}

export interface ForecastDay {
  date: string;
  projectedCash: number;
}

function getMonthRange(offset = 0): { from: string; to: string } {
  const d = new Date();
  d.setMonth(d.getMonth() + offset);
  d.setDate(1);
  const from = d.toISOString().slice(0, 10);
  d.setMonth(d.getMonth() + 1);
  d.setDate(0);
  const to = d.toISOString().slice(0, 10);
  return { from, to };
}

export async function getFinanceDashboardKpis(
  startingCash: number | null
): Promise<FinanceDashboardKpis> {
  const empty: FinanceDashboardKpis = {
    incomeThisMonth: 0,
    expensesThisMonth: 0,
    netResultThisMonth: 0,
    cashPosition: null,
    forecastNext30Days: 0,
    burnRateLast3Months: 0,
  };
  if (!isSupabaseConfigured() || !supabase) return empty;

  const thisMonth = getMonthRange(0);
  const prevMonth = getMonthRange(-1);

  const [invRes, expRes, prevInvRes, prevExpRes] = await Promise.all([
    supabase
      .from('finance_invoices')
      .select('amount, issue_date')
      .eq('status', 'paid')
      .gte('issue_date', thisMonth.from)
      .lte('issue_date', thisMonth.to),
    supabase
      .from('finance_expenses')
      .select('amount, date')
      .eq('status', 'paid')
      .gte('date', thisMonth.from)
      .lte('date', thisMonth.to),
    supabase
      .from('finance_invoices')
      .select('amount')
      .eq('status', 'paid')
      .gte('issue_date', prevMonth.from)
      .lte('issue_date', prevMonth.to),
    supabase
      .from('finance_expenses')
      .select('amount')
      .eq('status', 'paid')
      .gte('date', prevMonth.from)
      .lte('date', prevMonth.to),
  ]);

  const incomeThisMonth = (invRes.data ?? []).reduce((s, r) => s + Number(r.amount), 0);
  const expensesThisMonth = (expRes.data ?? []).reduce((s, r) => s + Number(r.amount), 0);
  const incomePrevMonth = (prevInvRes.data ?? []).reduce((s, r) => s + Number(r.amount), 0);
  const expensesPrevMonth = (prevExpRes.data ?? []).reduce((s, r) => s + Number(r.amount), 0);

  const threeMonthsAgo = getMonthRange(-3);
  const { data: exp3 } = await supabase
    .from('finance_expenses')
    .select('amount')
    .eq('status', 'paid')
    .gte('date', threeMonthsAgo.from)
    .lte('date', thisMonth.to);
  const totalExp3 = (exp3 ?? []).reduce((s, r) => s + Number(r.amount), 0);
  const burnRateLast3Months = 3 > 0 ? totalExp3 / 3 : 0;

  const netResultThisMonth = incomeThisMonth - expensesThisMonth;
  const cashPosition =
    startingCash != null
      ? startingCash + (await getCumulativeNetToDate(thisMonth.to))
      : null;

  // Improved Forecast Logic: Cash Position + Projected Net Change in next 30 days
  let forecastNext30Days = 0;
  if (cashPosition !== null) {
    const projection = await getForecastProjection(30);
    if (projection.length > 0) {
      forecastNext30Days = projection[projection.length - 1].projectedCash;
    } else {
      forecastNext30Days = cashPosition;
    }
  }

  return {
    incomeThisMonth,
    expensesThisMonth,
    netResultThisMonth,
    cashPosition,
    forecastNext30Days,
    burnRateLast3Months,
    incomePrevMonth,
    expensesPrevMonth,
  };
}

async function getCumulativeNetToDate(toDate: string): Promise<number> {
  if (!supabase) return 0;
  const [inv, exp] = await Promise.all([
    supabase
      .from('finance_invoices')
      .select('amount')
      .eq('status', 'paid')
      .lte('issue_date', toDate),
    supabase
      .from('finance_expenses')
      .select('amount')
      .eq('status', 'paid')
      .lte('date', toDate),
  ]);
  const income = (inv.data ?? []).reduce((s, r) => s + Number(r.amount), 0);
  const expenses = (exp.data ?? []).reduce((s, r) => s + Number(r.amount), 0);
  return income - expenses;
}

export async function getIncomeExpensesByMonth(monthsBack = 12): Promise<IncomeExpensesByMonth[]> {
  if (!isSupabaseConfigured() || !supabase) return [];
  const end = getMonthRange(0);
  const start = getMonthRange(-monthsBack);
  return getIncomeExpensesByMonthRange(start.from, end.to);
}

/** Income vs expenses by month for a custom date range (for Reporting). */
export async function getIncomeExpensesByMonthRange(from: string, to: string): Promise<IncomeExpensesByMonth[]> {
  if (!isSupabaseConfigured() || !supabase) return [];
  const [inv, exp] = await Promise.all([
    supabase
      .from('finance_invoices')
      .select('amount, issue_date')
      .eq('status', 'paid')
      .gte('issue_date', from)
      .lte('issue_date', to),
    supabase
      .from('finance_expenses')
      .select('amount, date')
      .eq('status', 'paid')
      .gte('date', from)
      .lte('date', to),
  ]);
  const byMonth = new Map<string, { income: number; expenses: number }>();
  const start = new Date(from);
  const end = new Date(to);
  for (let d = new Date(start.getFullYear(), start.getMonth(), 1); d <= end; d.setMonth(d.getMonth() + 1)) {
    const key = d.toISOString().slice(0, 7);
    byMonth.set(key, { income: 0, expenses: 0 });
  }
  for (const r of inv.data ?? []) {
    const key = String(r.issue_date).slice(0, 7);
    const cur = byMonth.get(key) ?? { income: 0, expenses: 0 };
    cur.income += Number(r.amount);
    byMonth.set(key, cur);
  }
  for (const r of exp.data ?? []) {
    const key = String(r.date).slice(0, 7);
    const cur = byMonth.get(key) ?? { income: 0, expenses: 0 };
    cur.expenses += Number(r.amount);
    byMonth.set(key, cur);
  }
  return Array.from(byMonth.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, v]) => ({ month: month + '-01', income: v.income, expenses: v.expenses }));
}

export async function getExpensesByCategory(monthsBack = 3): Promise<ExpensesByCategoryItem[]> {
  if (!isSupabaseConfigured() || !supabase) return [];
  const { from } = getMonthRange(-monthsBack);
  const { to } = getMonthRange(0);
  return getExpensesByCategoryRange(from, to);
}

/** Expenses by category for a custom date range (for Reporting). */
export async function getExpensesByCategoryRange(from: string, to: string): Promise<ExpensesByCategoryItem[]> {
  if (!isSupabaseConfigured() || !supabase) return [];
  const { data } = await supabase
    .from('finance_expenses')
    .select('category, amount')
    .eq('status', 'paid')
    .gte('date', from)
    .lte('date', to);
  const byCat = new Map<string, number>();
  for (const r of data ?? []) {
    const c = String(r.category || 'other');
    byCat.set(c, (byCat.get(c) ?? 0) + Number(r.amount));
  }
  return Array.from(byCat.entries())
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);
}

export async function getForecastProjection(days = 90): Promise<ForecastDay[]> {
  if (!isSupabaseConfigured() || !supabase) return [];
  const settingsRes = await supabase.from('finance_settings').select('starting_cash').limit(1).single();
  const startingCash = settingsRes.data?.starting_cash != null ? Number(settingsRes.data.starting_cash) : null;
  const today = new Date().toISOString().slice(0, 10);
  const cumulative = await getCumulativeNetToDate(today);
  const baseCash = startingCash != null ? startingCash + cumulative : cumulative;

  const { data: unpaidInvoices } = await supabase
    .from('finance_invoices')
    .select('amount, due_date')
    .in('status', ['sent', 'overdue'])
    .not('due_date', 'is', null);

  const { data: contracts } = await supabase
    .from('finance_contracts')
    .select('amount, frequency')
    .eq('status', 'active');

  // Pending one-off expenses
  const { data: pendingExpenses } = await supabase
    .from('finance_expenses')
    .select('amount, due_date')
    .eq('status', 'pending')
    .eq('is_recurring', false)
    .not('due_date', 'is', null);

  // Recurring expenses
  const { data: recurringExpenses } = await supabase
    .from('finance_expenses')
    .select('amount, due_date')
    .eq('is_recurring', true)
    .neq('status', 'cancelled');

  const dailyIncome = new Map<string, number>();
  const dailyExpense = new Map<string, number>();

  // 1. One-off Invoices (Income)
  for (const inv of unpaidInvoices ?? []) {
    const d = String(inv.due_date).slice(0, 10);
    // Only include if date is in future/today (or past due and we assume it comes in soon? Let's just put it on due date for now, or today if overdue)
    // For simplicity, map to due date. If overdue, maybe map to today?
    const targetDate = d < today ? today : d;
    dailyIncome.set(targetDate, (dailyIncome.get(targetDate) ?? 0) + Number(inv.amount));
  }

  // 2. Contracts (Recurring Income)
  for (const c of contracts ?? []) {
    const amount = Number(c.amount);
    const freq = String(c.frequency);
    const perMonth = freq === 'yearly' ? amount / 12 : freq === 'quarterly' ? amount / 3 : amount;
    const perDay = perMonth / 30; // Linear projection for contracts
    for (let i = 0; i < days; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      dailyIncome.set(key, (dailyIncome.get(key) ?? 0) + perDay);
    }
  }

  // 3. One-off Pending Expenses
  for (const e of pendingExpenses ?? []) {
    const d = String(e.due_date).slice(0, 10);
    const targetDate = d < today ? today : d;
    dailyExpense.set(targetDate, (dailyExpense.get(targetDate) ?? 0) + Number(e.amount));
  }

  // 4. Recurring Expenses
  for (const e of recurringExpenses ?? []) {
    const d = e.due_date ? String(e.due_date).slice(0, 10) : today;
    // For recurring expenses, we might want to project them occurring every X period from the due date?
    // Current logic just puts them on the due date. If it's recurring, it should recur.
    // The previous implementation was: dailyExpense.set(d, ...). This only counts it once!
    // We need to project it forward.
    // Simplifying assumption: if it's monthly, it happens on same day next month.

    // For now, let's keep the linear projection or "same day" logic.
    // Let's do "same day of month" projection for 90 days.
    const startObj = new Date(d);
    let current = new Date(startObj);
    while (current < new Date(new Date().setDate(new Date().getDate() + days))) {
      const key = current.toISOString().slice(0, 10);
      if (key >= today) {
        dailyExpense.set(key, (dailyExpense.get(key) ?? 0) + Number(e.amount));
      }
      // Increment by 1 month (assuming monthly for all recurring items effectively for now, or just map 'is_recurring' to monthly)
      current.setMonth(current.getMonth() + 1);
    }
  }

  const result: ForecastDay[] = [];
  let running = baseCash;
  for (let i = 0; i < days; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    running += dailyIncome.get(key) ?? 0;
    running -= dailyExpense.get(key) ?? 0;
    result.push({ date: key, projectedCash: Math.round(running * 100) / 100 });
  }
  return result;
}

export interface PayableOwingSummary {
  invoicesComingDue: number;
  invoicesOverdue1_30: number;
  invoicesOverdue31_60: number;
  expensesComingDue: number;
  expensesOverdue1_30: number;
  expensesOverdue31_60: number;
}

export async function getPayableOwingSummary(): Promise<PayableOwingSummary> {
  const empty: PayableOwingSummary = {
    invoicesComingDue: 0,
    invoicesOverdue1_30: 0,
    invoicesOverdue31_60: 0,
    expensesComingDue: 0,
    expensesOverdue1_30: 0,
    expensesOverdue31_60: 0,
  };
  if (!isSupabaseConfigured() || !supabase) return empty;

  const today = new Date().toISOString().slice(0, 10);
  const todayDate = new Date(today);
  const in30 = new Date(todayDate);
  in30.setDate(in30.getDate() + 30);
  const in30Str = in30.toISOString().slice(0, 10);
  const minus30 = new Date(todayDate);
  minus30.setDate(minus30.getDate() - 30);
  const minus30Str = minus30.toISOString().slice(0, 10);
  const minus60 = new Date(todayDate);
  minus60.setDate(minus60.getDate() - 60);
  const minus60Str = minus60.toISOString().slice(0, 10);

  const { data: invData } = await supabase
    .from('finance_invoices')
    .select('amount, due_date')
    .in('status', ['sent', 'overdue'])
    .not('due_date', 'is', null);
  const { data: expData } = await supabase
    .from('finance_expenses')
    .select('amount, due_date')
    .eq('status', 'pending')
    .not('due_date', 'is', null);

  let invoicesComingDue = 0,
    invoicesOverdue1_30 = 0,
    invoicesOverdue31_60 = 0;
  for (const r of invData ?? []) {
    const d = String(r.due_date);
    const amt = Number(r.amount);
    if (d > today) {
      if (d <= in30Str) invoicesComingDue += amt;
    } else {
      if (d >= minus30Str) invoicesOverdue1_30 += amt;
      else if (d >= minus60Str) invoicesOverdue31_60 += amt;
    }
  }

  let expensesComingDue = 0,
    expensesOverdue1_30 = 0,
    expensesOverdue31_60 = 0;
  for (const r of expData ?? []) {
    const d = String(r.due_date);
    const amt = Number(r.amount);
    if (d > today) {
      if (d <= in30Str) expensesComingDue += amt;
    } else {
      if (d >= minus30Str) expensesOverdue1_30 += amt;
      else if (d >= minus60Str) expensesOverdue31_60 += amt;
    }
  }

  return {
    invoicesComingDue,
    invoicesOverdue1_30,
    invoicesOverdue31_60,
    expensesComingDue,
    expensesOverdue1_30,
    expensesOverdue31_60,
  };
}
