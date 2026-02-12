import { supabase, isSupabaseConfigured } from '../supabase';
import type { Deal, DealStage } from '../../types';

function rowToDeal(row: Record<string, unknown>, clientName?: string): Deal {
  return {
    id: String(row.id),
    clientId: String(row.client_id),
    title: String(row.title),
    stage: (row.stage as DealStage) ?? 'new',
    valueEstimated: row.value_estimated != null ? Number(row.value_estimated) : null,
    currency: String(row.currency ?? 'EUR'),
    probability: row.probability != null ? Number(row.probability) : null,
    expectedCloseDate: row.expected_close_date != null ? String(row.expected_close_date) : null,
    notes: row.notes != null ? String(row.notes) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    clientName,
  };
}

export interface ListDealsFilters {
  stage?: DealStage;
  expectedCloseFrom?: string;
  expectedCloseTo?: string;
  clientType?: string;
}

export async function listDeals(filters: ListDealsFilters = {}): Promise<Deal[]> {
  if (!isSupabaseConfigured() || !supabase) return [];

  let query = supabase.from('deals').select('*, schools(name)').order('updated_at', { ascending: false });

  if (filters.stage) query = query.eq('stage', filters.stage);
  if (filters.expectedCloseFrom) query = query.gte('expected_close_date', filters.expectedCloseFrom);
  if (filters.expectedCloseTo) query = query.lte('expected_close_date', filters.expectedCloseTo);
  if (filters.clientType) {
    const { data: schools } = await supabase.from('schools').select('id').eq('type', filters.clientType);
    const schoolIds = (schools ?? []).map((s: { id: string }) => s.id);
    if (schoolIds.length === 0) return [];
    query = query.in('client_id', schoolIds);
  }

  const { data, error } = await query;
  if (error) return [];

  const rows = (data ?? []) as (Record<string, unknown> & { schools?: { name: string } | null })[];
  return rows.map((row) => {
    const clientName = row.schools && typeof row.schools === 'object' && 'name' in row.schools ? (row.schools as { name: string }).name : undefined;
    const { schools: _s, ...rest } = row;
    return rowToDeal(rest, clientName);
  });
}

export async function listClientDeals(clientId: string): Promise<Deal[]> {
  if (!isSupabaseConfigured() || !supabase) return [];
  const { data, error } = await supabase
    .from('deals')
    .select('*')
    .eq('client_id', clientId)
    .order('expected_close_date', { ascending: true, nullsFirst: false });
  if (error) return [];
  return ((data ?? []) as Record<string, unknown>[]).map((r) => rowToDeal(r));
}

export async function getDealById(id: string): Promise<Deal | null> {
  if (!isSupabaseConfigured() || !supabase) return null;
  const { data, error } = await supabase.from('deals').select('*').eq('id', id).single();
  if (error || !data) return null;
  return rowToDeal(data as Record<string, unknown>);
}

export async function createDeal(
  clientId: string,
  data: {
    title: string;
    stage?: DealStage;
    valueEstimated?: number | null;
    currency?: string;
    probability?: number | null;
    expectedCloseDate?: string | null;
    notes?: string | null;
  }
): Promise<Deal | null> {
  if (!isSupabaseConfigured() || !supabase) return null;
  const { data: row, error } = await supabase
    .from('deals')
    .insert({
      client_id: clientId,
      title: data.title,
      stage: data.stage ?? 'new',
      value_estimated: data.valueEstimated ?? null,
      currency: data.currency ?? 'EUR',
      probability: data.probability ?? null,
      expected_close_date: data.expectedCloseDate ?? null,
      notes: data.notes ?? null,
    })
    .select()
    .single();
  if (error) return null;
  return rowToDeal(row as Record<string, unknown>);
}

export async function updateDeal(
  id: string,
  partial: Partial<Pick<Deal, 'title' | 'stage' | 'valueEstimated' | 'currency' | 'probability' | 'expectedCloseDate' | 'notes'>>
): Promise<Deal | null> {
  if (!isSupabaseConfigured() || !supabase) return null;
  const row: Record<string, unknown> = {};
  if (partial.title != null) row.title = partial.title;
  if (partial.stage != null) row.stage = partial.stage;
  if (partial.valueEstimated !== undefined) row.value_estimated = partial.valueEstimated;
  if (partial.currency != null) row.currency = partial.currency;
  if (partial.probability !== undefined) row.probability = partial.probability;
  if (partial.expectedCloseDate !== undefined) row.expected_close_date = partial.expectedCloseDate;
  if (partial.notes !== undefined) row.notes = partial.notes;
  const { data, error } = await supabase.from('deals').update(row).eq('id', id).select().single();
  if (error) return null;
  return rowToDeal(data as Record<string, unknown>);
}

export async function deleteDeal(id: string): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) return false;
  const { error } = await supabase.from('deals').delete().eq('id', id);
  return !error;
}
