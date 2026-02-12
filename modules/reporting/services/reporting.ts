import { supabase, isSupabaseConfigured } from '../../../services/supabase';
import { getCrmDashboardMetrics, type DateRange } from '../../../services/crm/dashboard';
import {
  getIncomeExpensesByMonthRange,
  getExpensesByCategoryRange,
  getForecastProjection,
} from '../../../services/finance/dashboard';

export interface ReportingDateRangeInput {
  from: string;
  to: string;
}

// --- Overview ---
export interface OverviewKpis {
  activeClients: number;
  newClientsInRange: number;
  openDeals: number;
  pipelineValue: number;
  activeProjects: number;
  openTasks: number;
  incomeInRange: number;
  netResult: number;
}

export interface OverviewLists {
  dealsClosingSoon: { id: string; title: string; clientId: string; clientName?: string; expectedCloseDate: string; valueEstimated?: number }[];
  overdueTasks: { id: string; title: string; dueAt: string | null; status: string }[];
}

export async function getOverviewKpis(dateRange: ReportingDateRangeInput): Promise<OverviewKpis> {
  const empty: OverviewKpis = {
    activeClients: 0,
    newClientsInRange: 0,
    openDeals: 0,
    pipelineValue: 0,
    activeProjects: 0,
    openTasks: 0,
    incomeInRange: 0,
    netResult: 0,
  };
  if (!isSupabaseConfigured() || !supabase) return empty;

  const range: DateRange = { key: 'custom', from: dateRange.from, to: dateRange.to };
  const [crm, workOpen, workOverdue, invPaid, expPaid] = await Promise.all([
    getCrmDashboardMetrics(range),
    supabase.from('work_tasks').select('id', { count: 'exact', head: true }).in('status', ['open', 'in_progress']),
    supabase.from('work_tasks').select('id, title, due_at, status').in('status', ['open', 'in_progress']).lt('due_at', new Date().toISOString().slice(0, 19)),
    supabase.from('finance_invoices').select('amount').eq('status', 'paid').gte('issue_date', dateRange.from).lte('issue_date', dateRange.to),
    supabase.from('finance_expenses').select('amount').eq('status', 'paid').gte('date', dateRange.from).lte('date', dateRange.to),
  ]);

  const incomeInRange = (invPaid.data ?? []).reduce((s, r) => s + Number(r.amount), 0);
  const expensesInRange = (expPaid.data ?? []).reduce((s, r) => s + Number(r.amount), 0);

  return {
    activeClients: crm.totalClients,
    newClientsInRange: crm.newClientsInRange,
    openDeals: crm.openDealsCount,
    pipelineValue: crm.pipelineValue,
    activeProjects: crm.activeProjectsCount,
    openTasks: (workOpen.count ?? 0) as number,
    incomeInRange,
    netResult: incomeInRange - expensesInRange,
  };
}

export async function getOverviewLists(dateRange: ReportingDateRangeInput): Promise<OverviewLists> {
  if (!isSupabaseConfigured() || !supabase) return { dealsClosingSoon: [], overdueTasks: [] };
  const range: DateRange = { key: 'custom', from: dateRange.from, to: dateRange.to };
  const crm = await getCrmDashboardMetrics(range);
  const { data: overdueRows } = await supabase
    .from('work_tasks')
    .select('id, title, due_at, status')
    .in('status', ['open', 'in_progress'])
    .lt('due_at', new Date().toISOString().slice(0, 19))
    .order('due_at', { ascending: true })
    .limit(10);
  const overdueTasks = (overdueRows ?? []).map((r: { id: string; title: string; due_at: string | null; status: string }) => ({
    id: r.id,
    title: r.title,
    dueAt: r.due_at,
    status: r.status,
  }));
  return {
    dealsClosingSoon: crm.dealsClosingSoon,
    overdueTasks,
  };
}

