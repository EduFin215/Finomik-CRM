import { supabase, isSupabaseConfigured } from '../supabase';
import type { FinanceInvoice } from '../../types';

function rowToInvoice(row: Record<string, unknown>): FinanceInvoice {
  return {
    id: String(row.id),
    contractId: row.contract_id != null ? String(row.contract_id) : null,
    title: String(row.title ?? ''),
    amount: Number(row.amount ?? 0),
    currency: String(row.currency ?? 'EUR'),
    issueDate: String(row.issue_date ?? ''),
    dueDate: row.due_date != null ? String(row.due_date) : null,
    status: (row.status as FinanceInvoice['status']) ?? 'draft',
    externalSource: row.external_source != null ? String(row.external_source) : null,
    externalId: row.external_id != null ? String(row.external_id) : null,
    syncedAt: row.synced_at != null ? String(row.synced_at) : null,
    createdAt: String(row.created_at ?? ''),
    updatedAt: String(row.updated_at ?? ''),
    contractTitle: row.contract_title as string | undefined,
  };
}

export interface ListFinanceInvoicesParams {
  status?: FinanceInvoice['status'] | FinanceInvoice['status'][];
  issueDateFrom?: string;
  issueDateTo?: string;
}

export async function listFinanceInvoices(params?: ListFinanceInvoicesParams): Promise<FinanceInvoice[]> {
  if (!isSupabaseConfigured() || !supabase) return [];
  let query = supabase
    .from('finance_invoices')
    .select('*, finance_contracts(title)')
    .order('issue_date', { ascending: false });
  if (params?.status != null) {
    if (Array.isArray(params.status)) {
      if (params.status.length > 0) query = query.in('status', params.status);
    } else {
      query = query.eq('status', params.status);
    }
  }
  if (params?.issueDateFrom) query = query.gte('issue_date', params.issueDateFrom);
  if (params?.issueDateTo) query = query.lte('issue_date', params.issueDateTo);
  const { data, error } = await query;
  if (error || !data) return [];
  return (data as Record<string, unknown>[]).map((row) => {
    const contract = row.finance_contracts as { title?: string } | null;
    return rowToInvoice({
      ...row,
      contract_title: contract?.title,
      finance_contracts: undefined,
    });
  });
}

export async function getFinanceInvoice(id: string): Promise<FinanceInvoice | null> {
  if (!isSupabaseConfigured() || !supabase) return null;
  const { data, error } = await supabase
    .from('finance_invoices')
    .select('*, finance_contracts(title)')
    .eq('id', id)
    .single();
  if (error || !data) return null;
  const row = data as Record<string, unknown>;
  const contract = row.finance_contracts as { title?: string } | null;
  return rowToInvoice({ ...row, contract_title: contract?.title, finance_contracts: undefined });
}

export async function createFinanceInvoice(
  input: Omit<FinanceInvoice, 'id' | 'createdAt' | 'updatedAt'>
): Promise<FinanceInvoice | null> {
  if (!isSupabaseConfigured() || !supabase) return null;
  const row = {
    contract_id: input.contractId ?? null,
    title: input.title,
    amount: input.amount,
    currency: input.currency,
    issue_date: input.issueDate,
    due_date: input.dueDate ?? null,
    status: input.status,
    external_source: input.externalSource ?? null,
    external_id: input.externalId ?? null,
  };
  const { data, error } = await supabase.from('finance_invoices').insert(row).select().single();
  if (error || !data) return null;
  return rowToInvoice(data as Record<string, unknown>);
}

export async function updateFinanceInvoice(
  id: string,
  input: Partial<Omit<FinanceInvoice, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<FinanceInvoice | null> {
  if (!isSupabaseConfigured() || !supabase) return null;
  const row: Record<string, unknown> = {};
  if (input.contractId !== undefined) row.contract_id = input.contractId;
  if (input.title !== undefined) row.title = input.title;
  if (input.amount !== undefined) row.amount = input.amount;
  if (input.currency !== undefined) row.currency = input.currency;
  if (input.issueDate !== undefined) row.issue_date = input.issueDate;
  if (input.dueDate !== undefined) row.due_date = input.dueDate;
  if (input.status !== undefined) row.status = input.status;
  if (input.externalSource !== undefined) row.external_source = input.externalSource;
  if (input.externalId !== undefined) row.external_id = input.externalId;
  const { data, error } = await supabase.from('finance_invoices').update(row).eq('id', id).select().single();
  if (error || !data) return null;
  return rowToInvoice(data as Record<string, unknown>);
}

export async function deleteFinanceInvoice(id: string): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) return false;
  const { error } = await supabase.from('finance_invoices').delete().eq('id', id);
  return !error;
}

/** Invoices due or overdue (for dashboard list). */
export async function listFinanceInvoicesDue(limit = 8): Promise<FinanceInvoice[]> {
  if (!isSupabaseConfigured() || !supabase) return [];
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from('finance_invoices')
    .select('*')
    .in('status', ['sent', 'overdue'])
    .not('due_date', 'is', null)
    .order('due_date', { ascending: true })
    .limit(limit);
  if (error || !data) return [];
  return (data as Record<string, unknown>[]).map(rowToInvoice);
}
