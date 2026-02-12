import { supabase, isSupabaseConfigured } from '../supabase';
import type { Project, ProjectStatus } from '../../types';

function rowToProject(row: Record<string, unknown>, clientName?: string): Project {
  return {
    id: String(row.id),
    clientId: String(row.client_id),
    title: String(row.title),
    status: (row.status as ProjectStatus) ?? 'planned',
    startDate: row.start_date != null ? String(row.start_date) : null,
    dueDate: row.due_date != null ? String(row.due_date) : null,
    notes: row.notes != null ? String(row.notes) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    clientName,
  };
}

export interface ListProjectsFilters {
  status?: ProjectStatus;
  dueDateFrom?: string;
  dueDateTo?: string;
}

export async function listProjects(filters: ListProjectsFilters = {}): Promise<Project[]> {
  if (!isSupabaseConfigured() || !supabase) return [];

  let query = supabase.from('projects').select('*, schools(name)').order('updated_at', { ascending: false });

  if (filters.status) query = query.eq('status', filters.status);
  if (filters.dueDateFrom) query = query.gte('due_date', filters.dueDateFrom);
  if (filters.dueDateTo) query = query.lte('due_date', filters.dueDateTo);

  const { data, error } = await query;
  if (error) return [];

  const rows = (data ?? []) as (Record<string, unknown> & { schools?: { name: string } | null })[];
  return rows.map((row) => {
    const clientName = row.schools && typeof row.schools === 'object' && 'name' in row.schools ? (row.schools as { name: string }).name : undefined;
    const { schools: _s, ...rest } = row;
    return rowToProject(rest, clientName);
  });
}

export async function listClientProjects(clientId: string): Promise<Project[]> {
  if (!isSupabaseConfigured() || !supabase) return [];
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('client_id', clientId)
    .order('due_date', { ascending: true, nullsFirst: false });
  if (error) return [];
  return ((data ?? []) as Record<string, unknown>[]).map((r) => rowToProject(r));
}

export async function getProjectById(id: string): Promise<Project | null> {
  if (!isSupabaseConfigured() || !supabase) return null;
  const { data, error } = await supabase.from('projects').select('*').eq('id', id).single();
  if (error || !data) return null;
  return rowToProject(data as Record<string, unknown>);
}

export async function createProject(
  clientId: string,
  data: {
    title: string;
    status?: ProjectStatus;
    startDate?: string | null;
    dueDate?: string | null;
    notes?: string | null;
  }
): Promise<Project | null> {
  if (!isSupabaseConfigured() || !supabase) return null;
  const { data: row, error } = await supabase
    .from('projects')
    .insert({
      client_id: clientId,
      title: data.title,
      status: data.status ?? 'planned',
      start_date: data.startDate ?? null,
      due_date: data.dueDate ?? null,
      notes: data.notes ?? null,
    })
    .select()
    .single();
  if (error) return null;
  return rowToProject(row as Record<string, unknown>);
}

export async function updateProject(
  id: string,
  partial: Partial<Pick<Project, 'title' | 'status' | 'startDate' | 'dueDate' | 'notes'>>
): Promise<Project | null> {
  if (!isSupabaseConfigured() || !supabase) return null;
  const row: Record<string, unknown> = {};
  if (partial.title != null) row.title = partial.title;
  if (partial.status != null) row.status = partial.status;
  if (partial.startDate !== undefined) row.start_date = partial.startDate;
  if (partial.dueDate !== undefined) row.due_date = partial.dueDate;
  if (partial.notes !== undefined) row.notes = partial.notes;
  const { data, error } = await supabase.from('projects').update(row).eq('id', id).select().single();
  if (error) return null;
  return rowToProject(data as Record<string, unknown>);
}

export async function deleteProject(id: string): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) return false;
  const { error } = await supabase.from('projects').delete().eq('id', id);
  return !error;
}
