import { supabase, isSupabaseConfigured } from '../supabase';
import type { ClientContact, ContactImportance } from '../../types';

function rowToContact(row: Record<string, unknown>): ClientContact {
  return {
    id: String(row.id),
    clientId: String(row.client_id),
    fullName: String(row.full_name),
    roleTitle: row.role_title != null ? String(row.role_title) : null,
    email: row.email != null ? String(row.email) : null,
    phone: row.phone != null ? String(row.phone) : null,
    importance: (row.importance === 'key' ? 'key' : 'normal') as ContactImportance,
    notes: row.notes != null ? String(row.notes) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export async function listClientContacts(clientId: string): Promise<ClientContact[]> {
  if (!isSupabaseConfigured() || !supabase) return [];
  const { data, error } = await supabase
    .from('client_contacts')
    .select('*')
    .eq('client_id', clientId)
    .order('full_name');
  if (error) return [];
  return ((data ?? []) as Record<string, unknown>[]).map(rowToContact);
}

export async function createClientContact(
  clientId: string,
  data: {
    fullName: string;
    roleTitle?: string | null;
    email?: string | null;
    phone?: string | null;
    importance?: ContactImportance;
    notes?: string | null;
  }
): Promise<ClientContact | null> {
  if (!isSupabaseConfigured() || !supabase) return null;
  const { data: row, error } = await supabase
    .from('client_contacts')
    .insert({
      client_id: clientId,
      full_name: data.fullName,
      role_title: data.roleTitle ?? null,
      email: data.email ?? null,
      phone: data.phone ?? null,
      importance: data.importance ?? 'normal',
      notes: data.notes ?? null,
    })
    .select()
    .single();
  if (error) return null;
  return rowToContact(row as Record<string, unknown>);
}

export async function updateClientContact(
  id: string,
  partial: Partial<Pick<ClientContact, 'fullName' | 'roleTitle' | 'email' | 'phone' | 'importance' | 'notes'>>
): Promise<ClientContact | null> {
  if (!isSupabaseConfigured() || !supabase) return null;
  const row: Record<string, unknown> = {};
  if (partial.fullName != null) row.full_name = partial.fullName;
  if (partial.roleTitle !== undefined) row.role_title = partial.roleTitle;
  if (partial.email !== undefined) row.email = partial.email;
  if (partial.phone !== undefined) row.phone = partial.phone;
  if (partial.importance != null) row.importance = partial.importance;
  if (partial.notes !== undefined) row.notes = partial.notes;
  const { data, error } = await supabase.from('client_contacts').update(row).eq('id', id).select().single();
  if (error) return null;
  return rowToContact(data as Record<string, unknown>);
}

export async function deleteClientContact(id: string): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) return false;
  const { error } = await supabase.from('client_contacts').delete().eq('id', id);
  return !error;
}