export async function getOverviewCharts(dateRange: ReportingDateRangeInput) {
  const [incomeExpensesByMonth, dealsByStage, workTasksByStatus] = await Promise.all([
    getIncomeExpensesByMonthRange(dateRange.from, dateRange.to),
    (async () => {
      if (!isSupabaseConfigured() || !supabase) return [];
      const { data } = await supabase.from('deals').select('stage, value_estimated');
      const rows = (data ?? []) as { stage: string; value_estimated: number | null }[];
      const map = new Map<string, { count: number; value: number }>();
      for (const r of rows) {
        const cur = map.get(r.stage) ?? { count: 0, value: 0 };
        cur.count += 1;
        cur.value += Number(r.value_estimated) || 0;
        map.set(r.stage, cur);
      }
      return Array.from(map.entries()).map(([stage, { count, value }]) => ({ stage, count, value }));
    })(),
    (async () => {
      if (!isSupabaseConfigured() || !supabase) return [];
      const { data } = await supabase.from('work_tasks').select('status').neq('status', 'archived');
      const rows = (data ?? []) as { status: string }[];
      const map = new Map<string, number>();
      for (const r of rows) {
        map.set(r.status, (map.get(r.status) ?? 0) + 1);
      }
      return Array.from(map.entries()).map(([status, count]) => ({ status, count }));
    })(),
  ]);
  return { incomeExpensesByMonth, dealsByStage, workTasksByStatus };
}

// --- Comercial ---
export interface ComercialKpis {
  newLeads: number;
  dealsWon: number;
  dealsLost: number;
  conversionRate: number | null;
  ticketMedio: number | null;
  pipelineTotal: number;
}

export async function getComercialKpis(dateRange: ReportingDateRangeInput): Promise<ComercialKpis> {
  const empty: ComercialKpis = { newLeads: 0, dealsWon: 0, dealsLost: 0, conversionRate: null, ticketMedio: null, pipelineTotal: 0 };
  if (!isSupabaseConfigured() || !supabase) return empty;

  const range: DateRange = { key: 'custom', from: dateRange.from, to: dateRange.to };
  const [crm, wonDeals] = await Promise.all([
    getCrmDashboardMetrics(range),
    supabase.from('deals').select('value_estimated').eq('stage', 'won').gte('updated_at', dateRange.from).lte('updated_at', dateRange.to + 'T23:59:59'),
  ]);

  const wonValues = (wonDeals.data ?? []).map((r: { value_estimated: number | null }) => Number(r.value_estimated) || 0).filter(Boolean);
  const ticketMedio = wonValues.length > 0 ? wonValues.reduce((a, b) => a + b, 0) / wonValues.length : null;

  const { count: lostCount } = await supabase
    .from('deals')
    .select('id', { count: 'exact', head: true })
    .eq('stage', 'lost')
    .gte('updated_at', dateRange.from)
    .lte('updated_at', dateRange.to + 'T23:59:59');

  const wonCount = wonValues.length;
  const lost = lostCount ?? 0;
  const conversionRate = wonCount + lost > 0 ? Math.round((wonCount / (wonCount + lost)) * 100) : null;

  const { data: leadSchools } = await supabase.from('schools').select('id').eq('archived', false).eq('type', 'lead').gte('created_at', dateRange.from).lte('created_at', dateRange.to + 'T23:59:59');
  const newLeads = (leadSchools ?? []).length;

  return {
    newLeads,
    dealsWon: wonCount,
    dealsLost: lost,
    conversionRate,
    ticketMedio,
    pipelineTotal: crm.pipelineValue,
  };
}

