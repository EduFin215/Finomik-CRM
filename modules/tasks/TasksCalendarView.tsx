import React, { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../hooks/useAuth';
import { listAllWorkTasks } from '../../services/tasks';
import TaskFormModal from './TaskFormModal';
import TaskDetailDrawer from './TaskDetailDrawer';
import type { WorkTask } from '../../types';
import { ChevronLeft, ChevronRight, PlusCircle, Clock } from 'lucide-react';
import { isSupabaseConfigured } from '../../services/supabase';

const DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

interface TasksCalendarViewProps {
  filter: 'my' | 'all';
}

export default function TasksCalendarView({ filter }: TasksCalendarViewProps) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [viewDate, setViewDate] = useState(() => new Date());
  const [formOpen, setFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<WorkTask | null>(null);
  const [formPresetDue, setFormPresetDue] = useState<string | null>(null);
  const [detailTask, setDetailTask] = useState<WorkTask | null>(null);

  const viewYear = viewDate.getFullYear();
  const viewMonth = viewDate.getMonth();
  const monthStart = new Date(viewYear, viewMonth, 1);
  const monthEnd = new Date(viewYear, viewMonth + 1, 0, 23, 59, 59);
  const dueFrom = monthStart.toISOString().slice(0, 19);
  const dueTo = monthEnd.toISOString().slice(0, 19);

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['work-tasks', 'calendar', filter, user?.id, dueFrom, dueTo],
    queryFn: () =>
      listAllWorkTasks({
        filters: {
          assigneeUserId: filter === 'my' && user?.id ? user.id : undefined,
          status: ['open', 'in_progress', 'done'],
          dueFrom,
          dueTo,
        },
        sortBy: 'due_at',
        sortAsc: true,
      }),
    enabled: isSupabaseConfigured(),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['work-tasks'], exact: false });

  const firstDayOfWeek = (monthStart.getDay() + 6) % 7;
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const calendarCells: (number | null)[] = [];
  for (let i = 0; i < firstDayOfWeek; i++) calendarCells.push(null);
  for (let d = 1; d <= daysInMonth; d++) calendarCells.push(d);
  while (calendarCells.length < 42) calendarCells.push(null);

  const getTasksForDay = (dayNum: number) => {
    return tasks.filter((t) => {
      const due = t.dueAt ? new Date(t.dueAt) : null;
      const remind = t.remindAt ? new Date(t.remindAt) : null;
      const dayStart = new Date(viewYear, viewMonth, dayNum, 0, 0, 0);
      const dayEnd = new Date(viewYear, viewMonth, dayNum, 23, 59, 59);
      return (
        (due && due >= dayStart && due <= dayEnd) ||
        (remind && remind >= dayStart && remind <= dayEnd)
      );
    });
  };

  const today = new Date();
  const isToday = (dayNum: number) =>
    today.getFullYear() === viewYear &&
    today.getMonth() === viewMonth &&
    today.getDate() === dayNum;

  const openNewForDay = (dayNum: number) => {
    const d = new Date(viewYear, viewMonth, dayNum, 10, 0, 0);
    setFormPresetDue(d.toISOString().slice(0, 16));
    setFormOpen(true);
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="shrink-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-primary">Calendario</h1>
          <div className="flex items-center gap-1 rounded-xl border border-brand-200 bg-white p-1">
            <button
              type="button"
              onClick={() => setViewDate(new Date(viewYear, viewMonth - 1, 1))}
              className="p-2 hover:bg-brand-100 rounded-lg text-brand-500"
            >
              <ChevronLeft size={18} />
            </button>
            <span className="font-bold text-primary px-3 text-sm capitalize">
              {viewDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
            </span>
            <button
              type="button"
              onClick={() => setViewDate(new Date(viewYear, viewMonth + 1, 1))}
              className="p-2 hover:bg-brand-100 rounded-lg text-brand-500"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={() => { setEditingTask(null); setFormPresetDue(null); setFormOpen(true); }}
          className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-brand-500"
        >
          <PlusCircle className="w-4 h-4" />
          Nueva tarea
        </button>
      </div>

      <div className="flex-1 overflow-auto p-4">
        <div className="bg-white rounded-2xl border border-brand-200 overflow-hidden shadow-sm">
          <div className="grid grid-cols-7 border-b border-brand-100 bg-brand-100/30">
            {DAYS.map((d) => (
              <div key={d} className="py-2 text-center text-[10px] font-bold text-brand-400 uppercase tracking-wide">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 auto-rows-fr min-h-[320px]">
            {calendarCells.map((dayNum, i) => {
              const dayTasks = dayNum === null ? [] : getTasksForDay(dayNum);
              const isTodayCell = dayNum !== null && isToday(dayNum);

              return (
                <div
                  key={i}
                  className={`group min-h-[80px] sm:min-h-[100px] border-r border-b border-brand-100 p-1.5 ${i % 7 === 6 ? 'border-r-0' : ''}`}
                >
                  {dayNum !== null && (
                    <>
                      <div className="flex justify-between items-start mb-1">
                        <span
                          className={`text-xs font-bold w-7 h-7 flex items-center justify-center rounded-full ${
                            isTodayCell ? 'bg-primary text-white' : 'text-brand-500'
                          }`}
                        >
                          {dayNum}
                        </span>
                        <button
                          type="button"
                          onClick={() => openNewForDay(dayNum)}
                          className="opacity-0 hover:opacity-100 group-hover:opacity-100 p-0.5 rounded text-brand-400 hover:bg-brand-100"
                          aria-label="Añadir tarea"
                        >
                          <PlusCircle size={14} />
                        </button>
                      </div>
                      <div className="space-y-1">
                        {dayTasks.map((t) => (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => setDetailTask(t)}
                            className="w-full text-left px-2 py-1.5 rounded-lg text-[10px] font-medium truncate bg-brand-100 text-brand-700 border border-brand-200 hover:bg-brand-200 transition-colors"
                          >
                            <div className="flex items-center gap-1">
                              <Clock size={10} className="shrink-0 opacity-60" />
                              {t.dueAt
                                ? new Date(t.dueAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
                                : ''}
                            </div>
                            {t.title}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {formOpen && (
        <TaskFormModal
          initialTask={editingTask}
          defaultAssigneeUserId={user?.id ?? null}
          presetDueAt={editingTask ? null : formPresetDue}
          onClose={() => { setFormOpen(false); setEditingTask(null); setFormPresetDue(null); }}
          onSaved={() => { invalidate(); setFormOpen(false); setEditingTask(null); setFormPresetDue(null); }}
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
