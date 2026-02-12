import React, { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { listAllWorkTasks } from '../../services/tasks';
import type { WorkTask, WorkTaskStatus, WorkTaskPriority, WorkTaskLinkEntityType } from '../../types';
import TaskFormModal from './TaskFormModal';
import { PlusCircle, Filter, ArrowUpDown, ArrowDownUp } from 'lucide-react';
import { isSupabaseConfigured } from '../../services/supabase';
import { getProfiles } from '../../services/profiles';

const STATUS_LABELS: Record<WorkTaskStatus, string> = {
  open: 'Open',
  in_progress: 'In progress',
  done: 'Done',
  archived: 'Archived',
};

const PRIORITY_LABELS: Record<WorkTaskPriority, string> = {
  low: 'L',
  medium: 'M',
  high: 'H',
};

const ENTITY_LABELS: Record<WorkTaskLinkEntityType, string> = {
  client: 'Client',
  deal: 'Deal',
  project: 'Project',
  internal: 'Internal',
};

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { dateStyle: 'short' });
}

function formatDateTime(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' });
}

export default function AllTasksView() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const [formOpen, setFormOpen] = React.useState(false);
  const [editingTask, setEditingTask] = React.useState<WorkTask | null>(null);
  const [filterAssignee, setFilterAssignee] = React.useState<string>(() => searchParams.get('assignee') || '');
  const [filterStatus, setFilterStatus] = React.useState<WorkTaskStatus | ''>(() => (searchParams.get('status') as WorkTaskStatus) || '');
  const [filterPriority, setFilterPriority] = React.useState<WorkTaskPriority | ''>(() => (searchParams.get('priority') as WorkTaskPriority) || '');
  const [filterEntityType, setFilterEntityType] = React.useState<WorkTaskLinkEntityType | ''>(() => (searchParams.get('entityType') as WorkTaskLinkEntityType) || '');
  const [filterOverdue, setFilterOverdue] = React.useState<boolean>(() => searchParams.get('overdue') === '1');
  const [search, setSearch] = React.useState('');
  const [sortBy, setSortBy] = React.useState<'due_at' | 'priority' | 'updated_at'>('updated_at');
  const [sortAsc, setSortAsc] = React.useState(false);

  useEffect(() => {
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const overdue = searchParams.get('overdue');
    const assignee = searchParams.get('assignee');
    const entityType = searchParams.get('entityType');
    if (status) setFilterStatus(status as WorkTaskStatus);
    if (priority) setFilterPriority(priority as WorkTaskPriority);
    setFilterOverdue(overdue === '1');
    if (assignee !== null) setFilterAssignee(assignee || '');
    if (entityType) setFilterEntityType(entityType as WorkTaskLinkEntityType);
  }, [searchParams]);

  const { data: profiles = [] } = useQuery({
    queryKey: ['profiles'],
    queryFn: getProfiles,
    enabled: isSupabaseConfigured(),
  });

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: [
      'work-tasks',
      'all',
      filterAssignee,
      filterStatus,
      filterPriority,
      filterEntityType,
      filterOverdue,
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
          overdue: filterOverdue || undefined,
          search: search.trim() || undefined,
        },
        sortBy,
        sortAsc,
      }),
    enabled: isSupabaseConfigured(),
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['work-tasks'], exact: false });

  const assigneeLabel = (userId: string | null) => {
    if (!userId) return '—';
    const p = profiles.find((x) => x.id === userId);
    return p?.displayName || p?.email || userId.slice(0, 8);
  };

  const linkSummary = (task: WorkTask) => {
    if (!task.links?.length) return '—';
    const types = [...new Set(task.links.map((l) => l.entityType))];
    return types.map((t) => ENTITY_LABELS[t]).join(', ');
  };

  return (
    <div className="h-full overflow-auto p-4 sm:p-6">
      <div className="max-w-6xl mx-auto space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="text-xl font-title text-primary">All Tasks</h1>
          <button
            type="button"
            onClick={() => {
              setEditingTask(null);
              setFormOpen(true);
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-brand-500 transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            New Task
          </button>
        </div>

        <div className="rounded-2xl border border-brand-200/60 bg-white p-4 shadow-card">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="w-4 h-4 text-brand-500" />
            <span className="text-xs font-bold uppercase tracking-wide text-brand-500">
              Filters
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <input
              type="text"
              placeholder="Search title, description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="rounded-xl border border-brand-200/60 px-3 py-2 text-sm font-body"
            />
            <select
              value={filterAssignee}
              onChange={(e) => setFilterAssignee(e.target.value)}
              className="rounded-xl border border-brand-200/60 px-3 py-2 text-sm font-body"
            >
              <option value="">All assignees</option>
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.displayName || p.email || p.id}
                </option>
              ))}
            </select>
            <select
              value={filterStatus}
              onChange={(e) => {
                const v = e.target.value as WorkTaskStatus | '';
                setFilterStatus(v);
                setSearchParams((p) => { const n = new URLSearchParams(p); if (v) n.set('status', v); else n.delete('status'); return n; });
              }}
              className="rounded-xl border border-brand-200/60 px-3 py-2 text-sm font-body"
            >
              <option value="">All statuses</option>
              {(Object.keys(STATUS_LABELS) as WorkTaskStatus[]).map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </select>
            <select
              value={filterPriority}
              onChange={(e) => {
                const v = e.target.value as WorkTaskPriority | '';
                setFilterPriority(v);
                setSearchParams((p) => { const n = new URLSearchParams(p); if (v) n.set('priority', v); else n.delete('priority'); return n; });
              }}
              className="rounded-xl border border-brand-200/60 px-3 py-2 text-sm font-body"
            >
              <option value="">All priorities</option>
              {(Object.keys(PRIORITY_LABELS) as WorkTaskPriority[]).map((p) => (
                <option key={p} value={p}>
                  {PRIORITY_LABELS[p]}
                </option>
              ))}
            </select>
            <select
              value={filterEntityType}
              onChange={(e) => {
                const v = e.target.value as WorkTaskLinkEntityType | '';
                setFilterEntityType(v);
                setSearchParams((p) => { const n = new URLSearchParams(p); if (v) n.set('entityType', v); else n.delete('entityType'); return n; });
              }}
              className="rounded-xl border border-brand-200/60 px-3 py-2 text-sm font-body"
            >
              <option value="">All link types</option>
              {(Object.keys(ENTITY_LABELS) as WorkTaskLinkEntityType[]).map((k) => (
                <option key={k} value={k}>
                  {ENTITY_LABELS[k]}
                </option>
              ))}
            </select>
            <label className="flex items-center gap-2 rounded-xl border border-brand-200/60 px-3 py-2 text-sm font-body cursor-pointer">
              <input
                type="checkbox"
                checked={filterOverdue}
                onChange={(e) => {
                  const v = e.target.checked;
                  setFilterOverdue(v);
                  setSearchParams((p) => { const n = new URLSearchParams(p); if (v) n.set('overdue', '1'); else n.delete('overdue'); return n; });
                }}
                className="rounded border-brand-300"
              />
              Overdue only
            </label>
          </div>
        </div>

        <div className="rounded-xl border border-brand-100 bg-white shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center text-brand-500 text-sm">Loading...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-brand-50 border-b border-brand-200">
                  <tr>
                    <th className="text-left p-3 font-bold text-primary">Title</th>
                    <th className="text-left p-3 font-bold text-primary">Linked entity</th>
                    <th className="text-left p-3 font-bold text-primary">Status</th>
                    <th className="text-left p-3 font-bold text-primary">Priority</th>
                    <th className="text-left p-3 font-bold text-primary">Due date</th>
                    <th className="text-left p-3 font-bold text-primary">Assignee</th>
                    <th className="text-left p-3 font-bold text-primary">
                      <button
                        type="button"
                        onClick={() => {
                          if (sortBy === 'updated_at') setSortAsc((a) => !a);
                          else setSortBy('updated_at');
                        }}
                        className="inline-flex items-center gap-1"
                      >
                        Updated
                        {sortBy === 'updated_at' ? (sortAsc ? <ArrowUpDown size={14} /> : <ArrowDownUp size={14} />) : null}
                      </button>
                    </th>
                    <th className="w-20 p-3" />
                  </tr>
                </thead>
                <tbody>
                  {tasks.map((t) => (
                    <tr
                      key={t.id}
                      className="border-b border-brand-100 hover:bg-brand-50/50"
                    >
                      <td className="p-3 font-medium">{t.title}</td>
                      <td className="p-3 text-brand-600">{linkSummary(t)}</td>
                      <td className="p-3">{STATUS_LABELS[t.status]}</td>
                      <td className="p-3">
                        <span
                          className={
                            t.priority === 'high'
                              ? 'font-bold text-amber-600'
                              : 'text-brand-600'
                          }
                        >
                          {PRIORITY_LABELS[t.priority]}
                        </span>
                      </td>
                      <td className="p-3">{formatDate(t.dueAt)}</td>
                      <td className="p-3">{assigneeLabel(t.assigneeUserId)}</td>
                      <td className="p-3 text-brand-600">{formatDateTime(t.updatedAt)}</td>
                      <td className="p-3">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingTask(t);
                            setFormOpen(true);
                          }}
                          className="text-brand-600 hover:text-primary font-medium text-xs"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {!isLoading && tasks.length === 0 && (
            <div className="p-8 text-center text-brand-500 text-sm">
              No tasks match the filters.
            </div>
          )}
        </div>
      </div>

      {formOpen && (
        <TaskFormModal
          initialTask={editingTask}
          defaultAssigneeUserId={user?.id ?? null}
          onClose={() => {
            setFormOpen(false);
            setEditingTask(null);
          }}
          onSaved={() => {
            invalidate();
            setFormOpen(false);
            setEditingTask(null);
          }}
        />
      )}
    </div>
  );
}
