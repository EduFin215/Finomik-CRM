import { supabase, isSupabaseConfigured } from '../supabase';
import type { FinanceSettings } from '../../types';

function rowToSettings(row: Record<string, unknown>): FinanceSettings {
  return {
    id: String(row.id),
    startingCash: row.starting_cash != null ? Number(row.starting_cash) : null,
    defaultCurrency: String(row.default_currency ?? 'EUR'),
    updatedAt: String(row.updated_at ?? ''),
  };
}

export async function getFinanceSettings(): Promise<FinanceSettings | null> {
  if (!isSupabaseConfigured() || !supabase) return null;
  const { data, error } = await supabase.from('finance_settings').select('*').limit(1).single();
  if (error || !data) return null;
  return rowToSettings(data as Record<string, unknown>);
}

export async function updateFinanceSettings(
  input: Partial<Pick<FinanceSettings, 'startingCash' | 'defaultCurrency'>>
): Promise<FinanceSettings | null> {
  if (!isSupabaseConfigured() || !supabase) return null;
  const row: Record<string, unknown> = {};
  if (input.startingCash !== undefined) row.starting_cash = input.startingCash;
  if (input.defaultCurrency !== undefined) row.default_currency = input.defaultCurrency;
  const { data, error } = await supabase.from('finance_settings').update(row).select().limit(1).single();
  if (error || !data) return null;
  return rowToSettings(data as Record<string, unknown>);
}