export async function getComercialCharts(dateRange: ReportingDateRangeInput) {
  if (!isSupabaseConfigured() || !supabase) {
    return { dealsByStage: [], wonLostByMonth: [], pipelineByMonth: [] };
  }
  const [dealsByStage, wonLostRaw, pipelineRaw] = await Promise.all([
    (async () => {
      const { data } = await supabase.from('deals').select('stage, value_estimated');
      const rows = (data ?? []) as { stage: string; value_estimated: number | null }[];
      const map = new Map<string, { count: number; value: number }>();
      for (const r of rows) {
        const cur = map.get(r.stage) ?? { count: 0, value: 0 };
        cur.count += 1;
        cur.value += Number(r.value_estimated) || 0;
        map.set(r.stage, cur);
      }
      return Array.from(map.entries()).map(([stage, { count, value }]) => ({ stage, count, value }));
    })(),
    supabase.from('deals').select('stage, updated_at').in('stage', ['won', 'lost']).gte('updated_at', dateRange.from).lte('updated_at', dateRange.to + 'T23:59:59'),
    supabase.from('deals').select('stage, value_estimated, updated_at').neq('stage', 'won').neq('stage', 'lost'),
  ]);

  const wonLostRows = (wonLostRaw.data ?? []) as { stage: string; updated_at: string }[];
  const byMonth = new Map<string, { won: number; lost: number }>();
  for (const r of wonLostRows) {
    const m = r.updated_at?.slice(0, 7) ?? '';
    if (!m) continue;
    const cur = byMonth.get(m) ?? { won: 0, lost: 0 };
    if (r.stage === 'won') cur.won += 1;
    else cur.lost += 1;
    byMonth.set(m, cur);
  }
  const wonLostByMonth = Array.from(byMonth.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, v]) => ({ month: month + '-01', won: v.won, lost: v.lost }));

  const pipelineRows = (pipelineRaw.data ?? []) as { stage: string; value_estimated: number | null; updated_at: string }[];
  const pipelineByMonthMap = new Map<string, number>();
  for (const r of pipelineRows) {
    const m = r.updated_at?.slice(0, 7) ?? '';
    if (m) pipelineByMonthMap.set(m, (pipelineByMonthMap.get(m) ?? 0) + (Number(r.value_estimated) || 0));
  }
  const pipelineByMonth = Array.from(pipelineByMonthMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, value]) => ({ month: month + '-01', value }));

  return { dealsByStage, wonLostByMonth, pipelineByMonth };
}

// --- Operativo ---
export interface OperativoKpis {
  openTasks: number;
  overdueTasks: number;
  highPriorityTasks: number;
  activeProjects: number;
  blockedProjects: number;
}

export async function getOperativoKpis(): Promise<OperativoKpis> {
  const empty: OperativoKpis = { openTasks: 0, overdueTasks: 0, highPriorityTasks: 0, activeProjects: 0, blockedProjects: 0 };
  if (!isSupabaseConfigured() || !supabase) return empty;

  const now = new Date().toISOString().slice(0, 19);
  const [openRes, overdueRes, highRes, activeProj, blockedProj] = await Promise.all([
    supabase.from('work_tasks').select('id', { count: 'exact', head: true }).in('status', ['open', 'in_progress']),
    supabase.from('work_tasks').select('id', { count: 'exact', head: true }).in('status', ['open', 'in_progress']).lt('due_at', now),
    supabase.from('work_tasks').select('id', { count: 'exact', head: true }).eq('priority', 'high').in('status', ['open', 'in_progress']),
    supabase.from('projects').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('projects').select('id', { count: 'exact', head: true }).eq('status', 'blocked'),
  ]);

  return {
    openTasks: (openRes.count ?? 0) as number,
    overdueTasks: (overdueRes.count ?? 0) as number,
    highPriorityTasks: (highRes.count ?? 0) as number,
    activeProjects: (activeProj.count ?? 0) as number,
    blockedProjects: (blockedProj.count ?? 0) as number,
  };
}

