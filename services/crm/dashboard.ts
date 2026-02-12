import { supabase, isSupabaseConfigured } from '../supabase';

export type DateRangeKey = 'last30' | 'last90' | 'ytd' | 'custom';

export interface DateRange {
  key: DateRangeKey;
  from: string; // ISO date
  to: string;
}

export function getDateRange(key: DateRangeKey, customFrom?: string, customTo?: string): DateRange {
  const now = new Date();
  const to = now.toISOString().slice(0, 10);
  let from: string;
  if (key === 'last30') {
    const d = new Date(now);
    d.setDate(d.getDate() - 30);
    from = d.toISOString().slice(0, 10);
  } else if (key === 'last90') {
    const d = new Date(now);
    d.setDate(d.getDate() - 90);
    from = d.toISOString().slice(0, 10);
  } else if (key === 'ytd') {
    from = `${now.getFullYear()}-01-01`;
  } else {
    from = customFrom ?? to;
    return { key: 'custom', from, to: customTo ?? to };
  }
  return { key, from, to };
}

export interface CrmDashboardMetrics {
  totalClients: number;
  newClientsInRange: number;
  openDealsCount: number;
  pipelineValue: number;
  wonDealsInRange: number;
  conversionRate: number | null;
  activeProjectsCount: number;
  tasksDueSoonCount: number;
  dealsByStage: { stage: string; count: number; value: number }[];
  pipelineValueByMonth: { month: string; value: number }[];
  newClientsByMonth: { month: string; count: number }[];
  projectsByStatus: { status: string; count: number }[];
  latestUpdatedClients: { id: string; name: string; updatedAt: string }[];
  dealsClosingSoon: { id: string; title: string; clientId: string; clientName?: string; expectedCloseDate: string; valueEstimated?: number }[];
  staleDeals: { id: string; title: string; clientId: string; clientName?: string; updatedAt: string; stage: string }[];
}

const STALE_DAYS = 14;

