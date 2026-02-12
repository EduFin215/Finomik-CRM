import React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../hooks/useAuth';
import { listMyWorkTasks, processReminderNotifications } from '../../services/tasks';
import TaskRow from './TaskRow';
import TaskFormModal from './TaskFormModal';
import type { WorkTask } from '../../types';
import { PlusCircle } from 'lucide-react';
import { isSupabaseConfigured } from '../../services/supabase';

function getStartOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function getEndOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function groupMyTasks(tasks: WorkTask[]) {
  const now = new Date();
  const startToday = getStartOfDay(now);
  const endToday = getEndOfDay(now);
  const endUpcoming = new Date(now);
  endUpcoming.setDate(endUpcoming.getDate() + 7);

  const overdue: WorkTask[] = [];
  const dueToday: WorkTask[] = [];
  const remindersToday: WorkTask[] = [];
  const upcoming: WorkTask[] = [];
  const seen = new Set<string>();

  for (const t of tasks) {
    const dueAt = t.dueAt ? new Date(t.dueAt) : null;
    const remindAt = t.remindAt ? new Date(t.remindAt) : null;

    if (dueAt && dueAt < startToday) {
      overdue.push(t);
      seen.add(t.id);
    }
  }
  for (const t of tasks) {
    if (seen.has(t.id)) continue;
    const dueAt = t.dueAt ? new Date(t.dueAt) : null;
    if (dueAt && dueAt >= startToday && dueAt <= endToday) {
      dueToday.push(t);
      seen.add(t.id);
    }
  }
  for (const t of tasks) {
    if (seen.has(t.id)) continue;
    const remindAt = t.remindAt ? new Date(t.remindAt) : null;
    if (remindAt && remindAt >= startToday && remindAt <= endToday) {
      remindersToday.push(t);
      seen.add(t.id);
    }
  }
  for (const t of tasks) {
    if (seen.has(t.id)) continue;
    const dueAt = t.dueAt ? new Date(t.dueAt) : null;
    const remindAt = t.remindAt ? new Date(t.remindAt) : null;
    const inNext7 = (d: Date) => d >= now && d <= endUpcoming;
    if ((dueAt && inNext7(dueAt)) || (remindAt && inNext7(remindAt))) {
      upcoming.push(t);
      seen.add(t.id);
    }
  }

  return { overdue, dueToday, remindersToday, upcoming };
}

export default function MyTasksView() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [formOpen, setFormOpen] = React.useState(false);
  const [editingTask, setEditingTask] = React.useState<WorkTask | null>(null);

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['work-tasks', 'my', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      await processReminderNotifications();
      const list = await listMyWorkTasks(user.id);
      queryClient.invalidateQueries({ queryKey: ['work-task-notification-count', user.id] });
      return list;
    },
    enabled: !!user?.id && isSupabaseConfigured(),
  });

  const groups = groupMyTasks(tasks);
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['work-tasks'], exact: false });

  return (
    <div className="h-full overflow-auto p-4 sm:p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="text-xl font-title text-primary">My Tasks</h1>
          <button
            type="button"
            onClick={() => {
              setEditingTask(null);
              setFormOpen(true);
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-brand-500 transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            New Task
          </button>
        </div>

        {isLoading ? (
          <p className="text-brand-500 text-sm">Loading...</p>
        ) : (
          <>
            {groups.overdue.length > 0 && (
              <section>
                <h2 className="text-xs font-bold uppercase tracking-wide text-red-600 mb-2">
                  Overdue
                </h2>
                <ul className="space-y-2">
                  {groups.overdue.map((t) => (
                    <TaskRow
                      key={t.id}
                      task={t}
                      isOverdue
                      onEdit={() => {
                        setEditingTask(t);
                        setFormOpen(true);
                      }}
                      onDone={invalidate}
                      onSnooze={invalidate}
                    />
                  ))}
                </ul>
              </section>
            )}
            {groups.dueToday.length > 0 && (
              <section>
                <h2 className="text-xs font-bold uppercase tracking-wide text-brand-500 mb-2">
                  Due Today
                </h2>
                <ul className="space-y-2">
                  {groups.dueToday.map((t) => (
                    <TaskRow
                      key={t.id}
                      task={t}
                      onEdit={() => {
                        setEditingTask(t);
                        setFormOpen(true);
                      }}
                      onDone={invalidate}
                      onSnooze={invalidate}
                    />
                  ))}
                </ul>
              </section>
            )}
            {groups.remindersToday.length > 0 && (
              <section>
                <h2 className="text-xs font-bold uppercase tracking-wide text-brand-500 mb-2">
                  Reminders Today
                </h2>
                <ul className="space-y-2">
                  {groups.remindersToday.map((t) => (
                    <TaskRow
                      key={t.id}
                      task={t}
                      onEdit={() => {
                        setEditingTask(t);
                        setFormOpen(true);
                      }}
                      onDone={invalidate}
                      onSnooze={invalidate}
                    />
                  ))}
                </ul>
              </section>
            )}
            {groups.upcoming.length > 0 && (
              <section>
                <h2 className="text-xs font-bold uppercase tracking-wide text-brand-500 mb-2">
                  Upcoming (next 7 days)
                </h2>
                <ul className="space-y-2">
                  {groups.upcoming.map((t) => (
                    <TaskRow
                      key={t.id}
                      task={t}
                      onEdit={() => {
                        setEditingTask(t);
                        setFormOpen(true);
                      }}
                      onDone={invalidate}
                      onSnooze={invalidate}
                    />
                  ))}
                </ul>
              </section>
            )}
            {tasks.length === 0 && (
              <p className="text-brand-500 text-sm py-8 text-center">
                No tasks. Create one with New Task.
              </p>
            )}
          </>
        )}
      </div>

      {formOpen && (
        <TaskFormModal
          initialTask={editingTask}
          defaultAssigneeUserId={user?.id ?? null}
          onClose={() => {
            setFormOpen(false);
            setEditingTask(null);
          }}
          onSaved={() => {
            invalidate();
            setFormOpen(false);
            setEditingTask(null);
          }}
        />
      )}
    </div>
  );
}
