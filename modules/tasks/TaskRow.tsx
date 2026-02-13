import React, { useState } from 'react';
import { CheckSquare, Square, Pencil, Clock } from 'lucide-react';
import type { WorkTask, WorkTaskPriority, WorkTaskLinkEntityType } from '../../types';
import { markWorkTaskDone, snoozeWorkTask } from '../../services/tasks';
import { formatTaskDateTime } from './formatTaskDate';

const PRIORITY_LABELS: Record<WorkTaskPriority, string> = {
  low: 'L',
  medium: 'M',
  high: 'H',
};

const ENTITY_LABELS: Record<WorkTaskLinkEntityType, string> = {
  client: 'Lead',
  deal: 'Deal',
  project: 'Project',
  internal: 'Internal',
};

function addSnooze(remindAt: string | null, delta: '1d' | '3d' | '1w'): string {
  const base = remindAt ? new Date(remindAt) : new Date();
  const d = new Date(base);
  if (delta === '1d') d.setDate(d.getDate() + 1);
  else if (delta === '3d') d.setDate(d.getDate() + 3);
  else d.setDate(d.getDate() + 7);
  return d.toISOString();
}

interface TaskRowProps {
  task: WorkTask;
  isOverdue?: boolean;
  onEdit: () => void;
  onDone: () => void;
  onSnooze: () => void;
}

export default function TaskRow({ task, isOverdue, onEdit, onDone, onSnooze }: TaskRowProps) {
  const [loading, setLoading] = useState(false);
  const [snoozeOpen, setSnoozeOpen] = useState(false);

  const handleToggleDone = async () => {
    if (loading) return;
    setLoading(true);
    try {
      await markWorkTaskDone(task.id);
      onDone();
    } finally {
      setLoading(false);
    }
  };

  const handleSnooze = async (delta: '1d' | '3d' | '1w') => {
    if (loading) return;
    setLoading(true);
    setSnoozeOpen(false);
    try {
      const newRemind = addSnooze(task.remindAt, delta);
      await snoozeWorkTask(task.id, newRemind);
      onSnooze();
    } finally {
      setLoading(false);
    }
  };

  const linkLabel = task.links?.length
    ? task.links.map((l) => ENTITY_LABELS[l.entityType]).join(', ')
    : null;

  return (
    <li
      className={`rounded-xl border bg-white flex items-center gap-3 p-3 transition-all shadow-card ${
        isOverdue ? 'border-red-200 bg-red-50/30' : 'border-brand-200/60 hover:border-brand-300'
      } ${task.priority === 'high' ? 'ring-1 ring-amber-200/50' : ''}`}
    >
      <button
        type="button"
        onClick={handleToggleDone}
        disabled={loading}
        className="shrink-0 p-0.5 rounded text-brand-500 hover:text-brand-600 disabled:opacity-50"
        aria-label="Mark as done"
      >
        <Square className="w-5 h-5" />
      </button>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-primary truncate">{task.title}</p>
        <div className="flex flex-wrap items-center gap-2 mt-1">
          <span
            className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
              task.priority === 'high'
                ? 'bg-amber-100 text-amber-700'
                : task.priority === 'low'
                ? 'bg-brand-100 text-brand-600'
                : 'bg-brand-100 text-brand-600'
            }`}
          >
            {PRIORITY_LABELS[task.priority]}
          </span>
          {linkLabel && (
            <span className="text-[10px] bg-primary/10 text-primary font-medium px-1.5 py-0.5 rounded">
              {linkLabel}
            </span>
          )}
          {task.dueAt && (
            <span className="text-[10px] text-brand-500 flex items-center gap-0.5">
              <Clock size={10} />
              {formatTaskDateTime(task.dueAt)}
            </span>
          )}
          {task.remindAt && (
            <span className="text-[10px] text-brand-500">
              Recordatorio: {formatTaskDateTime(task.remindAt)}
            </span>
          )}
        </div>
      </div>
      <div className="shrink-0 flex items-center gap-1">
        <div className="relative">
          <button
            type="button"
            onClick={() => setSnoozeOpen((o) => !o)}
            disabled={loading}
            className="text-xs font-bold text-brand-600 hover:text-primary px-2.5 py-1.5 rounded-xl border border-brand-200/60 transition-colors"
          >
            Snooze
          </button>
          {snoozeOpen && (
            <>
              <div
                className="fixed inset-0 z-[55]"
                aria-hidden
                onClick={() => setSnoozeOpen(false)}
              />
              <div className="absolute right-0 top-full mt-2 z-[60] min-w-[100px] rounded-xl border border-brand-200/60 bg-white/95 backdrop-blur-sm shadow-dropdown py-1">
                <button
                  type="button"
                  onClick={() => handleSnooze('1d')}
                  className="w-full px-4 py-3 text-left text-sm font-bold text-brand-600 hover:bg-brand-100/50 transition-colors"
                >
                  +1 day
                </button>
                <button
                  type="button"
                  onClick={() => handleSnooze('3d')}
                  className="w-full px-4 py-3 text-left text-sm font-bold text-brand-600 hover:bg-brand-100/50 transition-colors"
                >
                  +3 days
                </button>
                <button
                  type="button"
                  onClick={() => handleSnooze('1w')}
                  className="w-full px-4 py-3 text-left text-sm font-bold text-brand-600 hover:bg-brand-100/50 transition-colors"
                >
                  +1 week
                </button>
              </div>
            </>
          )}
        </div>
        <button
          type="button"
          onClick={onEdit}
          className="p-1.5 rounded-xl text-brand-500 hover:bg-brand-100/50 transition-colors"
          aria-label="Edit task"
        >
          <Pencil size={14} />
        </button>
      </div>
    </li>
  );
}
