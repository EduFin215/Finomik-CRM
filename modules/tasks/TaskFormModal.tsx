import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X } from 'lucide-react';
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

function toFormState(t: WorkTask | null, defaultAssignee: string | null, presetLink?: { entityType: WorkTaskLinkEntityType; entityId: string }): FormState {
  if (!t) {
    const link = presetLink || { entityType: '' as WorkTaskLinkEntityType | '', entityId: '' };
    const linkType = (presetLink?.entityType ?? '') as WorkTaskLinkEntityType | '';
    const linkId = presetLink?.entityId ?? '';
    return {
      ...emptyForm,
      assigneeUserId: defaultAssignee || '',
      linkEntityType: linkType,
      linkEntityId: linkId,
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
  onClose: () => void;
  onSaved: () => void;
}

export default function TaskFormModal({
  initialTask,
  defaultAssigneeUserId,
  presetLink,
  onClose,
  onSaved,
}: TaskFormModalProps) {
  const [form, setForm] = useState<FormState>(() =>
    toFormState(initialTask, defaultAssigneeUserId, presetLink)
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(toFormState(initialTask, defaultAssigneeUserId, presetLink));
  }, [initialTask, defaultAssigneeUserId, presetLink]);

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between gap-2 mb-4">
          <h2 className="text-lg font-bold text-primary">
            {initialTask ? 'Edit task' : 'New task'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-brand-500 hover:bg-brand-100"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-brand-700 uppercase tracking-wide mb-1">
              Title *
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              placeholder="Task title"
              className="w-full rounded-xl border border-brand-200/60 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-brand-700 uppercase tracking-wide mb-1">
              Description
            </label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              rows={2}
              className="w-full rounded-xl border border-brand-200/60 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-brand-700 uppercase tracking-wide mb-1">
                Due date
              </label>
              <input
                type="date"
                value={form.dueDate}
                onChange={(e) => setForm((p) => ({ ...p, dueDate: e.target.value }))}
                className="w-full rounded-xl border border-brand-200/60 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-brand-700 uppercase tracking-wide mb-1">
                Due time
              </label>
              <input
                type="time"
                value={form.dueTime}
                onChange={(e) => setForm((p) => ({ ...p, dueTime: e.target.value }))}
                className="w-full rounded-xl border border-brand-200/60 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-brand-700 uppercase tracking-wide mb-1">
                Reminder date
              </label>
              <input
                type="date"
                value={form.remindDate}
                onChange={(e) => setForm((p) => ({ ...p, remindDate: e.target.value }))}
                className="w-full rounded-xl border border-brand-200/60 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-brand-700 uppercase tracking-wide mb-1">
                Reminder time
              </label>
              <input
                type="time"
                value={form.remindTime}
                onChange={(e) => setForm((p) => ({ ...p, remindTime: e.target.value }))}
                className="w-full rounded-xl border border-brand-200/60 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-brand-700 uppercase tracking-wide mb-1">
              Priority
            </label>
            <select
              value={form.priority}
              onChange={(e) => setForm((p) => ({ ...p, priority: e.target.value as WorkTaskPriority }))}
              className="w-full rounded-xl border border-brand-200/60 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-brand-700 uppercase tracking-wide mb-1">
                Link to
              </label>
              <select
                value={form.linkEntityType}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    linkEntityType: e.target.value as WorkTaskLinkEntityType | '',
                    linkEntityId: '',
                  }))
                }
                className="w-full rounded-xl border border-brand-200/60 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
              >
                <option value="">— None —</option>
                <option value="client">Client</option>
                <option value="deal">Deal</option>
                <option value="project">Project</option>
                <option value="internal">Internal</option>
              </select>
            </div>
            {form.linkEntityType === 'client' && (
              <div>
                <label className="block text-xs font-bold text-brand-700 uppercase tracking-wide mb-1">
                  Client
                </label>
                <select
                  value={form.linkEntityId}
                  onChange={(e) => setForm((p) => ({ ...p, linkEntityId: e.target.value }))}
                  className="w-full rounded-xl border border-brand-200/60 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
                >
                  <option value="">— Select —</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {form.linkEntityType === 'deal' && (
              <div>
                <label className="block text-xs font-bold text-brand-700 uppercase tracking-wide mb-1">
                  Deal
                </label>
                <select
                  value={form.linkEntityId}
                  onChange={(e) => setForm((p) => ({ ...p, linkEntityId: e.target.value }))}
                  className="w-full rounded-xl border border-brand-200/60 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
                >
                  <option value="">— Select —</option>
                  {deals.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.title} {d.clientName ? `(${d.clientName})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {form.linkEntityType === 'project' && (
              <div>
                <label className="block text-xs font-bold text-brand-700 uppercase tracking-wide mb-1">
                  Project
                </label>
                <select
                  value={form.linkEntityId}
                  onChange={(e) => setForm((p) => ({ ...p, linkEntityId: e.target.value }))}
                  className="w-full rounded-xl border border-brand-200/60 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
                >
                  <option value="">— Select —</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title} {p.clientName ? `(${p.clientName})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
          <div>
            <label className="block text-xs font-bold text-brand-700 uppercase tracking-wide mb-1">
              Assignee
            </label>
            <select
              value={form.assigneeUserId}
              onChange={(e) => setForm((p) => ({ ...p, assigneeUserId: e.target.value }))}
              className="w-full rounded-xl border border-brand-200/60 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
            >
              <option value="">— Unassigned —</option>
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.displayName || p.email || p.id}
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-brand-200/60 px-4 py-2 text-sm font-bold text-brand-700 hover:bg-brand-100/50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-bold text-white hover:bg-brand-100/500 disabled:opacity-50"
            >
              {saving ? 'Saving...' : initialTask ? 'Save' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
