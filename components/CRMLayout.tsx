import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Table as TableIcon,
  Kanban,
  Briefcase,
  FolderOpen,
  Upload,
  Search,
  Bell,
  Settings,
  PlusCircle,
  Menu,
  CheckSquare,
} from 'lucide-react';
import { School, Phase, CommercialStatus, TaskPriority } from '../types';
import { getSchools, createSchool, updateSchool as updateSchoolApi, deleteSchool, createTask } from '../services/schools';
import { ensureSchoolFoldersExist } from '../services/resourceFolders';
import { isSupabaseConfigured } from '../services/supabase';
import { syncTaskToGoogleCalendar } from '../services/googleCalendar';
import { useUpcomingReminders, getUpcomingReminderItems } from '../hooks/useUpcomingReminders';
import { useReminderSettings } from '../hooks/useReminderSettings';
import NewSchoolModal from './NewSchoolModal';
import { ToolLayout } from './layout/ToolLayout';
import { SidebarNav } from './layout/SidebarNav';
import { useToast } from '../context/ToastContext';
import { ToastContainer } from './ToastContainer';
import { CRMProvider, useCRM } from '../context/CRMContext';
import { useAuth } from '../hooks/useAuth';
import { TOOLS } from '../config/tools';

const CRM_TOOL = TOOLS.find((t) => t.id === 'crm')!;

function CRMLayoutInner() {
  const navigate = useNavigate();
  const {
    schools,
    filteredSchools,
    isLoading,
    error,
    searchQuery,
    setSearchQuery,
    phaseFilter,
    statusFilter,
    togglePhaseFilter,
    toggleStatusFilter,
    selectedSchoolId,
    setSelectedSchoolId,
    refetchSchools,
    updateSchool,
    deleteSchool: deleteSchoolFromContext,
    reminderSettings,
    scheduleMeeting,
    handleImportedSchools,
    openNewSchoolModal,
  } = useCRM();

  const selectedSchool = selectedSchoolId ? schools.find((s) => s.id === selectedSchoolId) : null;
  const upcomingReminders = useMemo(
    () => getUpcomingReminderItems(schools, reminderSettings),
    [schools, reminderSettings]
  );
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const searchSlot = (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-400 w-4 h-4 pointer-events-none" />
      <input
        type="text"
        placeholder="Buscar por nombre, ciudad..."
        className="w-full pl-10 pr-4 py-2 bg-brand-100/50 border border-brand-200/60 rounded-lg text-sm text-primary placeholder:text-brand-400 font-body focus:bg-white focus:border-primary focus:outline-none transition-colors"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />
    </div>
  );

  const notificationsSlot = (
    <NotificationsDropdown
      upcomingReminders={upcomingReminders}
      onSelectSchool={(id) => navigate(`/crm/schools/${id}`)}
      onGoToCalendar={() => navigate('/crm/calendar')}
    />
  );

  return (
    <ToolLayout
      currentTool={CRM_TOOL}
      searchSlot={searchSlot}
      notificationsSlot={notificationsSlot}
    >
      <div className="flex h-full w-full overflow-hidden bg-white">
        <SidebarNav
          variant="dark"
          topSlot={
            <>
              {!isSupabaseConfigured() && (
                <div className="mb-2 px-3 py-2 rounded-lg bg-amber-500/20 text-amber-200 text-xs font-body">
                  Configura Supabase en .env para persistir datos.
                </div>
              )}
              <button
                type="button"
                onClick={() => openNewSchoolModal()}
                className="w-full flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-500 text-white py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-primary/30"
              >
                <PlusCircle size={20} />
                <span>Nuevo Lead</span>
              </button>
            </>
          }
          items={[
            { to: '/crm/dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { to: '/crm/leads', label: 'Escuelas', icon: TableIcon }, // Was "Leads"
          ]}
          groups={[
            {
              label: 'Flujos de Trabajo',
              items: [
                { to: '/crm/pipeline', label: 'Ventas', icon: Briefcase },
                { to: '/crm/onboarding', label: 'Onboarding y Clientes', icon: Kanban },
              ],
            },
            {
              label: 'Herramientas',
              items: [
                { to: '/crm/import', label: 'Importar Excel', icon: Upload },
              ],
            },
          ]}
          footerItems={[{ to: '/crm/settings', label: 'Configuración', icon: Settings }]}
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          onNavigate={() => setSidebarOpen(false)}
        />

        <main className="flex-1 flex flex-col h-full overflow-hidden min-w-0">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-brand-100 lg:hidden">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="p-2 text-brand-600 hover:bg-brand-100/50 rounded-xl shrink-0"
              aria-label="Abrir menú"
            >
              <Menu size={24} />
            </button>
          </div>
          <div className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
            {isLoading && (
              <div className="flex items-center justify-center py-20">
                <p className="text-brand-500 font-body">Cargando...</p>
              </div>
            )}
            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-red-700 text-sm font-body">
                Error al cargar datos. Revisa la consola y tu configuración de Supabase.
              </div>
            )}
            {!isLoading && !error && <Outlet />}
          </div>
        </main>

        <ToastContainer />
      </div>
    </ToolLayout>
  );
}

