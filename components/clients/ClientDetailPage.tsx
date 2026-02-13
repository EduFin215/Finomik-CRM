import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Edit2,
  Plus,
  Phone,
  Mail,
  MapPin,
  Globe,
  FileText,
  Users,
  Briefcase,
  FolderOpen,
  Link2,
  CheckSquare,
  ChevronDown,
  ExternalLink,
  Copy,
} from 'lucide-react';
import { getClientById } from '../../services/crm/clients';
import { listClientContacts, createClientContact } from '../../services/crm/contacts';
import { listClientDeals, createDeal } from '../../services/crm/deals';
import { listClientProjects, createProject } from '../../services/crm/projects';
import { getResourcesForClient } from '../../services/resources';
import { listWorkTasksForEntity } from '../../services/tasks';
import { isSupabaseConfigured } from '../../services/supabase';
import type { ResourceWithLinks } from '../../types';
import type { WorkTask } from '../../types';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../hooks/useAuth';
import TaskFormModal from '../../modules/tasks/TaskFormModal';
import TaskDetailDrawer from '../../modules/tasks/TaskDetailDrawer';
import { formatTaskDateTime } from '../../modules/tasks/formatTaskDate';
import { Link as RouterLink } from 'react-router-dom';
import { Clock, CheckCircle, Circle } from 'lucide-react';

const TABS = [
  { id: 'overview', label: 'Overview', icon: FileText },
  { id: 'contacts', label: 'Contacts', icon: Users },
  { id: 'deals', label: 'Deals', icon: Briefcase },
  { id: 'projects', label: 'Projects', icon: FolderOpen },
  { id: 'resources', label: 'Resources', icon: Link2 },
  { id: 'tasks', label: 'Tasks', icon: CheckSquare },
] as const;

const ClientDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]['id']>('overview');
  const [addDropdownOpen, setAddDropdownOpen] = useState(false);
  const [addTaskModalOpen, setAddTaskModalOpen] = useState(false);
  const [detailTask, setDetailTask] = useState<WorkTask | null>(null);
  const { user } = useAuth();

  const { data: client, isLoading } = useQuery({
    queryKey: ['client', id],
    queryFn: () => getClientById(id!),
    enabled: !!id,
  });

  const { data: clientWorkTasks = [] } = useQuery({
    queryKey: ['work-tasks', 'client', id],
    queryFn: () => listWorkTasksForEntity('client', id!),
    enabled: !!id && isSupabaseConfigured(),
  });

  const { data: contacts = [] } = useQuery({
    queryKey: ['client-contacts', id],
    queryFn: () => listClientContacts(id!),
    enabled: !!id,
  });

  const { data: deals = [] } = useQuery({
    queryKey: ['client-deals', id],
    queryFn: () => listClientDeals(id!),
    enabled: !!id,
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['client-projects', id],
    queryFn: () => listClientProjects(id!),
    enabled: !!id,
  });

  const { data: clientResources = [] } = useQuery({
    queryKey: ['client-resources', id],
    queryFn: () => getResourcesForClient(id!),
    enabled: !!id,
  });

  const refetch = () => {
    queryClient.invalidateQueries({ queryKey: ['client', id] });
    queryClient.invalidateQueries({ queryKey: ['client-contacts', id] });
    queryClient.invalidateQueries({ queryKey: ['client-deals', id] });
    queryClient.invalidateQueries({ queryKey: ['client-projects', id] });
    queryClient.invalidateQueries({ queryKey: ['client-resources', id] });
    queryClient.invalidateQueries({ queryKey: ['work-tasks', 'client', id] });
    queryClient.invalidateQueries({ queryKey: ['work-tasks'], exact: false });
  };

  const handleAddContact = async () => {
    if (!id) return;
    const fullName = window.prompt('Contact full name');
    if (!fullName?.trim()) return;
    const created = await createClientContact(id, { fullName: fullName.trim() });
    if (created) {
      refetch();
      toast.toast.success('Contact added');
    } else toast.toast.error('Could not add contact');
    setAddDropdownOpen(false);
  };

  const handleAddDeal = async () => {
    if (!id) return;
    const title = window.prompt('Deal title');
    if (!title?.trim()) return;
    const created = await createDeal(id, { title: title.trim() });
    if (created) {
      refetch();
      toast.toast.success('Deal added');
    } else toast.toast.error('Could not add deal');
    setAddDropdownOpen(false);
  };

  const handleAddProject = async () => {
    if (!id) return;
    const title = window.prompt('Project title');
    if (!title?.trim()) return;
    const created = await createProject(id, { title: title.trim() });
    if (created) {
      refetch();
      toast.toast.success('Project added');
    } else toast.toast.error('Could not add project');
    setAddDropdownOpen(false);
  };

  const handleAddTask = () => {
    setAddTaskModalOpen(true);
    setAddDropdownOpen(false);
  };

  const formatDate = (s: string | undefined) =>
    s ? new Date(s).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }) : '–';
  const formatCurrency = (n: number) =>
    new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);

  if (!id) {
    navigate('/crm/leads');
    return null;
  }
  if (isLoading || !client) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-brand-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate('/crm/leads')}
          className="p-2 text-brand-500 hover:bg-brand-100 rounded-lg"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-extrabold text-primary truncate">{client.name}</h1>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <span className="text-xs px-2 py-0.5 rounded-full bg-brand-100 text-brand-600 capitalize">{client.type}</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-brand-100 text-brand-600 capitalize">{client.stage}</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-brand-100 text-brand-600 capitalize">{client.status}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="px-3 py-2 border border-brand-200 rounded-lg text-sm font-bold text-brand-600 hover:bg-brand-50"
          >
            <Edit2 size={16} className="inline mr-1" /> Edit
          </button>
          <div className="relative">
            <button
              type="button"
              onClick={() => setAddDropdownOpen((o) => !o)}
              className="px-3 py-2 bg-primary text-white rounded-lg text-sm font-bold flex items-center gap-1"
            >
              <Plus size={16} /> Add <ChevronDown size={14} />
            </button>
            {addDropdownOpen && (
              <>
                <div className="fixed inset-0 z-[55]" aria-hidden onClick={() => setAddDropdownOpen(false)} />
                <div className="absolute right-0 top-full mt-2 z-[60] min-w-[140px] bg-white/95 backdrop-blur-sm rounded-xl border border-brand-200/60 shadow-dropdown py-1">
                  <button type="button" onClick={handleAddContact} className="w-full px-4 py-3 text-left text-sm font-bold text-brand-600 hover:bg-brand-100/50 transition-colors">
                    Contact
                  </button>
                  <button type="button" onClick={handleAddDeal} className="w-full px-4 py-3 text-left text-sm font-bold text-brand-600 hover:bg-brand-100/50 transition-colors">
                    Deal
                  </button>
                  <button type="button" onClick={handleAddProject} className="w-full px-4 py-3 text-left text-sm font-bold text-brand-600 hover:bg-brand-100/50 transition-colors">
                    Project
                  </button>
                  <button type="button" onClick={handleAddTask} className="w-full px-4 py-3 text-left text-sm font-bold text-brand-600 hover:bg-brand-100/50 transition-colors">
                    Task
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="border-b border-brand-200">
        <nav className="flex gap-1 overflow-x-auto">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-brand-500 hover:text-brand-700'
                }`}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="bg-white rounded-xl border border-brand-200 p-4 sm:p-6 min-h-[200px]">
        {activeTab === 'overview' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {client.website && (
                <div className="flex items-start gap-2">
                  <Globe size={18} className="text-brand-400 mt-0.5 shrink-0" />
                  <a href={client.website.startsWith('http') ? client.website : `https://${client.website}`} target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:underline truncate">
                    {client.website}
                  </a>
                </div>
              )}
              {(client.location || client.city) && (
                <div className="flex items-start gap-2">
                  <MapPin size={18} className="text-brand-400 mt-0.5 shrink-0" />
                  <span className="text-brand-600">{client.location || `${client.city}${client.region ? `, ${client.region}` : ''}`}</span>
                </div>
              )}
              {client.email && (
                <div className="flex items-start gap-2">
                  <Mail size={18} className="text-brand-400 mt-0.5 shrink-0" />
                  <a href={`mailto:${client.email}`} className="text-brand-600 hover:underline">{client.email}</a>
                </div>
              )}
              {client.phone && (
                <div className="flex items-start gap-2">
                  <Phone size={18} className="text-brand-400 mt-0.5 shrink-0" />
                  <span className="text-brand-600">{client.phone}</span>
                </div>
              )}
            </div>
            {client.contactPerson && (
              <div>
                <p className="text-xs font-bold text-brand-500 uppercase mb-1">Primary contact</p>
                <p className="font-medium text-primary">{client.contactPerson}{client.role ? ` · ${client.role}` : ''}</p>
              </div>
            )}
            {client.notes && (
              <div>
                <p className="text-xs font-bold text-brand-500 uppercase mb-1">Notes</p>
                <p className="text-sm text-brand-600 whitespace-pre-wrap">{client.notes}</p>
              </div>
            )}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-brand-100">
              <div className="p-3 rounded-lg bg-brand-50">
                <p className="text-xs text-brand-500 font-bold">Deals</p>
                <p className="text-lg font-extrabold text-primary">{deals.length}</p>
              </div>
              <div className="p-3 rounded-lg bg-brand-50">
                <p className="text-xs text-brand-500 font-bold">Projects</p>
                <p className="text-lg font-extrabold text-primary">{projects.length}</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'contacts' && (
          <div className="space-y-3">
            {contacts.length === 0 ? (
              <p className="text-brand-500 text-sm">No contacts. Use Add → Contact to add one.</p>
            ) : (
              <ul className="divide-y divide-brand-100">
                {contacts.map((c) => (
                  <li key={c.id} className="py-3 flex items-start justify-between gap-2">
                    <div>
                      <p className="font-bold text-primary">{c.fullName}</p>
                      {c.roleTitle && <p className="text-sm text-brand-500">{c.roleTitle}</p>}
                      {c.email && <p className="text-xs text-brand-500">{c.email}</p>}
                      {c.phone && <p className="text-xs text-brand-500">{c.phone}</p>}
                    </div>
                    {c.importance === 'key' && <span className="text-xs px-2 py-0.5 rounded bg-amber-100 text-amber-800">Key</span>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {activeTab === 'deals' && (
          <div className="space-y-3">
            {deals.length === 0 ? (
              <p className="text-brand-500 text-sm">No deals. Use Add → Deal to add one.</p>
            ) : (
              <ul className="divide-y divide-brand-100">
                {deals.map((d) => (
                  <li key={d.id} className="py-3 flex items-center justify-between gap-2">
                    <div>
                      <p className="font-bold text-primary">{d.title}</p>
                      <p className="text-xs text-brand-500">{d.stage} · {d.expectedCloseDate ? formatDate(d.expectedCloseDate) : 'No date'}{d.valueEstimated != null ? ` · ${formatCurrency(d.valueEstimated)}` : ''}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {activeTab === 'projects' && (
          <div className="space-y-3">
            {projects.length === 0 ? (
              <p className="text-brand-500 text-sm">No projects. Use Add → Project to add one.</p>
            ) : (
              <ul className="divide-y divide-brand-100">
                {projects.map((p) => (
                  <li key={p.id} className="py-3 flex items-center justify-between gap-2">
                    <div>
                      <p className="font-bold text-primary">{p.title}</p>
                      <p className="text-xs text-brand-500">{p.status}{p.dueDate ? ` · Due ${formatDate(p.dueDate)}` : ''}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {activeTab === 'resources' && (
          <div className="space-y-3">
            {clientResources.length === 0 ? (
              <p className="text-brand-500 text-sm">No hay recursos. Añade recursos en la herramienta Resources y asígnalos a la carpeta de este lead, o vincúlalos explícitamente al lead.</p>
            ) : (
              <ul className="space-y-2">
                {clientResources.map((resource) => (
                  <li key={resource.id} className="bg-white p-4 rounded-xl border border-brand-200 flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-primary truncate">{resource.title}</p>
                      <p className="text-[10px] text-brand-500">{resource.type} · {resource.status}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => window.open(resource.url, '_blank')}
                        className="p-1.5 rounded-lg text-brand-500 hover:bg-brand-100"
                        title="Abrir"
                      >
                        <ExternalLink size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => navigator.clipboard.writeText(resource.url)}
                        className="p-1.5 rounded-lg text-brand-500 hover:bg-brand-100"
                        title="Copiar enlace"
                      >
                        <Copy size={16} />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {activeTab === 'tasks' && (
          <div className="space-y-3">
            <p className="text-xs text-brand-500">
              Tareas vinculadas a este lead (creadas en Tasks con lead asignado o desde aquí con «Add → Task»).
            </p>
            {clientWorkTasks.length === 0 ? (
              <p className="text-brand-500 text-sm py-4">No hay tareas vinculadas. Añade una con el botón Add → Task o asígnalas desde la herramienta Tasks.</p>
            ) : (
              <ul className="divide-y divide-brand-100">
                {clientWorkTasks.map((t) => (
                  <li key={t.id} className="py-3 flex items-start gap-3">
                    <span className="shrink-0 mt-0.5">
                      {t.status === 'done' ? (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      ) : (
                        <Circle className="w-4 h-4 text-brand-400" />
                      )}
                    </span>
                    <button
                      type="button"
                      onClick={() => setDetailTask(t)}
                      className="text-left flex-1 min-w-0"
                    >
                      <span className={`font-medium text-primary block ${t.status === 'done' ? 'line-through text-brand-500' : ''}`}>
                        {t.title}
                      </span>
                      <span className="text-xs text-brand-500 flex items-center gap-1 mt-0.5">
                        <Clock size={12} />
                        {t.dueAt ? formatTaskDateTime(t.dueAt) : 'Sin fecha'}
                        {t.status === 'done' && <span className="text-green-600">· Completada</span>}
                      </span>
                    </button>
                    <RouterLink
                      to="/tasks"
                      className="shrink-0 text-xs font-semibold text-brand-600 hover:text-primary"
                    >
                      Abrir en Tasks
                    </RouterLink>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {addTaskModalOpen && (
        <TaskFormModal
          initialTask={null}
          defaultAssigneeUserId={user?.id ?? null}
          presetLink={{ entityType: 'client', entityId: id }}
          onClose={() => setAddTaskModalOpen(false)}
          onSaved={() => {
            refetch();
            setAddTaskModalOpen(false);
            toast.toast.success('Tarea creada');
          }}
        />
      )}

      {detailTask && (
        <TaskDetailDrawer
          task={detailTask}
          onClose={() => setDetailTask(null)}
          onEdit={() => {
            setDetailTask(null);
            navigate(`/tasks?open=${detailTask.id}`);
          }}
          onSaved={refetch}
        />
      )}
    </div>
  );
};

export default ClientDetailPage;