export async function getOperativoCharts() {
  if (!isSupabaseConfigured() || !supabase) {
    return { tasksByPriority: [], tasksByStatus: [], projectsByStatus: [] };
  }
  const [tasksRes, projectsRes] = await Promise.all([
    supabase.from('work_tasks').select('status, priority').neq('status', 'archived'),
    supabase.from('projects').select('status'),
  ]);

  const tasks = (tasksRes.data ?? []) as { status: string; priority: string }[];
  const projects = (projectsRes.data ?? []) as { status: string }[];

  const byPriority = new Map<string, number>();
  const byStatus = new Map<string, number>();
  for (const t of tasks) {
    byPriority.set(t.priority, (byPriority.get(t.priority) ?? 0) + 1);
    byStatus.set(t.status, (byStatus.get(t.status) ?? 0) + 1);
  }
  const tasksByPriority = Array.from(byPriority.entries()).map(([priority, count]) => ({ priority, count }));
  const tasksByStatus = Array.from(byStatus.entries()).map(([status, count]) => ({ status, count }));

  const projByStatus = new Map<string, number>();
  for (const p of projects) {
    projByStatus.set(p.status, (projByStatus.get(p.status) ?? 0) + 1);
  }
  const projectsByStatus = Array.from(projByStatus.entries()).map(([status, count]) => ({ status, count }));

  return { tasksByPriority, tasksByStatus, projectsByStatus };
}

// --- Financiero ---
export interface FinancieroKpis {
  incomeInRange: number;
  expensesInRange: number;
  netResult: number;
  pendingInvoicesSum: number;
  pendingInvoicesCount: number;
  burnRate: number;
  forecast60: number;
}

export async function getFinancieroKpis(dateRange: ReportingDateRangeInput): Promise<FinancieroKpis> {
  const empty: FinancieroKpis = {
    incomeInRange: 0,
    expensesInRange: 0,
    netResult: 0,
    pendingInvoicesSum: 0,
    pendingInvoicesCount: 0,
    burnRate: 0,
    forecast60: 0,
  };
  if (!isSupabaseConfigured() || !supabase) return empty;

  const [invPaid, expPaid, pendingInv, forecast] = await Promise.all([
    supabase.from('finance_invoices').select('amount').eq('status', 'paid').gte('issue_date', dateRange.from).lte('issue_date', dateRange.to),
    supabase.from('finance_expenses').select('amount').eq('status', 'paid').gte('date', dateRange.from).lte('date', dateRange.to),
    supabase.from('finance_invoices').select('amount').in('status', ['sent', 'overdue']),
    getForecastProjection(60),
  ]);

  const incomeInRange = (invPaid.data ?? []).reduce((s, r) => s + Number(r.amount), 0);
  const expensesInRange = (expPaid.data ?? []).reduce((s, r) => s + Number(r.amount), 0);
  const pendingList = (pendingInv.data ?? []) as { amount: number }[];
  const pendingInvoicesSum = pendingList.reduce((s, r) => s + Number(r.amount), 0);
  const pendingInvoicesCount = pendingList.length;

  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
  const from3 = threeMonthsAgo.toISOString().slice(0, 10);
  const toNow = new Date().toISOString().slice(0, 10);
  const { data: exp3 } = await supabase.from('finance_expenses').select('amount').eq('status', 'paid').gte('date', from3).lte('date', toNow);
  const totalExp3 = (exp3 ?? []).reduce((s, r) => s + Number(r.amount), 0);
  const burnRate = totalExp3 / 3;

  const forecast60 = forecast.length > 0 ? forecast[Math.min(59, forecast.length - 1)].projectedCash : 0;

  return {
    incomeInRange,
    expensesInRange,
    netResult: incomeInRange - expensesInRange,
    pendingInvoicesSum,
    pendingInvoicesCount,
    burnRate,
    forecast60,
  };
}

export async function getFinancieroCharts(dateRange: ReportingDateRangeInput) {
  const [incomeExpensesByMonth, expensesByCategory, forecast] = await Promise.all([
    getIncomeExpensesByMonthRange(dateRange.from, dateRange.to),
    getExpensesByCategoryRange(dateRange.from, dateRange.to),
    getForecastProjection(60),
  ]);
  return { incomeExpensesByMonth, expensesByCategory, forecast };
}
