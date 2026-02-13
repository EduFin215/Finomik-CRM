import React, { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { listMyWorkTasks, listAllWorkTasks, processReminderNotifications } from '../../services/tasks';
import TaskRow from './TaskRow';
import TaskFormModal from './TaskFormModal';
import type { WorkTask, WorkTaskStatus, WorkTaskPriority, WorkTaskLinkEntityType } from '../../types';
import { PlusCircle, Filter, ArrowUpDown, ArrowDownUp } from 'lucide-react';
import { isSupabaseConfigured } from '../../services/supabase';
import { getProfiles } from '../../services/profiles';
import { formatTaskDateTime } from './formatTaskDate';

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

const STATUS_LABELS: Record<WorkTaskStatus, string> = {
  open: 'Open',
  in_progress: 'In progress',
  done: 'Done',
  archived: 'Archived',
};
const PRIORITY_LABELS: Record<WorkTaskPriority, string> = { low: 'L', medium: 'M', high: 'H' };
const ENTITY_LABELS: Record<WorkTaskLinkEntityType, string> = {
  client: 'Lead',
  deal: 'Deal',
  project: 'Project',
  internal: 'Internal',
};

interface TasksListViewProps {
  filter: 'my' | 'all';
}

export default function TasksListView({ filter }: TasksListViewProps) {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const [formOpen, setFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<WorkTask | null>(null);
  const [filterAssignee, setFilterAssignee] = useState('');
  const [filterStatus, setFilterStatus] = useState<WorkTaskStatus | ''>('');
  const [filterPriority, setFilterPriority] = useState<WorkTaskPriority | ''>('');
  const [filterEntityType, setFilterEntityType] = useState<WorkTaskLinkEntityType | ''>('');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'due_at' | 'priority' | 'updated_at'>('updated_at');
  const [sortAsc, setSortAsc] = useState(false);

  useEffect(() => {
    const s = searchParams.get('status');
    const p = searchParams.get('priority');
    const a = searchParams.get('assignee');
    const e = searchParams.get('entityType');
    if (s) setFilterStatus(s as WorkTaskStatus);
    if (p) setFilterPriority(p as WorkTaskPriority);
    if (a !== null) setFilterAssignee(a || '');
    if (e) setFilterEntityType(e as WorkTaskLinkEntityType);
  }, [searchParams]);

  const { data: profiles = [] } = useQuery({
    queryKey: ['profiles'],
    queryFn: getProfiles,
    enabled: isSupabaseConfigured(),
  });

  const { data: myTasks = [], isLoading: myLoading } = useQuery({
    queryKey: ['work-tasks', 'my', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      await processReminderNotifications();
      queryClient.invalidateQueries({ queryKey: ['work-task-notification-count', user.id] });
      return listMyWorkTasks(user.id);
    },
    enabled: filter === 'my' && !!user?.id && isSupabaseConfigured(),
  });

  const { data: allTasks = [], isLoading: allLoading } = useQuery({
    queryKey: [
      'work-tasks',
      'all',
      filterAssignee,
      filterStatus,
      filterPriority,
      filterEntityType,
      search,
      sortBy,
      sortAsc,
    ],
    queryFn: () =>
      listAllWorkTasks({
        filters: {
          assigneeUserId: filterAssignee || undefined,
          status: filterStatus || undefined,
          priority: filterPriority || undefined,
          entityType: filterEntityType || undefined,
          search: search.trim() || undefined,
        },
        sortBy,
        sortAsc,
      }),
    enabled: filter === 'all' && isSupabaseConfigured(),
  });

  const tasks = filter === 'my' ? myTasks : allTasks;
  const isLoading = filter === 'my' ? myLoading : allLoading;
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['work-tasks'], exact: false });

  const assigneeLabel = (userId: string | null) => {
    if (!userId) return '—';
    const p = profiles.find((x) => x.id === userId);
    return p?.displayName || p?.email || userId.slice(0, 8);
  };
  const linkSummary = (t: WorkTask) => {
    if (!t.links?.length) return '—';
    return [...new Set(t.links.map((l) => ENTITY_LABELS[l.entityType]))].join(', ');
  };

  if (filter === 'my') {
    const groups = groupMyTasks(tasks);
    return (
      <div className="h-full overflow-auto p-4 sm:p-6">
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h1 className="text-xl font-bold text-primary">Lista</h1>
            <button
              type="button"
              onClick={() => { setEditingTask(null); setFormOpen(true); }}
              className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-brand-500"
            >
              <PlusCircle className="w-4 h-4" />
              Nueva tarea
            </button>
          </div>
          {isLoading ? (
            <p className="text-brand-500 text-sm">Cargando...</p>
          ) : (
            <>
              {groups.overdue.length > 0 && (
                <section>
                  <h2 className="text-xs font-bold uppercase tracking-wide text-red-600 mb-2">Overdue</h2>
                  <ul className="space-y-2">
                    {groups.overdue.map((t) => (
                      <TaskRow key={t.id} task={t} isOverdue onEdit={() => { setEditingTask(t); setFormOpen(true); }} onDone={invalidate} onSnooze={invalidate} />
                    ))}
                  </ul>
                </section>
              )}
              {groups.dueToday.length > 0 && (
                <section>
                  <h2 className="text-xs font-bold uppercase tracking-wide text-brand-500 mb-2">Due Today</h2>
                  <ul className="space-y-2">
                    {groups.dueToday.map((t) => (
                      <TaskRow key={t.id} task={t} onEdit={() => { setEditingTask(t); setFormOpen(true); }} onDone={invalidate} onSnooze={invalidate} />
                    ))}
                  </ul>
                </section>
              )}
              {groups.remindersToday.length > 0 && (
                <section>
                  <h2 className="text-xs font-bold uppercase tracking-wide text-brand-500 mb-2">Reminders Today</h2>
                  <ul className="space-y-2">
                    {groups.remindersToday.map((t) => (
                      <TaskRow key={t.id} task={t} onEdit={() => { setEditingTask(t); setFormOpen(true); }} onDone={invalidate} onSnooze={invalidate} />
                    ))}
                  </ul>
                </section>
              )}
              {groups.upcoming.length > 0 && (
                <section>
                  <h2 className="text-xs font-bold uppercase tracking-wide text-brand-500 mb-2">Upcoming (7 days)</h2>
                  <ul className="space-y-2">
                    {groups.upcoming.map((t) => (
                      <TaskRow key={t.id} task={t} onEdit={() => { setEditingTask(t); setFormOpen(true); }} onDone={invalidate} onSnooze={invalidate} />
                    ))}
                  </ul>
                </section>
              )}
              {tasks.length === 0 && <p className="text-brand-500 text-sm py-8 text-center">No hay tareas.</p>}
            </>
          )}
        </div>
        {formOpen && (
          <TaskFormModal
            initialTask={editingTask}
            defaultAssigneeUserId={user?.id ?? null}
            onClose={() => { setFormOpen(false); setEditingTask(null); }}
            onSaved={() => { invalidate(); setFormOpen(false); setEditingTask(null); }}
          />
        )}
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto p-4 sm:p-6">
      <div className="max-w-6xl mx-auto space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="text-xl font-bold text-primary">Todas las tareas</h1>
          <button
            type="button"
            onClick={() => { setEditingTask(null); setFormOpen(true); }}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-brand-500"
          >
            <PlusCircle className="w-4 h-4" />
            Nueva tarea
          </button>
        </div>
        <div className="rounded-xl border border-brand-100 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="w-4 h-4 text-brand-500" />
            <span className="text-xs font-bold uppercase tracking-wide text-brand-500">Filtros</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <input type="text" placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} className="rounded-lg border border-brand-200 px-3 py-2 text-sm" />
            <select value={filterAssignee} onChange={(e) => setFilterAssignee(e.target.value)} className="rounded-lg border border-brand-200 px-3 py-2 text-sm">
              <option value="">Todos los asignados</option>
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>{p.displayName || p.email || p.id}</option>
              ))}
            </select>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as WorkTaskStatus | '')} className="rounded-lg border border-brand-200 px-3 py-2 text-sm">
              <option value="">Todos los estados</option>
              {(Object.keys(STATUS_LABELS) as WorkTaskStatus[]).map((s) => (
                <option key={s} value={s}>{STATUS_LABELS[s]}</option>
              ))}
            </select>
            <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value as WorkTaskPriority | '')} className="rounded-lg border border-brand-200 px-3 py-2 text-sm">
              <option value="">Todas las prioridades</option>
              {(Object.keys(PRIORITY_LABELS) as WorkTaskPriority[]).map((p) => (
                <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>
              ))}
            </select>
            <select value={filterEntityType} onChange={(e) => setFilterEntityType(e.target.value as WorkTaskLinkEntityType | '')} className="rounded-lg border border-brand-200 px-3 py-2 text-sm">
              <option value="">Todos los tipos</option>
              {(Object.keys(ENTITY_LABELS) as WorkTaskLinkEntityType[]).map((k) => (
                <option key={k} value={k}>{ENTITY_LABELS[k]}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="rounded-xl border border-brand-100 bg-white shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center text-brand-500 text-sm">Cargando...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-brand-50 border-b border-brand-200">
                  <tr>
                    <th className="text-left p-3 font-bold text-primary">Título</th>
                    <th className="text-left p-3 font-bold text-primary">Entidad</th>
                    <th className="text-left p-3 font-bold text-primary">Estado</th>
                    <th className="text-left p-3 font-bold text-primary">Prioridad</th>
                    <th className="text-left p-3 font-bold text-primary">Vencimiento</th>
                    <th className="text-left p-3 font-bold text-primary">Asignado</th>
                    <th className="text-left p-3 font-bold text-primary">
                      <button type="button" onClick={() => { if (sortBy === 'updated_at') setSortAsc((a) => !a); else setSortBy('updated_at'); }} className="inline-flex items-center gap-1">
                        Actualizado {sortBy === 'updated_at' ? (sortAsc ? <ArrowUpDown size={14} /> : <ArrowDownUp size={14} />) : null}
                      </button>
                    </th>
                    <th className="w-20 p-3" />
                  </tr>
                </thead>
                <tbody>
                  {tasks.map((t) => (
                    <tr key={t.id} className="border-b border-brand-100 hover:bg-brand-50/50">
                      <td className="p-3 font-medium">{t.title}</td>
                      <td className="p-3 text-brand-600">{linkSummary(t)}</td>
                      <td className="p-3">{STATUS_LABELS[t.status]}</td>
                      <td className="p-3"><span className={t.priority === 'high' ? 'font-bold text-amber-600' : 'text-brand-600'}>{PRIORITY_LABELS[t.priority]}</span></td>
                      <td className="p-3">{formatTaskDateTime(t.dueAt)}</td>
                      <td className="p-3">{assigneeLabel(t.assigneeUserId)}</td>
                      <td className="p-3 text-brand-600">{formatTaskDateTime(t.updatedAt)}</td>
                      <td className="p-3">
                        <button type="button" onClick={() => { setEditingTask(t); setFormOpen(true); }} className="text-brand-600 hover:text-primary font-medium text-xs">Editar</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {!isLoading && tasks.length === 0 && <div className="p-8 text-center text-brand-500 text-sm">No hay tareas con estos filtros.</div>}
        </div>
      </div>
      {formOpen && (
        <TaskFormModal
          initialTask={editingTask}
          defaultAssigneeUserId={user?.id ?? null}
          onClose={() => { setFormOpen(false); setEditingTask(null); }}
          onSaved={() => { invalidate(); setFormOpen(false); setEditingTask(null); }}
        />
      )}
    </div>
  );
}
