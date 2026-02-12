import { supabase, isSupabaseConfigured } from '../supabase';
import type { FinanceContract } from '../../types';

function rowToContract(row: Record<string, unknown>): FinanceContract {
  return {
    id: String(row.id),
    clientId: row.client_id != null ? String(row.client_id) : null,
    title: String(row.title ?? ''),
    startDate: String(row.start_date ?? ''),
    endDate: row.end_date != null ? String(row.end_date) : null,
    frequency: (row.frequency as FinanceContract['frequency']) ?? 'monthly',
    amount: Number(row.amount ?? 0),
    currency: String(row.currency ?? 'EUR'),
    status: (row.status as FinanceContract['status']) ?? 'active',
    externalSource: row.external_source != null ? String(row.external_source) : null,
    externalId: row.external_id != null ? String(row.external_id) : null,
    syncedAt: row.synced_at != null ? String(row.synced_at) : null,
    createdAt: String(row.created_at ?? ''),
    updatedAt: String(row.updated_at ?? ''),
    clientName:
      row.clientName != null
        ? String(row.clientName)
        : row.schools != null && typeof row.schools === 'object' && 'name' in row.schools
          ? String((row.schools as { name: unknown }).name)
          : undefined,
  };
}

export async function listFinanceContracts(): Promise<FinanceContract[]> {
  if (!isSupabaseConfigured() || !supabase) return [];
  const { data, error } = await supabase
    .from('finance_contracts')
    .select('*, schools(name)')
    .order('start_date', { ascending: false });
  if (error || !data) return [];
  return (data as Record<string, unknown>[]).map((row) => {
    const school = row.schools as { name?: string } | null;
    return rowToContract({
      ...row,
      clientName: school?.name,
      schools: undefined,
    });
  });
}

export async function getFinanceContract(id: string): Promise<FinanceContract | null> {
  if (!isSupabaseConfigured() || !supabase) return null;
  const { data, error } = await supabase
    .from('finance_contracts')
    .select('*, schools(name)')
    .eq('id', id)
    .single();
  if (error || !data) return null;
  const row = data as Record<string, unknown>;
  const school = row.schools as { name?: string } | null;
  return rowToContract({ ...row, clientName: school?.name, schools: undefined });
}

export async function createFinanceContract(
  input: Omit<FinanceContract, 'id' | 'createdAt' | 'updatedAt'>
): Promise<FinanceContract | null> {
  if (!isSupabaseConfigured() || !supabase) return null;
  const row = {
    client_id: input.clientId ?? null,
    title: input.title,
    start_date: input.startDate,
    end_date: input.endDate ?? null,
    frequency: input.frequency,
    amount: input.amount,
    currency: input.currency,
    status: input.status,
    external_source: input.externalSource ?? null,
    external_id: input.externalId ?? null,
  };
  const { data, error } = await supabase.from('finance_contracts').insert(row).select().single();
  if (error || !data) return null;
  return rowToContract(data as Record<string, unknown>);
}

export async function updateFinanceContract(
  id: string,
  input: Partial<Omit<FinanceContract, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<FinanceContract | null> {
  if (!isSupabaseConfigured() || !supabase) return null;
  const row: Record<string, unknown> = {};
  if (input.clientId !== undefined) row.client_id = input.clientId;
  if (input.title !== undefined) row.title = input.title;
  if (input.startDate !== undefined) row.start_date = input.startDate;
  if (input.endDate !== undefined) row.end_date = input.endDate;
  if (input.frequency !== undefined) row.frequency = input.frequency;
  if (input.amount !== undefined) row.amount = input.amount;
  if (input.currency !== undefined) row.currency = input.currency;
  if (input.status !== undefined) row.status = input.status;
  if (input.externalSource !== undefined) row.external_source = input.externalSource;
  if (input.externalId !== undefined) row.external_id = input.externalId;
  const { data, error } = await supabase.from('finance_contracts').update(row).eq('id', id).select().single();
  if (error || !data) return null;
  return rowToContract(data as Record<string, unknown>);
}

export async function deleteFinanceContract(id: string): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) return false;
  const { error } = await supabase.from('finance_contracts').delete().eq('id', id);
  return !error;
}
