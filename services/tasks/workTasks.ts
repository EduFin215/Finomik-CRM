import { supabase, isSupabaseConfigured } from '../supabase';
import type {
  WorkTask,
  WorkTaskStatus,
  WorkTaskPriority,
  WorkTaskLink,
  WorkTaskLinkEntityType,
} from '../../types';
import { getLinksByTaskId, setLinksForTask } from './workTaskLinks';

function rowToWorkTask(row: Record<string, unknown>, links?: WorkTaskLink[]): WorkTask {
  return {
    id: String(row.id),
    title: String(row.title),
    description: row.description != null ? String(row.description) : null,
    status: (row.status as WorkTaskStatus) ?? 'open',
    priority: (row.priority as WorkTaskPriority) ?? 'medium',
    dueAt: row.due_at != null ? String(row.due_at) : null,
    remindAt: row.remind_at != null ? String(row.remind_at) : null,
    assigneeUserId: row.assignee_user_id != null ? String(row.assignee_user_id) : null,
    createdByUserId: row.created_by_user_id != null ? String(row.created_by_user_id) : null,
    completedAt: row.completed_at != null ? String(row.completed_at) : null,
    reminderNotifiedAt: row.reminder_notified_at != null ? String(row.reminder_notified_at) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    ...(links && { links }),
  };
}

export interface CreateWorkTaskInput {
  title: string;
  description?: string | null;
  dueAt?: string | null;
  remindAt?: string | null;
  priority?: WorkTaskPriority;
  assigneeUserId?: string | null;
  createdByUserId?: string | null;
  links?: { entityType: WorkTaskLinkEntityType; entityId: string | null }[];
}

export async function createWorkTask(input: CreateWorkTaskInput): Promise<WorkTask | null> {
  if (!isSupabaseConfigured() || !supabase) return null;
  const row = {
    title: input.title.trim(),
    description: input.description?.trim() || null,
    status: 'open' as const,
    priority: input.priority ?? 'medium',
    due_at: input.dueAt || null,
    remind_at: input.remindAt || null,
    assignee_user_id: input.assigneeUserId ?? input.createdByUserId ?? null,
    created_by_user_id: input.createdByUserId || null,
  };
  const { data, error } = await supabase.from('work_tasks').insert(row).select().single();
  if (error) return null;
  const task = rowToWorkTask(data as Record<string, unknown>);
  if (input.links && input.links.length > 0) {
    await setLinksForTask(task.id, input.links);
    task.links = input.links.map((l, i) => ({
      id: `temp-${i}`,
      taskId: task.id,
      entityType: l.entityType,
      entityId: l.entityId,
      createdAt: task.createdAt,
    }));
  }
  return task;
}

export async function getWorkTask(id: string): Promise<WorkTask | null> {
  if (!isSupabaseConfigured() || !supabase) return null;
  const { data, error } = await supabase.from('work_tasks').select('*').eq('id', id).single();
  if (error || !data) return null;
  const links = await getLinksByTaskId(String(data.id));
  return rowToWorkTask(data as Record<string, unknown>, links);
}

export async function updateWorkTask(
  id: string,
  partial: Partial<Pick<WorkTask, 'title' | 'description' | 'status' | 'priority' | 'dueAt' | 'remindAt' | 'assigneeUserId' | 'reminderNotifiedAt'>>
): Promise<WorkTask | null> {
  if (!isSupabaseConfigured() || !supabase) return null;
  const row: Record<string, unknown> = {};
  if (partial.title !== undefined) row.title = partial.title.trim();
  if (partial.description !== undefined) row.description = partial.description?.trim() ?? null;
  if (partial.status !== undefined) row.status = partial.status;
  if (partial.priority !== undefined) row.priority = partial.priority;
  if (partial.dueAt !== undefined) row.due_at = partial.dueAt;
  if (partial.remindAt !== undefined) row.remind_at = partial.remindAt;
  if (partial.assigneeUserId !== undefined) row.assignee_user_id = partial.assigneeUserId;
  if (partial.reminderNotifiedAt !== undefined) row.reminder_notified_at = partial.reminderNotifiedAt;
  if (partial.status === 'done') row.completed_at = new Date().toISOString();
  if (Object.keys(row).length === 0) return getWorkTask(id);
  const { data, error } = await supabase.from('work_tasks').update(row).eq('id', id).select().single();
  if (error) return null;
  const links = await getLinksByTaskId(id);
  return rowToWorkTask(data as Record<string, unknown>, links);
}

export async function markWorkTaskDone(id: string): Promise<WorkTask | null> {
  return updateWorkTask(id, { status: 'done' });
}

export async function snoozeWorkTask(
  id: string,
  remindAt: string
): Promise<WorkTask | null> {
  return updateWorkTask(id, { remindAt });
}

