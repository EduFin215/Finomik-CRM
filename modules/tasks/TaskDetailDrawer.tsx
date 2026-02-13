import React from 'react';
import { X, Pencil, Clock, Flag, User, Link2 } from 'lucide-react';
import type { WorkTask, WorkTaskLinkEntityType } from '../../types';
import { formatTaskDateTime } from './formatTaskDate';

const ENTITY_LABELS: Record<WorkTaskLinkEntityType, string> = {
  client: 'Lead',
  deal: 'Deal',
  project: 'Proyecto',
  internal: 'Interno',
};

const STATUS_LABELS: Record<string, string> = {
  open: 'Abierta',
  in_progress: 'En progreso',
  done: 'Hecha',
  archived: 'Archivada',
};

const PRIORITY_LABELS: Record<string, string> = {
  low: 'Baja',
  medium: 'Media',
  high: 'Alta',
};

interface TaskDetailDrawerProps {
  task: WorkTask;
  onClose: () => void;
  onEdit: () => void;
  onSaved?: () => void;
}

export default function TaskDetailDrawer({ task, onClose, onEdit }: TaskDetailDrawerProps) {
  const linkLabel = task.links?.length
    ? task.links.map((l) => ENTITY_LABELS[l.entityType] ?? l.entityType).join(', ')
    : '—';

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" aria-hidden onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white shadow-2xl z-50 flex flex-col">
        <div className="shrink-0 flex items-center justify-between p-4 border-b border-brand-200">
          <h2 className="text-lg font-bold text-primary">Detalle de tarea</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-brand-500 hover:bg-brand-100"
            aria-label="Cerrar"
          >
            <X size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div>
            <p className="text-xl font-bold text-primary">{task.title}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs px-2 py-0.5 rounded-full bg-brand-100 text-brand-600 font-bold">
                {STATUS_LABELS[task.status] ?? task.status}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-bold">
                {PRIORITY_LABELS[task.priority] ?? task.priority}
              </span>
            </div>
          </div>
          {task.description && (
            <div>
              <p className="text-xs font-bold text-brand-500 uppercase mb-1">Descripción</p>
              <p className="text-sm text-brand-700 whitespace-pre-wrap">{task.description}</p>
            </div>
          )}
          <div className="grid grid-cols-1 gap-3">
            <div className="flex items-center gap-2 text-sm">
              <Clock size={16} className="text-brand-400" />
              <span className="text-brand-500">Vencimiento:</span>
              <span className="text-primary">{formatTaskDateTime(task.dueAt)}</span>
            </div>
            {task.remindAt && (
              <div className="flex items-center gap-2 text-sm">
                <Flag size={16} className="text-brand-400" />
                <span className="text-brand-500">Recordatorio:</span>
                <span className="text-primary">{formatTaskDateTime(task.remindAt)}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-sm">
              <User size={16} className="text-brand-400" />
              <span className="text-brand-500">Asignado:</span>
              <span className="text-primary">{task.assigneeUserId ? task.assigneeUserId.slice(0, 8) + '…' : '—'}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Link2 size={16} className="text-brand-400" />
              <span className="text-brand-500">Vinculado:</span>
              <span className="text-primary">{linkLabel}</span>
            </div>
          </div>
        </div>
        <div className="shrink-0 p-4 border-t border-brand-200">
          <button
            type="button"
            onClick={onEdit}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-3 text-sm font-bold text-white hover:bg-brand-500"
          >
            <Pencil size={18} />
            Editar
          </button>
        </div>
      </div>
    </>
  );
}
