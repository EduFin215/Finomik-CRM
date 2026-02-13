import { supabase, isSupabaseConfigured } from '../supabase';
import type { FinanceExpense } from '../../types';

function rowToExpense(row: Record<string, unknown>): FinanceExpense {
  return {
    id: String(row.id),
    title: String(row.title ?? ''),
    vendor: String(row.vendor ?? ''),
    category: String(row.category ?? 'other'),
    amount: Number(row.amount ?? 0),
    currency: String(row.currency ?? 'EUR'),
    date: String(row.date ?? ''),
    dueDate: row.due_date != null ? String(row.due_date) : null,
    status: (row.status as FinanceExpense['status']) ?? 'pending',
    isRecurring: Boolean(row.is_recurring),
    recurrenceRule: row.recurrence_rule != null ? String(row.recurrence_rule) : null,
    externalSource: row.external_source != null ? String(row.external_source) : null,
    externalId: row.external_id != null ? String(row.external_id) : null,
    syncedAt: row.synced_at != null ? String(row.synced_at) : null,
    createdAt: String(row.created_at ?? ''),
    updatedAt: String(row.updated_at ?? ''),
  };
}

export async function listFinanceExpenses(params?: {
  fromDate?: string;
  toDate?: string;
  category?: string;
  status?: FinanceExpense['status'];
}): Promise<FinanceExpense[]> {
  if (!isSupabaseConfigured() || !supabase) return [];
  let query = supabase.from('finance_expenses').select('*').order('date', { ascending: false });
  if (params?.fromDate) query = query.gte('date', params.fromDate);
  if (params?.toDate) query = query.lte('date', params.toDate);
  if (params?.category) query = query.eq('category', params.category);
  if (params?.status) query = query.eq('status', params.status);
  const { data, error } = await query;
  if (error || !data) return [];
  return (data as Record<string, unknown>[]).map(rowToExpense);
}

export async function getFinanceExpense(id: string): Promise<FinanceExpense | null> {
  if (!isSupabaseConfigured() || !supabase) return null;
  const { data, error } = await supabase.from('finance_expenses').select('*').eq('id', id).single();
  if (error || !data) return null;
  return rowToExpense(data as Record<string, unknown>);
}

export async function createFinanceExpense(
  input: Omit<FinanceExpense, 'id' | 'createdAt' | 'updatedAt'>
): Promise<FinanceExpense | null> {
  if (!isSupabaseConfigured() || !supabase) return null;
  const row = {
    title: input.title,
    vendor: input.vendor,
    category: input.category,
    amount: input.amount,
    currency: input.currency,
    date: input.date,
    due_date: input.dueDate ?? null,
    status: input.status,
    is_recurring: input.isRecurring,
    recurrence_rule: input.recurrenceRule ?? null,
    external_source: input.externalSource ?? null,
    external_id: input.externalId ?? null,
  };
  const { data, error } = await supabase.from('finance_expenses').insert(row).select().single();
  if (error || !data) return null;
  return rowToExpense(data as Record<string, unknown>);
}

export async function updateFinanceExpense(
  id: string,
  input: Partial<Omit<FinanceExpense, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<FinanceExpense | null> {
  if (!isSupabaseConfigured() || !supabase) return null;
  const row: Record<string, unknown> = {};
  if (input.title !== undefined) row.title = input.title;
  if (input.vendor !== undefined) row.vendor = input.vendor;
  if (input.category !== undefined) row.category = input.category;
  if (input.amount !== undefined) row.amount = input.amount;
  if (input.currency !== undefined) row.currency = input.currency;
  if (input.date !== undefined) row.date = input.date;
  if (input.dueDate !== undefined) row.due_date = input.dueDate;
  if (input.status !== undefined) row.status = input.status;
  if (input.isRecurring !== undefined) row.is_recurring = input.isRecurring;
  if (input.recurrenceRule !== undefined) row.recurrence_rule = input.recurrenceRule;
  if (input.externalSource !== undefined) row.external_source = input.externalSource;
  if (input.externalId !== undefined) row.external_id = input.externalId;
  const { data, error } = await supabase.from('finance_expenses').update(row).eq('id', id).select().single();
  if (error || !data) return null;
  return rowToExpense(data as Record<string, unknown>);
}

export async function deleteFinanceExpense(id: string): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) return false;
  const { error } = await supabase.from('finance_expenses').delete().eq('id', id);
  return !error;
}

export interface ExpensesSummary {
  pendingTotal: number;
  paidThisMonth: number;
  recurringCount: number;
}

export async function getExpensesSummary(): Promise<ExpensesSummary> {
  const empty: ExpensesSummary = {
    pendingTotal: 0,
    paidThisMonth: 0,
    recurringCount: 0,
  };
  if (!isSupabaseConfigured() || !supabase) return empty;

  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().slice(0, 10);

  const [pendingRes, paidRes, recurringRes] = await Promise.all([
    supabase.from('finance_expenses').select('amount').eq('status', 'pending'),
    supabase
      .from('finance_expenses')
      .select('amount')
      .eq('status', 'paid')
      .gte('date', firstDay)
      .lte('date', lastDay),
    supabase.from('finance_expenses').select('id').eq('is_recurring', true).neq('status', 'cancelled'),
  ]);

  const pendingTotal = (pendingRes.data ?? []).reduce((s, r) => s + Number(r.amount), 0);
  const paidThisMonth = (paidRes.data ?? []).reduce((s, r) => s + Number(r.amount), 0);
  const recurringCount = recurringRes.data?.length ?? 0;

  return { pendingTotal, paidThisMonth, recurringCount };
}

/** Upcoming recurring expenses (for dashboard). */
export async function listUpcomingRecurringExpenses(limit = 8): Promise<FinanceExpense[]> {
  if (!isSupabaseConfigured() || !supabase) return [];
  const { data, error } = await supabase
    .from('finance_expenses')
    .select('*')
    .eq('is_recurring', true)
    .neq('status', 'cancelled')
    .order('due_date', { ascending: true, nullsFirst: false })
    .limit(limit);
  if (error || !data) return [];
  return (data as Record<string, unknown>[]).map(rowToExpense);
}
