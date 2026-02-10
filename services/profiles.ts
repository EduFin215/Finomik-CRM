import { supabase, isSupabaseConfigured } from './supabase';
import type { Profile } from '../types';

function mapProfile(row: Record<string, unknown>): Profile {
  return {
    id: String(row.id),
    email: row.email != null ? String(row.email) : null,
    displayName: row.display_name != null ? String(row.display_name) : null,
  };
}

export async function getProfiles(): Promise<Profile[]> {
  if (!isSupabaseConfigured() || !supabase) return [];
  const { data, error } = await supabase.from('profiles').select('id, email, display_name').order('display_name', { ascending: true, nullsFirst: false });
  if (error) {
    console.error('getProfiles error', error);
    return [];
  }
  return ((data ?? []) as Record<string, unknown>[]).map(mapProfile);
}
