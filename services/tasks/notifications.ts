import { supabase, isSupabaseConfigured } from '../supabase';

/**
 * Find work tasks whose remind_at is due and not yet notified;
 * create a work_task_notification for each and set reminder_notified_at.
 */
export async function processReminderNotifications(): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return;
  const now = new Date().toISOString();
  const { data: tasks, error: fetchError } = await supabase
    .from('work_tasks')
    .select('id, assignee_user_id')
    .lte('remind_at', now)
    .is('reminder_notified_at', null)
    .in('status', ['open', 'in_progress']);
  if (fetchError || !tasks?.length) return;
  for (const t of tasks as { id: string; assignee_user_id: string | null }[]) {
    if (!t.assignee_user_id) continue;
    await supabase.from('work_task_notifications').insert({
      user_id: t.assignee_user_id,
      work_task_id: t.id,
    });
    await supabase
      .from('work_tasks')
      .update({ reminder_notified_at: now })
      .eq('id', t.id);
  }
}

export async function getUnreadWorkTaskNotificationCount(userId: string): Promise<number> {
  if (!isSupabaseConfigured() || !supabase) return 0;
  const { count, error } = await supabase
    .from('work_task_notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_read', false);
  if (error) return 0;
  return count ?? 0;
}

export async function markWorkTaskNotificationRead(notificationId: string): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) return false;
  const { error } = await supabase
    .from('work_task_notifications')
    .update({ is_read: true })
    .eq('id', notificationId);
  return !error;
}

export async function markAllWorkTaskNotificationsRead(userId: string): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) return false;
  const { error } = await supabase
    .from('work_task_notifications')
    .update({ is_read: true })
    .eq('user_id', userId);
  return !error;
}
