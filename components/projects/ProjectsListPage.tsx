import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Filter, ChevronRight, CheckSquare } from 'lucide-react';
import { listProjects, type ListProjectsFilters } from '../../services/crm/projects';
import type { ProjectStatus } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import TaskFormModal from '../../modules/tasks/TaskFormModal';

const STATUS_OPTIONS: { value: ProjectStatus; label: string }[] = [
  { value: 'planned', label: 'Planned' },
  { value: 'active', label: 'Active' },
  { value: 'blocked', label: 'Blocked' },
  { value: 'done', label: 'Done' },
  { value: 'archived', label: 'Archived' },
];

const ProjectsListPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | ''>(() => (searchParams.get('status') as ProjectStatus) || '');
  const [dueFrom, setDueFrom] = useState(() => searchParams.get('dueFrom') || '');
  const [dueTo, setDueTo] = useState(() => searchParams.get('dueTo') || '');
  const [addTaskForProjectId, setAddTaskForProjectId] = useState<string | null>(null);

  useEffect(() => {
    const status = searchParams.get('status');
    const dueFromQ = searchParams.get('dueFrom');
    const dueToQ = searchParams.get('dueTo');
    if (status) setStatusFilter(status as ProjectStatus);
    if (dueFromQ) setDueFrom(dueFromQ);
    if (dueToQ) setDueTo(dueToQ);
  }, [searchParams]);

  const filters: ListProjectsFilters = useMemo(() => {
    const f: ListProjectsFilters = {};
    if (statusFilter) f.status = statusFilter;
    if (dueFrom) f.dueDateFrom = dueFrom;
    if (dueTo) f.dueDateTo = dueTo;
    return f;
  }, [statusFilter, dueFrom, dueTo]);

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['projects', filters],
    queryFn: () => listProjects(filters),
  });

  const formatDate = (s: string | undefined) =>
    s ? new Date(s).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }) : '–';

  return (
    <div className="space-y-4 sm:space-y-6 h-full flex flex-col min-h-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div>
          <h2 className="text-xl sm:text-2xl font-title text-primary">Projects</h2>
          <p className="text-brand-500 font-body text-sm">View and filter projects.</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 shrink-0">
        <span className="text-brand-500 text-xs font-bold uppercase flex items-center gap-1">
          <Filter size={12} /> Filters
        </span>
        <select
          value={statusFilter}
          onChange={(e) => {
            const v = (e.target.value || '') as ProjectStatus | '';
            setStatusFilter(v);
            setSearchParams((p) => { const n = new URLSearchParams(p); if (v) n.set('status', v); else n.delete('status'); return n; });
          }}
          className="rounded-xl border border-brand-200/60 bg-white px-3 py-2 text-sm font-body text-primary"
        >
          <option value="">All statuses</option>
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <input
          type="date"
          value={dueFrom}
          onChange={(e) => {
            const v = e.target.value;
            setDueFrom(v);
            setSearchParams((p) => { const n = new URLSearchParams(p); if (v) n.set('dueFrom', v); else n.delete('dueFrom'); return n; });
          }}
          placeholder="Due from"
          className="rounded-xl border border-brand-200/60 px-3 py-2 text-sm font-body"
        />
        <input
          type="date"
          value={dueTo}
          onChange={(e) => {
            const v = e.target.value;
            setDueTo(v);
            setSearchParams((p) => { const n = new URLSearchParams(p); if (v) n.set('dueTo', v); else n.delete('dueTo'); return n; });
          }}
          placeholder="Due to"
          className="rounded-xl border border-brand-200/60 px-3 py-2 text-sm font-body"
        />
      </div>

      <div className="bg-white rounded-2xl border border-brand-200/60 shadow-card overflow-hidden flex-1 flex flex-col min-h-0">
        {isLoading && (
          <div className="flex justify-center py-12">
            <p className="text-brand-500 text-sm">Loading...</p>
          </div>
        )}
        {!isLoading && (
          <div className="overflow-x-auto overflow-y-auto flex-1">
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead className="sticky top-0 bg-brand-100/30 z-10 border-b border-brand-200">
                <tr className="text-brand-400 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider">
                  <th className="py-3 px-3 sm:px-4">Title</th>
                  <th className="py-3 px-3 sm:px-4">Client</th>
                  <th className="py-3 px-3 sm:px-4">Status</th>
                  <th className="py-3 px-3 sm:px-4 hidden md:table-cell">Start date</th>
                  <th className="py-3 px-3 sm:px-4">Due date</th>
                  <th className="py-3 px-3 sm:px-4 hidden sm:table-cell">Updated</th>
                  <th className="py-3 px-3 sm:px-4 w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-100">
                {projects.map((project) => (
                  <tr
                    key={project.id}
                    className="group hover:bg-brand-100/30 transition-colors cursor-pointer"
                    onClick={() => navigate(`/crm/clients/${project.clientId}`)}
                  >
                    <td className="py-3 px-3 sm:px-4 font-medium text-primary">{project.title}</td>
                    <td className="py-3 px-3 sm:px-4 text-sm text-brand-600 truncate max-w-[140px]">{project.clientName ?? project.clientId}</td>
                    <td className="py-3 px-3 sm:px-4">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-brand-100 text-brand-600 capitalize">{project.status}</span>
                    </td>
                    <td className="py-3 px-3 sm:px-4 hidden md:table-cell text-sm text-brand-500">{formatDate(project.startDate)}</td>
                    <td className="py-3 px-3 sm:px-4 text-sm text-brand-500">{formatDate(project.dueDate)}</td>
                    <td className="py-3 px-3 sm:px-4 hidden sm:table-cell text-xs text-brand-500">{formatDate(project.updatedAt)}</td>
                    <td className="py-3 px-3 sm:px-4 text-right">
                      <div className="flex items-center justify-end gap-0.5">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setAddTaskForProjectId(project.id); }}
                          className="p-2 text-brand-500 hover:bg-brand-100/50 hover:text-primary rounded-xl transition-colors"
                          title="Add task"
                        >
                          <CheckSquare size={18} />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); navigate(`/crm/clients/${project.clientId}`); }}
                          className="p-2 text-brand-500 hover:bg-brand-100/50 hover:text-primary rounded-xl transition-colors"
                        >
                          <ChevronRight size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!isLoading && projects.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-brand-400">
            <Filter size={48} className="mb-4 opacity-20" />
            <p className="text-lg font-subtitle text-primary">No projects found</p>
            <p className="text-sm font-body">Adjust filters or add projects from a client.</p>
          </div>
        )}
      </div>

      {addTaskForProjectId && (
        <TaskFormModal
          initialTask={null}
          defaultAssigneeUserId={user?.id ?? null}
          presetLink={{ entityType: 'project', entityId: addTaskForProjectId }}
          onClose={() => setAddTaskForProjectId(null)}
          onSaved={() => setAddTaskForProjectId(null)}
        />
      )}
    </div>
  );
};

export default ProjectsListPage;