export async function listMyWorkTasks(assigneeUserId: string): Promise<WorkTask[]> {
  if (!isSupabaseConfigured() || !supabase) return [];
  const { data, error } = await supabase
    .from('work_tasks')
    .select('*')
    .eq('assignee_user_id', assigneeUserId)
    .in('status', ['open', 'in_progress'])
    .order('due_at', { ascending: true, nullsFirst: false })
    .order('remind_at', { ascending: true, nullsFirst: false });
  if (error) return [];
  const tasks = ((data ?? []) as Record<string, unknown>[]).map((r) => rowToWorkTask(r));
  const withLinks = await Promise.all(
    tasks.map(async (t) => {
      const links = await getLinksByTaskId(t.id);
      return { ...t, links };
    })
  );
  return withLinks;
}

export interface ListAllWorkTasksFilters {
  assigneeUserId?: string | null;
  status?: WorkTaskStatus | WorkTaskStatus[];
  priority?: WorkTaskPriority;
  dueFrom?: string;
  dueTo?: string;
  /** When true: only tasks with due_at < now and status in open/in_progress */
  overdue?: boolean;
  entityType?: WorkTaskLinkEntityType;
  search?: string;
}

export interface ListAllWorkTasksOptions {
  filters?: ListAllWorkTasksFilters;
  sortBy?: 'due_at' | 'priority' | 'updated_at';
  sortAsc?: boolean;
  limit?: number;
  offset?: number;
}

export async function listAllWorkTasks(options: ListAllWorkTasksOptions = {}): Promise<WorkTask[]> {
  if (!isSupabaseConfigured() || !supabase) return [];
  let query = supabase
    .from('work_tasks')
    .select('*')
    .neq('status', 'archived');

  const { filters = {}, sortBy = 'updated_at', sortAsc = false, limit = 500, offset = 0 } = options;

  const effectiveStatus = filters.overdue ? ['open', 'in_progress'] as WorkTaskStatus[] : filters.status;
  const effectiveDueTo = filters.overdue ? new Date().toISOString().slice(0, 19) : filters.dueTo;

  if (filters.assigneeUserId != null) query = query.eq('assignee_user_id', filters.assigneeUserId);
  if (effectiveStatus != null) {
    if (Array.isArray(effectiveStatus)) {
      if (effectiveStatus.length > 0) query = query.in('status', effectiveStatus);
    } else {
      query = query.eq('status', effectiveStatus);
    }
  }
  if (filters.priority) query = query.eq('priority', filters.priority);
  if (filters.dueFrom) query = query.gte('due_at', filters.dueFrom);
  if (effectiveDueTo) query = query.lte('due_at', effectiveDueTo);
  if (filters.search?.trim()) {
    const term = `%${filters.search.trim()}%`;
    query = query.or(`title.ilike.${term},description.ilike.${term}`);
  }

  const orderCol = sortBy === 'updated_at' ? 'updated_at' : sortBy === 'due_at' ? 'due_at' : 'priority';
  query = query.order(orderCol, { ascending: sortAsc, nullsFirst: orderCol !== 'due_at' });
  query = query.range(offset, offset + limit - 1);

  const { data, error } = await query;
  if (error) return [];

  let tasks = ((data ?? []) as Record<string, unknown>[]).map((r) => rowToWorkTask(r));
  if (filters.entityType) {
    const { data: linkRows } = await supabase
      .from('work_task_links')
      .select('task_id')
      .eq('entity_type', filters.entityType);
    const taskIds = new Set((linkRows ?? []).map((r: { task_id: string }) => r.task_id));
    tasks = tasks.filter((t) => taskIds.has(t.id));
  }
  const withLinks = await Promise.all(
    tasks.map(async (t) => {
      const links = await getLinksByTaskId(t.id);
      return { ...t, links };
    })
  );
  return withLinks;
}

export async function updateWorkTaskLinks(
  taskId: string,
  links: { entityType: WorkTaskLinkEntityType; entityId: string | null }[]
): Promise<boolean> {
  return setLinksForTask(taskId, links);
}

/** Payload for AI/create-task Edge Function (and for createWorkTaskViaApi). */
export interface CreateTaskApiPayload {
  title: string;
  description?: string | null;
  due_at?: string | null;
  remind_at?: string | null;
  priority?: 'low' | 'medium' | 'high';
  assignee_user_id?: string | null;
  links?: { entity_type: WorkTaskLinkEntityType; entity_id: string | null }[];
}

/**
 * Create a work task via the create-task Edge Function.
 * Use this when the caller (e.g. AI) should use the server-side API with the current user's JWT.
 * On success returns { success: true, taskId, task }. On failure throws or returns { error }.
 */
export async function createWorkTaskViaApi(
  payload: CreateTaskApiPayload
): Promise<{ success: true; taskId: string; task: { id: string; title: string; created_at: string } } | { error: string }> {
  if (!isSupabaseConfigured() || !supabase) return { error: 'Supabase not configured' };
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) return { error: 'Not authenticated' };
  const { data, error } = await supabase.functions.invoke('create-task', {
    body: payload,
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
  if (error) return { error: error.message ?? 'Function error' };
  if (data?.error) return { error: data.error };
  if (data?.success && data?.taskId) {
    return {
      success: true,
      taskId: data.taskId,
      task: data.task ?? { id: data.taskId, title: payload.title, created_at: new Date().toISOString() },
    };
  }
  return { error: 'Unexpected response' };
}