function NotificationsDropdown({
  upcomingReminders,
  onSelectSchool,
  onGoToCalendar,
}: {
  upcomingReminders: { title: string; at: Date; schoolName: string; schoolId: string }[];
  onSelectSchool: (id: string) => void;
  onGoToCalendar: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative flex items-center">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="relative p-2.5 rounded-lg text-brand-600 hover:bg-brand-100/50 transition-colors"
        aria-expanded={open}
        aria-label="Notificaciones"
      >
        <Bell size={20} />
        {upcomingReminders.length > 0 && (
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border-2 border-white" aria-hidden />
        )}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-[55]" aria-hidden onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 z-[60] w-[min(20rem,calc(100vw-2rem))] max-h-[70vh] overflow-y-auto bg-white/95 backdrop-blur-sm rounded-xl border border-brand-200/60 shadow-dropdown py-1">
            <div className="px-4 py-3 border-b border-brand-100">
              <h3 className="font-bold text-primary text-sm">Notificaciones</h3>
            </div>
            {upcomingReminders.length === 0 ? (
              <p className="px-4 py-6 text-brand-500 text-sm font-body">No hay notificaciones próximas.</p>
            ) : (
              <ul className="py-1">
                {upcomingReminders.map((item) => (
                  <li key={`${item.schoolId}-${item.at.getTime()}-${item.title}`} className="px-4 py-2 hover:bg-brand-100/50">
                    <p className="text-sm font-bold text-primary">{item.title}</p>
                    <p className="text-xs text-brand-500 font-body">
                      {item.schoolName} · {item.at.toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })}
                    </p>
                    <button
                      type="button"
                      className="mt-1 text-xs font-bold text-brand-600 hover:text-primary"
                      onClick={() => {
                        onSelectSchool(item.schoolId);
                        setOpen(false);
                      }}
                    >
                      Ver centro
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="border-t border-brand-100">
              <button type="button" onClick={() => { onGoToCalendar(); setOpen(false); }} className="w-full px-4 py-3 text-left text-sm font-bold text-brand-600 hover:bg-brand-100/50 transition-colors">
                Ir a Calendario
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function CRMLayout() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToast();
  const { data: schools = [], isLoading, error } = useQuery({ queryKey: ['schools'], queryFn: getSchools });
  const { settings: reminderSettings, updateSettings: updateReminderSettings } = useReminderSettings();
  const [searchQuery, setSearchQuery] = useState('');
  const [phaseFilter, setPhaseFilter] = useState<Phase[]>([]);
  const [statusFilter, setStatusFilter] = useState<CommercialStatus[]>([]);
  const [selectedSchoolId, setSelectedSchoolId] = useState<string | null>(null);
  const [isNewSchoolModalOpen, setIsNewSchoolModalOpen] = useState(false);

  useUpcomingReminders(schools, reminderSettings);

  const filteredSchools = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return schools.filter((s) => {
      const matchesSearch = !q ||
        s.name.toLowerCase().includes(q) ||
        s.city.toLowerCase().includes(q) ||
        s.region.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        s.contactPerson.toLowerCase().includes(q) ||
        (s.notes && s.notes.toLowerCase().includes(q));
      const matchesPhase = phaseFilter.length === 0 || phaseFilter.includes(s.phase);
      const matchesStatus = statusFilter.length === 0 || statusFilter.includes(s.status);
      return matchesSearch && matchesPhase && matchesStatus;
    });
  }, [schools, searchQuery, phaseFilter, statusFilter]);

  const refetchSchools = () => queryClient.invalidateQueries({ queryKey: ['schools'] });

  const updateSchool = async (updated: School) => {
    if (!isSupabaseConfigured()) return;
    const previous = queryClient.getQueryData<School[]>(['schools']);
    queryClient.setQueryData<School[]>(['schools'], (old) =>
      old?.map((s) => (s.id === updated.id ? { ...s, ...updated } : s)) ?? []
    );
    try {
      const result = await updateSchoolApi(updated.id, {
        name: updated.name,
        city: updated.city,
        region: updated.region,
        phone: updated.phone,
        email: updated.email,
        contactPerson: updated.contactPerson,
        role: updated.role,
        notes: updated.notes,
        phase: updated.phase,
        status: updated.status,
        milestones: updated.milestones,
      });
      if (result) {
        queryClient.setQueryData<School[]>(['schools'], (old) =>
          old?.map((s) => (s.id === result.id ? result : s)) ?? []
        );
        toast.toast.success('Guardado');
      }
    } catch {
      if (previous) queryClient.setQueryData(['schools'], previous);
      toast.toast.error('No se pudo guardar');
    }
  };

  const createSchoolHandler = async (newSchool: School) => {
    if (!isSupabaseConfigured()) {
      toast.toast.error('Configura Supabase en .env para crear leads.');
      return;
    }
    const result = await createSchool(newSchool);
    if (!result) {
      toast.toast.error('No se pudo crear el lead');
      return;
    }
    await ensureSchoolFoldersExist();
    refetchSchools();
    queryClient.invalidateQueries({ queryKey: ['resource_folders'] });
    queryClient.invalidateQueries({ queryKey: ['clients'] });
    setIsNewSchoolModalOpen(false);
    toast.toast.success('Lead creado');
  };

  const handleImportedSchools = async (processedSchools: School[]) => {
    if (!isSupabaseConfigured()) return;
    let failed = 0;
    for (const school of processedSchools) {
      const result = await createSchool(school);
      if (!result) failed++;
    }
    await ensureSchoolFoldersExist();
    refetchSchools();
    queryClient.invalidateQueries({ queryKey: ['resource_folders'] });
    if (failed > 0) toast.toast.error(`Importación: ${failed} de ${processedSchools.length} no se pudieron crear`);
    else toast.toast.success('Importación completada');
  };

  const deleteSchoolHandler = async (schoolId: string) => {
    if (!isSupabaseConfigured()) return;
    await deleteSchool(schoolId);
    setSelectedSchoolId(null);
    refetchSchools();
  };

  const navigateToView = (tab: 'table' | 'pipeline', filters?: { phase?: Phase[]; status?: CommercialStatus[] }) => {
    setPhaseFilter(filters?.phase ?? []);
    setStatusFilter(filters?.status ?? []);
    navigate(tab === 'table' ? '/crm/leads' : '/crm/pipeline');
  };

  const scheduleMeeting = async (
    schoolId: string,
    taskData: { title: string; dueDate: string; dueTime?: string },
    options?: { addToGoogleCalendar?: boolean }
  ) => {
    if (!isSupabaseConfigured()) return;
    const school = schools.find((s) => s.id === schoolId);
    const tempId = `temp-${Date.now()}`;
    const optimisticTask = {
      id: tempId,
      schoolId,
      title: taskData.title,
      dueDate: taskData.dueDate,
      dueTime: taskData.dueTime,
      priority: TaskPriority.MEDIUM,
      completed: false,
      assignedTo: 'Current User',
      isMeeting: true,
    };
    queryClient.setQueryData<School[]>(['schools'], (old) =>
      old?.map((s) => (s.id === schoolId ? { ...s, tasks: [...(s.tasks || []), optimisticTask] } : s)) ?? []
    );
    try {
      const created = await createTask({ ...optimisticTask, id: '' });
      if (created) {
        queryClient.setQueryData<School[]>(['schools'], (old) =>
          old?.map((s) =>
            s.id === schoolId ? { ...s, tasks: (s.tasks || []).map((t) => (t.id === tempId ? created : t)) } : s
          ) ?? []
        );
      }
      if (options?.addToGoogleCalendar && school) {
        await syncTaskToGoogleCalendar(taskData.title, taskData.dueDate, taskData.dueTime, school.name, true);
      }
    } catch {
      queryClient.setQueryData<School[]>(['schools'], (old) =>
        old?.map((s) => (s.id === schoolId ? { ...s, tasks: (s.tasks || []).filter((t) => t.id !== tempId) } : s)) ?? []
      );
    }
  };

  const contextValue: React.ComponentProps<typeof CRMProvider>['value'] = {
    schools,
    filteredSchools,
    isLoading,
    error: error ?? null,
    searchQuery,
    setSearchQuery,
    phaseFilter,
    statusFilter,
    togglePhaseFilter: (phase) => setPhaseFilter((prev) => (prev.includes(phase) ? prev.filter((p) => p !== phase) : [...prev, phase])),
    toggleStatusFilter: (status) => setStatusFilter((prev) => (prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status])),
    selectedSchoolId,
    setSelectedSchoolId,
    refetchSchools,
    updateSchool,
    createSchool: createSchoolHandler,
    deleteSchool: deleteSchoolHandler,
    navigateToView,
    reminderSettings,
    updateReminderSettings,
    scheduleMeeting,
    handleImportedSchools,
    openNewSchoolModal: () => setIsNewSchoolModalOpen(true),
  };

  return (
    <CRMProvider value={contextValue}>
      <CRMLayoutInner />
      {isNewSchoolModalOpen && (
        <NewSchoolModal
          onClose={() => setIsNewSchoolModalOpen(false)}
          onCreate={createSchoolHandler}
        />
      )}
    </CRMProvider>
  );
}
