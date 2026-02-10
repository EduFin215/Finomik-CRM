import { supabase, isSupabaseConfigured } from './supabase';

export interface AuditLogEntry {
  id: string;
  entityType: string;
  entityId: string;
  userId: string | null;
  action: string;
  oldData: Record<string, unknown> | null;
  newData: Record<string, unknown> | null;
  createdAt: string;
}

function mapAuditRow(row: Record<string, unknown>): AuditLogEntry {
  return {
    id: String(row.id),
    entityType: String(row.entity_type),
    entityId: String(row.entity_id),
    userId: row.user_id != null ? String(row.user_id) : null,
    action: String(row.action),
    oldData: row.old_data != null ? (row.old_data as Record<string, unknown>) : null,
    newData: row.new_data != null ? (row.new_data as Record<string, unknown>) : null,
    createdAt: String(row.created_at),
  };
}

export async function getAuditLogBySchool(schoolId: string): Promise<AuditLogEntry[]> {
  if (!isSupabaseConfigured() || !supabase) return [];
  const { data, error } = await supabase
    .from('audit_log')
    .select('*')
    .eq('entity_type', 'school')
    .eq('entity_id', schoolId)
    .order('created_at', { ascending: false });
  if (error) {
    console.error('getAuditLogBySchool error', error);
    return [];
  }
  return ((data ?? []) as Record<string, unknown>[]).map(mapAuditRow);
}
