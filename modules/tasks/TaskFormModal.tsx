import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X, Link2, User } from 'lucide-react';
import type { WorkTask, WorkTaskPriority, WorkTaskLinkEntityType } from '../../types';
import {
  createWorkTask,
  updateWorkTask,
  updateWorkTaskLinks,
} from '../../services/tasks';
import { getProfiles } from '../../services/profiles';
import { listClients } from '../../services/crm/clients';
import { listDeals } from '../../services/crm/deals';
import { listProjects } from '../../services/crm/projects';
import { isSupabaseConfigured } from '../../services/supabase';
import { DateTimePicker } from './DateTimePicker';
import { Select, type SelectOption } from './Select';

type FormState = {
  title: string;
  description: string;
  dueDate: string;
  dueTime: string;
  remindDate: string;
  remindTime: string;
  priority: WorkTaskPriority;
  linkEntityType: WorkTaskLinkEntityType | '';
  linkEntityId: string;
  assigneeUserId: string;
};

const emptyForm: FormState = {
  title: '',
  description: '',
  dueDate: '',
  dueTime: '',
  remindDate: '',
  remindTime: '',
  priority: 'medium',
  linkEntityType: '',
  linkEntityId: '',
  assigneeUserId: '',
};

function toFormState(
  t: WorkTask | null,
  defaultAssignee: string | null,
  presetLink?: { entityType: WorkTaskLinkEntityType; entityId: string },
  presetDueAt?: string | null
): FormState {
  if (!t) {
    const linkType = (presetLink?.entityType ?? '') as WorkTaskLinkEntityType | '';
    const linkId = presetLink?.entityId ?? '';
    let dueDate = '';
    let dueTime = '';
    if (presetDueAt) {
      try {
        const d = new Date(presetDueAt);
        dueDate = d.toISOString().slice(0, 10);
        dueTime = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
      } catch {
        // ignore
      }
    }
    return {
      ...emptyForm,
      assigneeUserId: defaultAssignee || '',
      linkEntityType: linkType,
      linkEntityId: linkId,
      dueDate,
      dueTime,
    };
  }
  const due = t.dueAt ? new Date(t.dueAt) : null;
  const remind = t.remindAt ? new Date(t.remindAt) : null;
  const firstLink = t.links?.[0];
  return {
    title: t.title,
    description: t.description ?? '',
    dueDate: due ? due.toISOString().slice(0, 10) : '',
    dueTime: due ? `${String(due.getHours()).padStart(2, '0')}:${String(due.getMinutes()).padStart(2, '0')}` : '',
    remindDate: remind ? remind.toISOString().slice(0, 10) : '',
    remindTime: remind ? `${String(remind.getHours()).padStart(2, '0')}:${String(remind.getMinutes()).padStart(2, '0')}` : '',
    priority: t.priority,
    linkEntityType: (firstLink?.entityType as WorkTaskLinkEntityType | '') ?? '',
    linkEntityId: firstLink?.entityId ?? '',
    assigneeUserId: t.assigneeUserId ?? defaultAssignee ?? '',
  };
}

function formToPayload(
  form: FormState,
  createdByUserId: string | null
): {
  title: string;
  description: string | null;
  dueAt: string | null;
  remindAt: string | null;
  priority: WorkTaskPriority;
  assigneeUserId: string | null;
  createdByUserId: string | null;
  links: { entityType: WorkTaskLinkEntityType; entityId: string | null }[];
} {
  const dueAt =
    form.dueDate && form.dueTime
      ? new Date(`${form.dueDate}T${form.dueTime}`).toISOString()
      : form.dueDate
      ? new Date(form.dueDate + 'T12:00:00').toISOString()
      : null;
  const remindAt =
    form.remindDate && form.remindTime
      ? new Date(`${form.remindDate}T${form.remindTime}`).toISOString()
      : form.remindDate
      ? new Date(form.remindDate + 'T09:00:00').toISOString()
      : null;
  const links: { entityType: WorkTaskLinkEntityType; entityId: string | null }[] = [];
  if (form.linkEntityType) {
    links.push({
      entityType: form.linkEntityType as WorkTaskLinkEntityType,
      entityId: form.linkEntityType === 'internal' ? null : (form.linkEntityId.trim() || null),
    });
  }
  return {
    title: form.title.trim(),
    description: form.description.trim() || null,
    dueAt,
    remindAt,
    priority: form.priority,
    assigneeUserId: form.assigneeUserId.trim() || null,
    createdByUserId: createdByUserId || null,
    links,
  };
}

