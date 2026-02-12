import { supabase, isSupabaseConfigured } from '../supabase';
import type { WorkTaskLink, WorkTaskLinkEntityType } from '../../types';

function rowToLink(row: Record<string, unknown>): WorkTaskLink {
  return {
    id: String(row.id),
    taskId: String(row.task_id),
    entityType: row.entity_type as WorkTaskLinkEntityType,
    entityId: row.entity_id != null ? String(row.entity_id) : null,
    createdAt: String(row.created_at),
  };
}

export async function getLinksByTaskId(taskId: string): Promise<WorkTaskLink[]> {
  if (!isSupabaseConfigured() || !supabase) return [];
  const { data, error } = await supabase
    .from('work_task_links')
    .select('*')
    .eq('task_id', taskId)
    .order('created_at', { ascending: true });
  if (error) return [];
  return ((data ?? []) as Record<string, unknown>[]).map(rowToLink);
}

export async function addLink(
  taskId: string,
  entityType: WorkTaskLinkEntityType,
  entityId: string | null
): Promise<WorkTaskLink | null> {
  if (!isSupabaseConfigured() || !supabase) return null;
  const row = {
    task_id: taskId,
    entity_type: entityType,
    entity_id: entityId,
  };
  const { data, error } = await supabase.from('work_task_links').insert(row).select().single();
  if (error) return null;
  return rowToLink(data as Record<string, unknown>);
}

export async function removeLink(linkId: string): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) return false;
  const { error } = await supabase.from('work_task_links').delete().eq('id', linkId);
  return !error;
}

export async function setLinksForTask(
  taskId: string,
  links: { entityType: WorkTaskLinkEntityType; entityId: string | null }[]
): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) return false;
  const { error: delError } = await supabase.from('work_task_links').delete().eq('task_id', taskId);
  if (delError) return false;
  if (links.length === 0) return true;
  const rows = links.map((l) => ({
    task_id: taskId,
    entity_type: l.entityType,
    entity_id: l.entityId,
  }));
  const { error: insError } = await supabase.from('work_task_links').insert(rows);
  return !insError;
}
