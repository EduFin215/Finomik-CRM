import { supabase, isSupabaseConfigured } from '../supabase';
import { Phase } from '../../types';

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
  totalSchools: number;
  newLeadsInRange: number;
  openOpportunities: number;
  pipelineValue: number;
  wonInRange: number;
  activeOnboarding: number;
  activeClients: number;
  tasksDueSoonCount: number;
  pipelineByPhase: { phase: string; count: number; value: number }[];
  pipelineValueByMonth: { month: string; value: number }[]; // Estimated close date
  newLeadsByMonth: { month: string; count: number }[];
  opportunitiesClosingSoon: { id: string; name: string; expectedCloseDate: string; value: number }[];
  staleOpportunities: { id: string; name: string; updatedAt: string; phase: string }[];
}

const STALE_DAYS = 14;

// Sales Phases
const SALES_PHASES = [
  Phase.INTERESTED,
  Phase.MEETING,
  Phase.PROPOSAL,
  Phase.NEGOTIATION
];

const ONBOARDING_PHASES = [
  Phase.CLOSED_WON,
  Phase.ONBOARDING_SETUP,
  Phase.ONBOARDING_TRAINING,
  Phase.ONBOARDING_DONE
];

export async function getCrmDashboardMetrics(
  dateRange: DateRange
): Promise<CrmDashboardMetrics> {
  const empty: CrmDashboardMetrics = {
    totalSchools: 0,
    newLeadsInRange: 0,
    openOpportunities: 0,
    pipelineValue: 0,
    wonInRange: 0,
    activeOnboarding: 0,
    activeClients: 0,
    tasksDueSoonCount: 0,
    pipelineByPhase: [],
    pipelineValueByMonth: [],
    newLeadsByMonth: [],
    opportunitiesClosingSoon: [],
    staleOpportunities: [],
  };

  if (!isSupabaseConfigured() || !supabase) return empty;

  try {
    const { from, to } = dateRange;

    // 1. Fetch relevant Schools (we fetch minimal fields to do aggs in JS for simplicity, 
    // or we could do multiple counts. Given dataset size, fetching all IDs/Phases is likely fine for now).
    // Note: value_estimated, expected_close_date are new fields.
    const { data: schools, error } = await supabase
      .from('schools')
      .select('id, name, phase, status, created_at, updated_at, value_estimated, expected_close_date')
      .eq('archived', false);

    if (error || !schools) return empty;

    // 2. Fetch Tasks count separately
    const { count: tasksCount } = await supabase
      .from('tasks')
      .select('id', { count: 'exact', head: true })
      .eq('completed', false)
      .gte('due_date', new Date().toISOString().slice(0, 10))
      .lte('due_date', new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10));

    // Metrics Calculation
    const totalSchools = schools.length;

    // New Leads in Range
    const newLeadsInRange = schools.filter(s =>
      s.created_at >= from && s.created_at <= to + 'T23:59:59'
    ).length;

    // Open Opportunities (Sales Phases)
    const openOppSchools = schools.filter(s => SALES_PHASES.includes(s.phase as Phase));
    const openOpportunities = openOppSchools.length;
    const pipelineValue = openOppSchools.reduce((sum, s) => sum + (Number(s.value_estimated) || 0), 0);

    // Won In Range (Approximation: active/onboarding phase AND updated in range. 
    // Ideally we'd have a 'won_at' date or history table).
    const wonInRange = schools.filter(s =>
      (ONBOARDING_PHASES.includes(s.phase as Phase) || s.phase === Phase.ACTIVE) &&
      s.updated_at >= from && s.updated_at <= to + 'T23:59:59'
    ).length;

    // Active Onboarding
    const activeOnboarding = schools.filter(s => ONBOARDING_PHASES.includes(s.phase as Phase)).length;

    // Active Clients
    const activeClients = schools.filter(s => s.phase === Phase.ACTIVE).length;

    // Pipeline by Phase
    const phaseMap = new Map<string, { count: number; value: number }>();
    for (const phase of SALES_PHASES) {
      phaseMap.set(phase, { count: 0, value: 0 });
    }
    for (const s of openOppSchools) {
      const current = phaseMap.get(s.phase) || { count: 0, value: 0 };
      current.count++;
      current.value += (Number(s.value_estimated) || 0);
      phaseMap.set(s.phase, current);
    }
    const pipelineByPhase = Array.from(phaseMap.entries()).map(([phase, { count, value }]) => ({ phase, count, value }));

    // Pipeline Value by Month (Forecast based on Expected Close Date)
    const forecastMap = new Map<string, number>();
    for (const s of openOppSchools) {
      if (s.expected_close_date) {
        const m = s.expected_close_date.slice(0, 7); // YYYY-MM
        forecastMap.set(m, (forecastMap.get(m) || 0) + (Number(s.value_estimated) || 0));
      }
    }
    const pipelineValueByMonth = Array.from(forecastMap.entries())
      .map(([month, value]) => ({ month: month + '-01', value }))
      .sort((a, b) => a.month.localeCompare(b.month));

    // New Leads by Month (Historical)
    const leadsMap = new Map<string, number>();
    for (const s of schools) {
      const m = s.created_at.slice(0, 7);
      leadsMap.set(m, (leadsMap.get(m) || 0) + 1);
    }
    const newLeadsByMonth = Array.from(leadsMap.entries())
      .map(([month, count]) => ({ month: month + '-01', count }))
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-6); // Last 6 months

    // Opportunities Closing Soon (Next 30 days)
    const today = new Date().toISOString().slice(0, 10);
    const in30 = new Date();
    in30.setDate(in30.getDate() + 30);
    const in30Str = in30.toISOString().slice(0, 10);

    const opportunitiesClosingSoon = openOppSchools
      .filter(s => s.expected_close_date && s.expected_close_date >= today && s.expected_close_date <= in30Str)
      .sort((a, b) => (a.expected_close_date || '').localeCompare(b.expected_close_date || ''))
      .map(s => ({
        id: s.id,
        name: s.name,
        expectedCloseDate: s.expected_close_date!,
        value: s.value_estimated || 0
      }))
      .slice(0, 5);

    // Stale Opportunities (No update in 14 days)
    const staleCutoff = new Date();
    staleCutoff.setDate(staleCutoff.getDate() - STALE_DAYS);
    const staleCutoffStr = staleCutoff.toISOString();

    const staleOpportunities = openOppSchools
      .filter(s => s.updated_at < staleCutoffStr)
      .sort((a, b) => a.updated_at.localeCompare(b.updated_at))
      .map(s => ({
        id: s.id,
        name: s.name,
        updatedAt: s.updated_at,
        phase: s.phase
      }))
      .slice(0, 5);

    return {
      totalSchools,
      newLeadsInRange,
      openOpportunities,
      pipelineValue,
      wonInRange,
      activeOnboarding,
      activeClients,
      tasksDueSoonCount: tasksCount || 0,
      pipelineByPhase,
      pipelineValueByMonth,
      newLeadsByMonth,
      opportunitiesClosingSoon,
      staleOpportunities
    };

  } catch (err) {
    console.error('Error fetching dashboard metrics:', err);
    return empty;
  }
}