interface TaskFormModalProps {
  initialTask: WorkTask | null;
  defaultAssigneeUserId: string | null;
  presetLink?: { entityType: WorkTaskLinkEntityType; entityId: string };
  /** ISO date-time string to prefill due date/time when creating (e.g. from calendar day click). */
  presetDueAt?: string | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function TaskFormModal({
  initialTask,
  defaultAssigneeUserId,
  presetLink,
  presetDueAt,
  onClose,
  onSaved,
}: TaskFormModalProps) {
  const [form, setForm] = useState<FormState>(() =>
    toFormState(initialTask, defaultAssigneeUserId, presetLink, presetDueAt)
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(toFormState(initialTask, defaultAssigneeUserId, presetLink, presetDueAt));
  }, [initialTask, defaultAssigneeUserId, presetLink, presetDueAt]);

  const { data: profiles = [] } = useQuery({
    queryKey: ['profiles'],
    queryFn: getProfiles,
    enabled: isSupabaseConfigured(),
  });
  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => listClients({}),
    enabled: isSupabaseConfigured() && (form.linkEntityType === 'client' || !!presetLink?.entityType),
  });
  const { data: deals = [] } = useQuery({
    queryKey: ['deals'],
    queryFn: () => listDeals({}),
    enabled: isSupabaseConfigured() && (form.linkEntityType === 'deal' || !!presetLink?.entityType),
  });
  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => listProjects({}),
    enabled: isSupabaseConfigured() && (form.linkEntityType === 'project' || !!presetLink?.entityType),
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      alert('Title is required');
      return;
    }
    setSaving(true);
    try {
      const payload = formToPayload(form, defaultAssigneeUserId);
      if (initialTask) {
        await updateWorkTask(initialTask.id, {
          title: payload.title,
          description: payload.description,
          priority: payload.priority,
          dueAt: payload.dueAt,
          remindAt: payload.remindAt,
          assigneeUserId: payload.assigneeUserId,
        });
        await updateWorkTaskLinks(initialTask.id, payload.links);
      } else {
        await createWorkTask({
          ...payload,
          assigneeUserId: payload.assigneeUserId ?? defaultAssigneeUserId,
        });
      }
      onSaved();
    } catch (err) {
      console.error(err);
      setSaving(false);
    }
  };

  const inputClass =
    'w-full rounded-xl border border-brand-200 bg-white px-4 py-3 text-sm text-primary placeholder:text-brand-400 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-shadow';
  const labelClass = 'block text-xs font-semibold text-brand-600 uppercase tracking-wider mb-2';

  return (
    <>
      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
      <div
        className="fixed inset-0 z-40 bg-black/25"
        aria-hidden
        onClick={onClose}
      />
      {/* Panel 33% ancho a la derecha */}
      <div
        className="fixed top-0 bottom-0 right-0 z-50 h-screen flex flex-col bg-white animate-[slideInRight_0.25s_ease-out]"
        style={{
          width: 'min(33vw, 100vw)',
          minWidth: '320px',
          maxWidth: '100vw',
          boxShadow: '-4px 0 24px rgba(11, 48, 100, 0.12)',
        }}
      >
        <header className="shrink-0 flex items-center justify-between gap-3 px-6 py-4 border-b border-brand-100 bg-white">
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-brand-500 hover:bg-brand-100 transition-colors"
            aria-label="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
          <h2 className="text-lg font-bold text-primary">
            {initialTask ? 'Editar tarea' : 'Nueva tarea'}
          </h2>
          <div className="w-9" aria-hidden />
        </header>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto min-h-0">
            <div className="p-6 pb-8 space-y-5 min-h-full">
              <h3 className="text-sm font-bold text-brand-500 uppercase tracking-wider pb-1">
                Detalles de la tarea
              </h3>
              <div>
                <label className={labelClass}>Título *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                  placeholder="Nombre de la tarea"
                  className={inputClass}
                  required
                />
              </div>

              <div>
                <label className={labelClass}>Descripción</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                  rows={2}
                  placeholder="Añade detalles..."
                  className={`${inputClass} resize-none`}
                />
              </div>

              {/* Prioridad */}
              <div>
                <label className={labelClass}>Prioridad</label>
                <div className="flex gap-2">
                  {(['low', 'medium', 'high'] as const).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, priority: p }))}
                      className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition-all ${
                        form.priority === p
                          ? p === 'high'
                            ? 'bg-red-100 text-red-700 ring-2 ring-red-200'
                            : p === 'medium'
                            ? 'bg-amber-100 text-amber-700 ring-2 ring-amber-200'
                            : 'bg-brand-100 text-primary ring-2 ring-brand-200'
                          : 'bg-brand-50/80 text-brand-600 hover:bg-brand-100'
                      }`}
                    >
                      {p === 'high' ? 'Alta' : p === 'medium' ? 'Media' : 'Baja'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Fechas en 2 columnas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <DateTimePicker
                  label="Vencimiento"
                  dateValue={form.dueDate}
                  timeValue={form.dueTime}
                  onChangeDate={(v) => setForm((p) => ({ ...p, dueDate: v }))}
                  onChangeTime={(v) => setForm((p) => ({ ...p, dueTime: v }))}
                  placeholder="Fecha y hora"
                />
                <DateTimePicker
                  label="Recordatorio"
                  dateValue={form.remindDate}
                  timeValue={form.remindTime}
                  onChangeDate={(v) => setForm((p) => ({ ...p, remindDate: v }))}
                  onChangeTime={(v) => setForm((p) => ({ ...p, remindTime: v }))}
                  placeholder="Fecha y hora"
                />
              </div>

              {/* Vinculación */}
              <div className="space-y-4">
                <Select
                  label="Vincular a"
                  value={form.linkEntityType}
                  options={[
                    { value: 'client', label: 'Lead' },
                    { value: 'deal', label: 'Deal' },
                    { value: 'project', label: 'Proyecto' },
                    { value: 'internal', label: 'Interno' },
                  ]}
                  onChange={(v) =>
                    setForm((p) => ({
                      ...p,
                      linkEntityType: v as WorkTaskLinkEntityType | '',
                      linkEntityId: '',
                    }))
                  }
                  placeholder="Ninguno"
                  icon={<Link2 className="w-4 h-4" />}
                />
                {form.linkEntityType === 'client' && (
                  <Select
                    label="Lead"
                    value={form.linkEntityId}
                    options={clients.map((c) => ({ value: c.id, label: c.name }))}
                    onChange={(v) => setForm((p) => ({ ...p, linkEntityId: v }))}
                    placeholder="Seleccionar lead"
                  />
                )}
                {form.linkEntityType === 'deal' && (
                  <Select
                    label="Deal"
                    value={form.linkEntityId}
                    options={deals.map((d) => ({
                      value: d.id,
                      label: `${d.title}${d.clientName ? ` (${d.clientName})` : ''}`,
                    }))}
                    onChange={(v) => setForm((p) => ({ ...p, linkEntityId: v }))}
                    placeholder="Seleccionar deal"
                  />
                )}
                {form.linkEntityType === 'project' && (
                  <Select
                    label="Proyecto"
                    value={form.linkEntityId}
                    options={projects.map((p) => ({
                      value: p.id,
                      label: `${p.title}${p.clientName ? ` (${p.clientName})` : ''}`,
                    }))}
                    onChange={(v) => setForm((p) => ({ ...p, linkEntityId: v }))}
                    placeholder="Seleccionar proyecto"
                  />
                )}
              </div>

              <Select
                label="Asignado a"
                value={form.assigneeUserId}
                options={profiles.map((p) => ({
                  value: p.id,
                  label: p.displayName || p.email || p.id,
                }))}
                onChange={(v) => setForm((p) => ({ ...p, assigneeUserId: v }))}
                placeholder="Sin asignar"
                icon={<User className="w-4 h-4" />}
              />
            </div>
          </div>

          <footer className="shrink-0 flex gap-3 p-6 border-t border-brand-100 bg-white">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-brand-200 py-3 text-sm font-semibold text-brand-700 hover:bg-brand-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 rounded-xl bg-primary py-3 text-sm font-semibold text-white shadow-md hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Guardando...' : initialTask ? 'Guardar' : 'Crear tarea'}
            </button>
          </footer>
        </form>
      </div>
    </>
  );
}