export async function getCrmDashboardMetrics(
  dateRange: DateRange,
  clientType?: string
): Promise<CrmDashboardMetrics> {
  const empty: CrmDashboardMetrics = {
    totalClients: 0,
    newClientsInRange: 0,
    openDealsCount: 0,
    pipelineValue: 0,
    wonDealsInRange: 0,
    conversionRate: null,
    activeProjectsCount: 0,
    tasksDueSoonCount: 0,
    dealsByStage: [],
    pipelineValueByMonth: [],
    newClientsByMonth: [],
    projectsByStatus: [],
    latestUpdatedClients: [],
    dealsClosingSoon: [],
    staleDeals: [],
  };

  if (!isSupabaseConfigured() || !supabase) return empty;

  try {
  const { from, to } = dateRange;

  let schoolsQ = supabase.from('schools').select('id, created_at, updated_at, type').eq('archived', false);
  if (clientType) schoolsQ = schoolsQ.eq('type', clientType);
  let newClientsQ = supabase.from('schools').select('id').eq('archived', false).gte('created_at', from).lte('created_at', to + 'T23:59:59');
  if (clientType) newClientsQ = newClientsQ.eq('type', clientType);
  let latestQ = supabase.from('schools').select('id, name, updated_at').eq('archived', false).order('updated_at', { ascending: false }).limit(10);
  if (clientType) latestQ = latestQ.eq('type', clientType);

  const [clientsRes, newClientsRes, dealsRes, wonLostRes, projectsRes, tasksRes, schoolsForLatestRes] = await Promise.all([
    schoolsQ,
    newClientsQ,
    supabase.from('deals').select('id, stage, value_estimated, expected_close_date, updated_at, client_id'),
    supabase.from('deals').select('stage').in('stage', ['won', 'lost']).gte('updated_at', from).lte('updated_at', to + 'T23:59:59'),
    supabase.from('projects').select('id, status').eq('status', 'active'),
    supabase.from('tasks').select('id').eq('completed', false).gte('due_date', new Date().toISOString().slice(0, 10)).lte('due_date', new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)),
    latestQ,
  ]);

  const allClients = (clientsRes.error ? [] : (clientsRes.data ?? [])) as { id: string }[];
  const totalClients = allClients.length;
  const newClientsInRangeFinal = (newClientsRes.error ? [] : (newClientsRes.data ?? [])).length;

  const deals = (dealsRes.error ? [] : (dealsRes.data ?? [])) as { id: string; stage: string; value_estimated: number | null; expected_close_date: string | null; updated_at: string; client_id: string }[];
  const openDeals = deals.filter((d) => d.stage !== 'won' && d.stage !== 'lost');
  const openDealsCount = openDeals.length;
  const pipelineValue = openDeals.reduce((sum, d) => sum + (Number(d.value_estimated) || 0), 0);

  const wonLost = (wonLostRes.error ? [] : (wonLostRes.data ?? [])) as { stage: string }[];
  const wonInRange = wonLost.filter((d) => d.stage === 'won').length;
  const lostInRange = wonLost.filter((d) => d.stage === 'lost').length;
  const wonDealsInRange = wonInRange;
  const conversionRate = wonInRange + lostInRange > 0 ? Math.round((wonInRange / (wonInRange + lostInRange)) * 100) : null;

  const activeProjects = (projectsRes.error ? [] : (projectsRes.data ?? [])) as { id: string }[];
  const activeProjectsCount = activeProjects.length;

  const tasksDueSoon = (tasksRes.error ? [] : (tasksRes.data ?? [])) as { id: string }[];
  const tasksDueSoonCount = tasksDueSoon.length;

  const stageMap = new Map<string, { count: number; value: number }>();
  for (const d of deals) {
    const cur = stageMap.get(d.stage) ?? { count: 0, value: 0 };
    cur.count += 1;
    cur.value += Number(d.value_estimated) || 0;
    stageMap.set(d.stage, cur);
  }
  const dealsByStage = Array.from(stageMap.entries()).map(([stage, { count, value }]) => ({ stage, count, value }));

  const projectsRes2 = await supabase.from('projects').select('status');
  const projects = (projectsRes2.error ? [] : (projectsRes2.data ?? [])) as { status: string }[];
  const statusMap = new Map<string, number>();
  for (const p of projects) {
    statusMap.set(p.status, (statusMap.get(p.status) ?? 0) + 1);
  }
  const projectsByStatus = Array.from(statusMap.entries()).map(([status, count]) => ({ status, count }));

  const pipelineValueByMonth: { month: string; value: number }[] = [];
  const newClientsByMonth: { month: string; count: number }[] = [];

  const dealsWithDates = (dealsRes.data ?? []) as { stage: string; value_estimated: number | null; updated_at: string }[];
  const monthValueMap = new Map<string, number>();
  for (const d of dealsWithDates) {
    if (d.stage === 'won' || d.stage === 'lost') continue;
    const m = d.updated_at?.slice(0, 7) ?? '';
    if (m) monthValueMap.set(m, (monthValueMap.get(m) ?? 0) + (Number(d.value_estimated) || 0));
  }
  for (const [month, value] of monthValueMap) {
    pipelineValueByMonth.push({ month: month + '-01', value });
  }
  pipelineValueByMonth.sort((a, b) => a.month.localeCompare(b.month));

  const schoolsCreatedRes = await supabase.from('schools').select('created_at').eq('archived', false).gte('created_at', from).lte('created_at', to + 'T23:59:59');
  const schoolsCreated = (schoolsCreatedRes.error ? [] : (schoolsCreatedRes.data ?? [])) as { created_at: string }[];
  const monthCountMap = new Map<string, number>();
  for (const s of schoolsCreated) {
    const m = s.created_at?.slice(0, 7) ?? '';
    if (m) monthCountMap.set(m, (monthCountMap.get(m) ?? 0) + 1);
  }
  for (const [month, count] of monthCountMap) {
    newClientsByMonth.push({ month: month + '-01', count });
  }
  newClientsByMonth.sort((a, b) => a.month.localeCompare(b.month));

  const latestSchools = (schoolsForLatestRes.error ? [] : (schoolsForLatestRes.data ?? [])) as { id: string; name: string; updated_at: string }[];
  const latestUpdatedClients = latestSchools.map((s) => ({ id: s.id, name: s.name, updatedAt: s.updated_at }));

  const today = new Date().toISOString().slice(0, 10);
  const in30 = new Date();
  in30.setDate(in30.getDate() + 30);
  const in30Str = in30.toISOString().slice(0, 10);
  const { data: closingDealsData } = await supabase
    .from('deals')
    .select('id, title, client_id, expected_close_date, value_estimated')
    .not('expected_close_date', 'is', null)
    .gte('expected_close_date', today)
    .lte('expected_close_date', in30Str)
    .neq('stage', 'won')
    .neq('stage', 'lost')
    .order('expected_close_date', { ascending: true })
    .limit(10);
  const closingDeals = (closingDealsData ?? []) as { id: string; title: string; client_id: string; expected_close_date: string; value_estimated: number | null }[];
  const clientIds = [...new Set(closingDeals.map((d) => d.client_id))];
  const clientNamesMap = new Map<string, string>();
  if (clientIds.length > 0) {
    const { data: names } = await supabase.from('schools').select('id, name').in('id', clientIds);
    for (const r of names ?? []) {
      clientNamesMap.set((r as { id: string; name: string }).id, (r as { id: string; name: string }).name);
    }
  }
  const dealsClosingSoon = closingDeals.map((d) => ({
    id: d.id,
    title: d.title,
    clientId: d.client_id,
    clientName: clientNamesMap.get(d.client_id),
    expectedCloseDate: d.expected_close_date,
    valueEstimated: d.value_estimated ?? undefined,
  }));

  const staleCutoff = new Date();
  staleCutoff.setDate(staleCutoff.getDate() - STALE_DAYS);
  const staleCutoffStr = staleCutoff.toISOString().slice(0, 10);
  const { data: staleDealsData } = await supabase
    .from('deals')
    .select('id, title, client_id, updated_at, stage')
    .lt('updated_at', staleCutoffStr + 'T23:59:59')
    .neq('stage', 'won')
    .neq('stage', 'lost')
    .order('updated_at', { ascending: true })
    .limit(10);
  const staleDealsRows = (staleDealsData ?? []) as { id: string; title: string; client_id: string; updated_at: string; stage: string }[];
  const staleClientIds = [...new Set(staleDealsRows.map((d) => d.client_id))];
  const staleNamesMap = new Map<string, string>();
  if (staleClientIds.length > 0) {
    const { data: names } = await supabase.from('schools').select('id, name').in('id', staleClientIds);
    for (const r of names ?? []) {
      staleNamesMap.set((r as { id: string; name: string }).id, (r as { id: string; name: string }).name);
    }
  }
  const staleDeals = staleDealsRows.map((d) => ({
    id: d.id,
    title: d.title,
    clientId: d.client_id,
    clientName: staleNamesMap.get(d.client_id),
    updatedAt: d.updated_at,
    stage: d.stage,
  }));

  return {
    totalClients,
    newClientsInRange: newClientsInRangeFinal,
    openDealsCount,
    pipelineValue,
    wonDealsInRange,
    conversionRate,
    activeProjectsCount,
    tasksDueSoonCount,
    dealsByStage,
    pipelineValueByMonth,
    newClientsByMonth,
    projectsByStatus,
    latestUpdatedClients,
    dealsClosingSoon,
    staleDeals,
  };
  } catch {
    return empty;
  }
}
