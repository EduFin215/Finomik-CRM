import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../hooks/useAuth';
import { listAllWorkTasks, processReminderNotifications } from '../../services/tasks';
import TaskFormModal from './TaskFormModal';
import TaskDetailDrawer from './TaskDetailDrawer';
import type { WorkTask } from '../../types';
import { PlusCircle, Calendar, LayoutGrid, List, Clock, CheckCircle } from 'lucide-react';
import { isSupabaseConfigured } from '../../services/supabase';
import { formatTaskDateTime, formatTaskDate } from './formatTaskDate';

const ENTITY_LABELS: Record<string, string> = {
  client: 'Lead',
  deal: 'Deal',
  project: 'Proyecto',
  internal: 'Interno',
};


interface TasksDashboardViewProps {
  filter: 'my' | 'all';
}

export default function TasksDashboardView({ filter }: TasksDashboardViewProps) {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const [formOpen, setFormOpen] = React.useState(false);
  const [editingTask, setEditingTask] = React.useState<WorkTask | null>(null);
  const [detailTask, setDetailTask] = React.useState<WorkTask | null>(null);

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['work-tasks', 'dashboard', filter, user?.id],
    queryFn: async () => {
      if (filter === 'my' && user?.id) await processReminderNotifications();
      return listAllWorkTasks({
        filters: {
          assigneeUserId: filter === 'my' && user?.id ? user.id : undefined,
          status: ['open', 'in_progress', 'done'],
        },
        sortBy: 'due_at',
        sortAsc: true,
      });
    },
    enabled: isSupabaseConfigured(),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['work-tasks'], exact: false });

  const now = new Date();
  const endWeek = new Date(now);
  endWeek.setDate(endWeek.getDate() + 7);
  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 7);

  const toDoThisWeek = tasks.filter((t) => {
    if (t.status === 'done' || t.status === 'archived') return false;
    const due = t.dueAt ? new Date(t.dueAt) : null;
    const remind = t.remindAt ? new Date(t.remindAt) : null;
    return (due && due >= now && due <= endWeek) || (remind && remind >= now && remind <= endWeek);
  });

  const toReview = tasks.filter((t) => {
    if (t.status !== 'done') return false;
    const completed = t.completedAt ? new Date(t.completedAt) : new Date(t.updatedAt);
    return completed >= weekAgo;
  });

  const recentActivity = [...tasks]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 8);

  const setView = (view: string) => {
    const next = new URLSearchParams(searchParams);
    next.set('view', view);
    setSearchParams(next);
  };

  const linkLabel = (t: WorkTask) => {
    if (!t.links?.length) return '—';
    return t.links.map((l) => ENTITY_LABELS[l.entityType] ?? l.entityType).join(', ');
  };

  return (
    <div className="h-full overflow-auto p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-primary font-title">Dashboard</h1>
            <p className="text-brand-500 font-body text-sm mt-1">Resumen de tareas. Clic en una fila para ver el detalle.</p>
          </div>
          <button
            type="button"
            onClick={() => setFormOpen(true)}
            className="shrink-0 inline-flex items-center gap-3 rounded-xl bg-brand-600 px-6 py-3 text-sm font-bold text-white shadow-md hover:bg-brand-500 transition-colors"
          >
            <PlusCircle className="w-5 h-5 shrink-0" />
            <span>Nueva tarea</span>
          </button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <button
            type="button"
            onClick={() => setFormOpen(true)}
            className="rounded-2xl border border-brand-200 bg-white p-5 text-left shadow-sm hover:border-brand-300 hover:shadow-md transition-all"
          >
            <div className="w-12 h-12 rounded-xl bg-brand-100 flex items-center justify-center mb-3">
              <PlusCircle className="w-6 h-6 text-brand-600" />
            </div>
            <p className="font-bold text-primary">Crear tarea</p>
            <p className="text-xs text-brand-500 mt-0.5">Añade una nueva tarea.</p>
          </button>
          <button
            type="button"
            onClick={() => setView('calendar')}
            className="rounded-2xl border border-brand-200 bg-white p-5 text-left shadow-sm hover:border-brand-300 hover:shadow-md transition-all"
          >
            <div className="w-12 h-12 rounded-xl bg-brand-100 flex items-center justify-center mb-3">
              <Calendar className="w-6 h-6 text-brand-600" />
            </div>
            <p className="font-bold text-primary">Ver calendario</p>
            <p className="text-xs text-brand-500 mt-0.5">Tareas por fecha.</p>
          </button>
          <button
            type="button"
            onClick={() => setView('board')}
            className="rounded-2xl border border-brand-200 bg-white p-5 text-left shadow-sm hover:border-brand-300 hover:shadow-md transition-all"
          >
            <div className="w-12 h-12 rounded-xl bg-brand-100 flex items-center justify-center mb-3">
              <LayoutGrid className="w-6 h-6 text-brand-600" />
            </div>
            <p className="font-bold text-primary">Ver board</p>
            <p className="text-xs text-brand-500 mt-0.5">Vista Kanban.</p>
          </button>
          <button
            type="button"
            onClick={() => setView('list')}
            className="rounded-2xl border border-brand-200 bg-white p-5 text-left shadow-sm hover:border-brand-300 hover:shadow-md transition-all"
          >
            <div className="w-12 h-12 rounded-xl bg-brand-100 flex items-center justify-center mb-3">
              <List className="w-6 h-6 text-brand-600" />
            </div>
            <p className="font-bold text-primary">Ver lista</p>
            <p className="text-xs text-brand-500 mt-0.5">Listado agrupado.</p>
          </button>
        </div>

        {isLoading ? (
          <p className="text-brand-500 text-sm">Cargando...</p>
        ) : (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <section className="rounded-2xl border border-brand-200 bg-white shadow-sm overflow-hidden">
                <h2 className="flex items-center gap-2 px-4 py-3 text-sm font-bold text-brand-600 uppercase tracking-wide border-b border-brand-100 bg-brand-50/50">
                  <Clock size={16} />
                  To do this week
                </h2>
                <div className="p-2">
                  {toDoThisWeek.length === 0 ? (
                    <p className="text-brand-500 text-sm py-6 px-2 text-center">No hay tareas pendientes esta semana.</p>
                  ) : (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-brand-500 text-xs font-bold uppercase">
                          <th className="p-2">Nombre</th>
                          <th className="p-2 hidden sm:table-cell">Entidad</th>
                          <th className="p-2">Vencimiento</th>
                        </tr>
                      </thead>
                      <tbody>
                        {toDoThisWeek.map((t) => (
                          <tr
                            key={t.id}
                            className="border-t border-brand-100 hover:bg-brand-50/50 cursor-pointer"
                            onClick={() => setDetailTask(t)}
                          >
                            <td className="p-2 font-medium text-primary">{t.title}</td>
                            <td className="p-2 text-brand-600 hidden sm:table-cell">{linkLabel(t)}</td>
                            <td className="p-2 text-brand-500">{formatTaskDateTime(t.dueAt || t.remindAt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </section>

              <section className="rounded-2xl border border-brand-200 bg-white shadow-sm overflow-hidden">
                <h2 className="flex items-center gap-2 px-4 py-3 text-sm font-bold text-brand-600 uppercase tracking-wide border-b border-brand-100 bg-brand-50/50">
                  <CheckCircle size={16} />
                  To review
                </h2>
                <div className="p-2">
                  {toReview.length === 0 ? (
                    <p className="text-brand-500 text-sm py-6 px-2 text-center">No hay tareas completadas recientes.</p>
                  ) : (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-brand-500 text-xs font-bold uppercase">
                          <th className="p-2">Nombre</th>
                          <th className="p-2 hidden sm:table-cell">Entidad</th>
                          <th className="p-2">Completada</th>
                        </tr>
                      </thead>
                      <tbody>
                        {toReview.map((t) => (
                          <tr
                            key={t.id}
                            className="border-t border-brand-100 hover:bg-brand-50/50 cursor-pointer"
                            onClick={() => setDetailTask(t)}
                          >
                            <td className="p-2 font-medium text-primary line-through">{t.title}</td>
                            <td className="p-2 text-brand-600 hidden sm:table-cell">{linkLabel(t)}</td>
                            <td className="p-2 text-brand-500">{formatTaskDateTime(t.completedAt || t.updatedAt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </section>
            </div>

            <section className="rounded-2xl border border-brand-200 bg-white shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-brand-100 bg-brand-50/50">
                <h2 className="text-sm font-bold text-brand-600 uppercase tracking-wide">Actividad reciente</h2>
                <button
                  type="button"
                  onClick={() => setView('list')}
                  className="text-sm font-bold text-brand-600 hover:text-primary transition-colors"
                >
                  Ver todo
                </button>
              </div>
              <div className="p-4">
                {recentActivity.length === 0 ? (
                  <p className="text-brand-500 text-sm text-center py-4">Sin actividad reciente.</p>
                ) : (
                  <ul className="space-y-3">
                    {recentActivity.map((t) => (
                      <li key={t.id} className="flex items-center gap-3">
                        <span className="shrink-0 w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center">
                          <CheckCircle className="w-4 h-4 text-brand-600" />
                        </span>
                        <button
                          type="button"
                          onClick={() => setDetailTask(t)}
                          className="text-left flex-1 min-w-0"
                        >
                          <span className="font-medium text-primary block truncate">{t.title}</span>
                          <span className="text-xs text-brand-500">
                            {t.status === 'done' ? 'Completada' : 'Actualizada'} · {formatTaskDateTime(t.updatedAt)}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>
          </>
        )}
      </div>

      {formOpen && (
        <TaskFormModal
          initialTask={editingTask}
          defaultAssigneeUserId={user?.id ?? null}
          onClose={() => { setFormOpen(false); setEditingTask(null); }}
          onSaved={() => {
            invalidate();
            setFormOpen(false);
            setEditingTask(null);
          }}
        />
      )}

      {detailTask && (
        <TaskDetailDrawer
          task={detailTask}
          onClose={() => setDetailTask(null)}
          onEdit={() => { setEditingTask(detailTask); setFormOpen(true); setDetailTask(null); }}
          onSaved={invalidate}
        />
      )}
    </div>
  );
}
