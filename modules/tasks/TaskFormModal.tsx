import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link2, User, ClipboardCheck } from 'lucide-react';
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
import { Select } from './Select';
import { Modal } from '../../components/ui/Modal';

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
    'w-full rounded-xl border border-brand-200/60 bg-white px-4 py-3 text-sm text-primary placeholder:text-brand-soft focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-shadow';
  const labelClass = 'block text-xs font-bold text-brand-600 uppercase tracking-wide mb-1.5';

  const footer = (
    <>
      <button
        type="button"
        onClick={onClose}
        className="rounded-xl border border-brand-200/60 px-4 py-2.5 text-sm font-bold text-brand-700 hover:bg-brand-100/50 transition-colors"
      >
        Cancelar
      </button>
      <button
        onClick={handleSubmit}
        disabled={saving}
        className="rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-600 transition-colors disabled:opacity-50 shadow-md"
      >
        {saving ? 'Guardando...' : initialTask ? 'Guardar' : 'Crear tarea'}
      </button>
    </>
  );

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={
        <div className="flex items-center gap-3">
          <div className="bg-brand-100/50 p-2 rounded-xl text-primary">
            <ClipboardCheck className="w-6 h-6" />
          </div>
          <div>
            <span className="block text-xl font-extrabold text-primary">
              {initialTask ? 'Editar Tarea' : 'Nueva Tarea'}
            </span>
            <span className="block text-brand-muted text-xs font-body font-normal mt-0.5">
              {initialTask ? 'Modifica los detalles de la tarea' : 'Crea una nueva tarea para el equipo'}
            </span>
          </div>
        </div>
      }
      maxWidth="xl"
      footer={footer}
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className={labelClass}>Título *</label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
            placeholder="Nombre de la tarea"
            className={inputClass}
            required
            autoFocus
          />
        </div>

        <div>
          <label className={labelClass}>Descripción</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
            rows={3}
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
                className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition-all border ${form.priority === p
                  ? p === 'high'
                    ? 'bg-red-50 text-red-700 border-red-200 ring-1 ring-red-200'
                    : p === 'medium'
                      ? 'bg-amber-50 text-amber-700 border-amber-200 ring-1 ring-amber-200'
                      : 'bg-brand-50 text-primary border-brand-200 ring-1 ring-brand-200'
                  : 'bg-white text-brand-muted border-brand-100 hover:bg-brand-50'
                  }`}
              >
                {p === 'high' ? 'Alta' : p === 'medium' ? 'Media' : 'Baja'}
              </button>
            ))}
          </div>
        </div>

        {/* Fechas */}
        <div className="space-y-4">
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

        <div className="h-px bg-brand-very-soft/40" />

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
      </form>
    </Modal>
  );
}
