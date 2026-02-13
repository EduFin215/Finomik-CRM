import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../hooks/useAuth';
import { listAllWorkTasks } from '../../services/tasks';
import { isSupabaseConfigured } from '../../services/supabase';
import TaskFormModal from './TaskFormModal';
import TaskDetailDrawer from './TaskDetailDrawer';
import type { WorkTask } from '../../types';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  Calendar as CalendarIcon
} from 'lucide-react';

const DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

interface TasksCalendarViewProps {
  filter: 'my' | 'all';
}

export default function TasksCalendarView({ filter }: TasksCalendarViewProps) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [viewDate, setViewDate] = useState(() => new Date());

  // Modals state
  const [formOpen, setFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<WorkTask | null>(null);
  const [formPresetDue, setFormPresetDue] = useState<string | null>(null);
  const [detailTask, setDetailTask] = useState<WorkTask | null>(null);

  const viewYear = viewDate.getFullYear();
  const viewMonth = viewDate.getMonth();

  // Calculate calendar range
  const monthStart = new Date(viewYear, viewMonth, 1);
  const monthEnd = new Date(viewYear, viewMonth + 1, 0, 23, 59, 59);
  const dueFrom = monthStart.toISOString().slice(0, 19);
  const dueTo = monthEnd.toISOString().slice(0, 19);

  const { data: tasks = [] } = useQuery({
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

  // Calendar Grid Logic
  const firstDayOfWeek = (monthStart.getDay() + 6) % 7;
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const calendarCells: (number | null)[] = [];

  // Fill previous month empty slots
  for (let i = 0; i < firstDayOfWeek; i++) calendarCells.push(null);
  // Fill current month days
  for (let d = 1; d <= daysInMonth; d++) calendarCells.push(d);
  // Fill remaining slots to complete grid (6 rows = 42 cells)
  while (calendarCells.length < 42) calendarCells.push(null);

  const getTasksForDay = (dayNum: number) => {
    return tasks.filter((t) => {
      const due = t.dueAt ? new Date(t.dueAt) : null;
      const dayStart = new Date(viewYear, viewMonth, dayNum, 0, 0, 0);
      const dayEnd = new Date(viewYear, viewMonth, dayNum, 23, 59, 59);
      return due && due >= dayStart && due <= dayEnd;
    });
  };

  const today = new Date();
  const isToday = (dayNum: number) =>
    today.getFullYear() === viewYear &&
    today.getMonth() === viewMonth &&
    today.getDate() === dayNum;

  const openNewForDay = (dayNum: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const d = new Date(viewYear, viewMonth, dayNum, 10, 0, 0);
    setFormPresetDue(d.toISOString().slice(0, 16));
    setFormOpen(true);
  };

  return (
    <div className="h-full flex flex-col bg-white/50 rounded-3xl overflow-hidden border border-brand-very-soft/50 shadow-sm">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between p-6 bg-white border-b border-brand-very-soft/50">
        <div className="flex items-center gap-4">
          <div className="p-2.5 bg-brand-50 rounded-xl text-primary">
            <CalendarIcon className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-primary tracking-tight">Calendario</h1>
            <p className="text-sm text-brand-muted hidden sm:block">Gestión visual de tareas y entregas</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center bg-white border border-brand-very-soft rounded-xl p-1 shadow-sm">
            <button
              onClick={() => setViewDate(new Date(viewYear, viewMonth - 1, 1))}
              className="p-2 hover:bg-brand-50 rounded-lg text-brand-400 hover:text-primary transition-colors"
            >
              <ChevronLeft size={20} />
            </button>
            <span className="w-32 text-center font-bold text-primary capitalize text-sm">
              {viewDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
            </span>
            <button
              onClick={() => setViewDate(new Date(viewYear, viewMonth + 1, 1))}
              className="p-2 hover:bg-brand-50 rounded-lg text-brand-400 hover:text-primary transition-colors"
            >
              <ChevronRight size={20} />
            </button>
          </div>

          <button
            onClick={() => { setEditingTask(null); setFormPresetDue(null); setFormOpen(true); }}
            className="flex items-center gap-2 bg-primary text-white pl-3 pr-4 py-2.5 rounded-xl text-sm font-bold shadow-md shadow-primary/20 hover:bg-brand-600 transition-all hover:-translate-y-0.5"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Nueva Tarea</span>
          </button>
        </div>
      </div>

      {/* Grid Container */}
      <div className="flex-1 flex flex-col bg-brand-50/30 overflow-hidden">
        {/* Days Header */}
        <div className="grid grid-cols-7 border-b border-brand-very-soft/50 bg-white/80 backdrop-blur-sm">
          {DAYS.map((d) => (
            <div key={d} className="py-3 text-center text-[11px] font-bold text-brand-400 uppercase tracking-wider">
              {d}
            </div>
          ))}
        </div>

        {/* Calendar Cells */}
        <div className="flex-1 grid grid-cols-7 auto-rows-fr overflow-y-auto">
          {calendarCells.map((dayNum, i) => {
            const dayTasks = dayNum === null ? [] : getTasksForDay(dayNum);
            const isTodayCell = dayNum !== null && isToday(dayNum);
            const isWeekend = i % 7 === 5 || i % 7 === 6;

            if (dayNum === null) {
              return (
                <div key={i} className={`bg-brand-50/50 border-r border-b border-brand-very-soft/30 ${i % 7 === 6 ? 'border-r-0' : ''}`} />
              );
            }

            return (
              <div
                key={i}
                onClick={(e) => openNewForDay(dayNum, e)}
                className={`
                  group relative border-r border-b border-brand-very-soft/50 flex flex-col p-2 transition-colors cursor-pointer
                  ${i % 7 === 6 ? 'border-r-0' : ''}
                  ${isWeekend ? 'bg-slate-50/30' : 'bg-white'}
                  hover:bg-brand-50/50
                `}
              >
                {/* Day Number */}
                <div className="flex justify-between items-start mb-2">
                  <span
                    className={`
                      text-sm font-bold w-8 h-8 flex items-center justify-center rounded-lg transition-all
                      ${isTodayCell
                        ? 'bg-primary text-white shadow-md'
                        : 'text-brand-500 group-hover:text-primary group-hover:bg-white'}
                    `}
                  >
                    {dayNum}
                  </span>

                  {/* Add Button on Hover */}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="p-1.5 rounded-md hover:bg-brand-100 text-brand-400 hover:text-primary">
                      <Plus size={14} />
                    </button>
                  </div>
                </div>

                {/* Tasks List */}
                <div className="space-y-1.5 overflow-y-auto max-h-[120px] scrollbar-hide">
                  {dayTasks.map((t) => (
                    <button
                      key={t.id}
                      onClick={(e) => { e.stopPropagation(); setDetailTask(t); }}
                      className={`
                        w-full text-left px-2 py-1.5 rounded-lg text-[11px] font-medium border transition-all shadow-sm
                        ${t.status === 'done'
                          ? 'bg-slate-50 text-slate-400 border-transparent line-through decoration-slate-300'
                          : 'bg-white text-primary border-brand-very-soft/60 hover:border-brand-300 hover:shadow-md hover:-translate-y-0.5'
                        }
                      `}
                    >
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <Clock size={10} className={t.status === 'done' ? 'text-slate-300' : 'text-brand-400'} />
                        <span className={t.status === 'done' ? 'text-slate-400' : 'text-brand-500'}>
                          {t.dueAt ? new Date(t.dueAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                        </span>
                      </div>
                      <div className="truncate">{t.title}</div>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
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
