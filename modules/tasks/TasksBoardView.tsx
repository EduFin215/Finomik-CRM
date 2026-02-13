import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../hooks/useAuth';
import { listAllWorkTasks, updateWorkTask } from '../../services/tasks';
import TaskFormModal from './TaskFormModal';
import TaskDetailDrawer from './TaskDetailDrawer';
import type { WorkTask, WorkTaskStatus } from '../../types';
import { formatTaskDateTime } from './formatTaskDate';
import { PlusCircle, Flag, Clock } from 'lucide-react';
import { isSupabaseConfigured } from '../../services/supabase';
import { getProfiles } from '../../services/profiles';

const COLUMNS: { id: WorkTaskStatus; label: string }[] = [
  { id: 'open', label: 'To do' },
  { id: 'in_progress', label: 'In progress' },
  { id: 'done', label: 'Done' },
];

const PRIORITY_COLORS: Record<string, string> = {
  high: 'bg-red-100 text-red-700',
  medium: 'bg-amber-100 text-amber-700',
  low: 'bg-brand-100 text-brand-600',
};


interface TasksBoardViewProps {
  filter: 'my' | 'all';
}

export default function TasksBoardView({ filter }: TasksBoardViewProps) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [formOpen, setFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<WorkTask | null>(null);
  const [detailTask, setDetailTask] = useState<WorkTask | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<WorkTaskStatus | null>(null);

  const { data: profiles = [] } = useQuery({
    queryKey: ['profiles'],
    queryFn: getProfiles,
    enabled: isSupabaseConfigured(),
  });

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['work-tasks', 'board', filter, user?.id],
    queryFn: () =>
      listAllWorkTasks({
        filters: {
          assigneeUserId: filter === 'my' && user?.id ? user.id : undefined,
          status: ['open', 'in_progress', 'done'],
        },
        sortBy: 'due_at',
        sortAsc: true,
      }),
    enabled: isSupabaseConfigured(),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['work-tasks'], exact: false });

  const assigneeLabel = (userId: string | null) => {
    if (!userId) return '—';
    const p = profiles.find((x) => x.id === userId);
    return (p?.displayName || p?.email || userId.slice(0, 8)).slice(0, 2).toUpperCase();
  };

  const tasksByStatus = (status: WorkTaskStatus) =>
    tasks.filter((t) => t.status === status);

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('text/plain', taskId);
    e.dataTransfer.effectAllowed = 'move';
    setDraggingId(taskId);
  };

  const handleDragEnd = () => {
    setDraggingId(null);
    setDropTarget(null);
  };

  const handleDragOver = (e: React.DragEvent, status: WorkTaskStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDropTarget(status);
  };

  const handleDragLeave = () => {
    setDropTarget(null);
  };

  const queryKey = ['work-tasks', 'board', filter, user?.id];

  const handleDrop = async (e: React.DragEvent, newStatus: WorkTaskStatus) => {
    e.preventDefault();
    setDropTarget(null);
    setDraggingId(null);
    const taskId = e.dataTransfer.getData('text/plain');
    if (!taskId) return;
    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.status === newStatus) return;

    const previousTasks = tasks;
    const optimisticTask: WorkTask = {
      ...task,
      status: newStatus,
      completedAt: newStatus === 'done' ? new Date().toISOString() : task.completedAt,
      updatedAt: new Date().toISOString(),
    };
    const optimisticList = previousTasks.map((t) => (t.id === taskId ? optimisticTask : t));
    queryClient.setQueryData(queryKey, optimisticList);

    try {
      await updateWorkTask(taskId, { status: newStatus });
      invalidate();
    } catch {
      queryClient.setQueryData(queryKey, previousTasks);
      invalidate();
    }
  };

  const isOverdue = (t: WorkTask) => {
    if (!t.dueAt) return false;
    return new Date(t.dueAt) < new Date() && t.status !== 'done';
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-brand-200 bg-white">
        <h1 className="text-xl font-bold text-primary">Board</h1>
        <button
          type="button"
          onClick={() => { setEditingTask(null); setFormOpen(true); }}
          className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-brand-500"
        >
          <PlusCircle className="w-4 h-4" />
          Nueva tarea
        </button>
      </div>
      <div className="flex-1 overflow-x-auto overflow-y-hidden p-4">
        {isLoading ? (
          <p className="text-brand-500 text-sm">Cargando...</p>
        ) : (
          <div className="flex gap-4 h-full min-w-max">
            {COLUMNS.map((col) => (
              <div
                key={col.id}
                className={`w-72 shrink-0 flex flex-col rounded-xl border-2 bg-brand-50/30 transition-colors ${
                  dropTarget === col.id ? 'border-primary bg-brand-100/50' : 'border-brand-200'
                }`}
                onDragOver={(e) => handleDragOver(e, col.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, col.id)}
              >
                <div className="shrink-0 flex items-center justify-between px-3 py-2 border-b border-brand-200">
                  <span className="font-bold text-primary text-sm">{col.label}</span>
                  <span className="rounded-full bg-primary/20 px-2 py-0.5 text-xs font-bold text-primary">
                    {tasksByStatus(col.id).length}
                  </span>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-2 min-h-[120px]">
                  {tasksByStatus(col.id).map((t) => (
                    <div
                      key={t.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, t.id)}
                      onDragEnd={handleDragEnd}
                      onClick={() => setDetailTask(t)}
                      className={`rounded-xl border bg-white p-3 shadow-sm cursor-grab active:cursor-grabbing transition-shadow hover:shadow ${
                        draggingId === t.id ? 'opacity-50' : ''
                      } ${isOverdue(t) ? 'border-red-200 bg-red-50/30' : 'border-brand-100'}`}
                    >
                      <p className="font-medium text-primary text-sm truncate">{t.title}</p>
                      <div className="flex items-center justify-between gap-2 mt-2">
                        <span className="flex items-center gap-1 text-[10px] text-brand-500">
                          <Clock size={10} />
                          {formatTaskDateTime(t.dueAt) || '—'}
                        </span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${PRIORITY_COLORS[t.priority]}`}>
                          {t.priority === 'high' ? 'H' : t.priority === 'medium' ? 'M' : 'L'}
                        </span>
                      </div>
                      {t.assigneeUserId && (
                        <div className="mt-2 flex justify-end">
                          <span className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary">
                            {assigneeLabel(t.assigneeUserId)}
                          </span>
                        </div>
                      )}
                      {isOverdue(t) && (
                        <p className="text-[10px] text-red-600 font-bold mt-1">Overdue</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
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
