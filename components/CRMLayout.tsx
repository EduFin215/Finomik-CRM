import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { NavLink, Link, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Table as TableIcon,
  Kanban,
  Calendar as CalendarIcon,
  Upload,
  Search,
  Bell,
  Settings,
  PlusCircle,
  LogOut,
  Home,
  Menu,
  X,
} from 'lucide-react';
import { School, Phase, CommercialStatus, TaskPriority } from '../types';
import { getSchools, createSchool, updateSchool as updateSchoolApi, deleteSchool, createTask } from '../services/schools';
import { isSupabaseConfigured } from '../services/supabase';
import { syncTaskToGoogleCalendar } from '../services/googleCalendar';
import { useUpcomingReminders, getUpcomingReminderItems } from '../hooks/useUpcomingReminders';
import { useReminderSettings } from '../hooks/useReminderSettings';
import SchoolDetail from './SchoolDetail';
import NewSchoolModal from './NewSchoolModal';
import { useToast } from '../context/ToastContext';
import { ToastContainer } from './ToastContainer';
import { CRMProvider, useCRM } from '../context/CRMContext';
import { useAuth } from '../hooks/useAuth';

function CRMLayoutInner() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
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

  return (
    <div className="flex h-full w-full overflow-hidden bg-white">
      {/* Overlay móvil cuando el menú está abierto */}
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Cerrar menú"
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
        />
      )}

      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-50 w-64 bg-primary text-white flex flex-col shrink-0
          transform transition-transform duration-200 ease-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        <div className="flex items-center justify-between p-4 lg:justify-center">
          <img src="/finomik-logo.png" alt="Finomik" className="h-8 w-auto object-contain" />
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-2 text-brand-200 hover:text-white rounded-lg"
            aria-label="Cerrar menú"
          >
            <X size={24} />
          </button>
        </div>
        <div className="px-4 pb-2 flex flex-col items-center gap-2">
          <span className="text-[10px] uppercase tracking-widest text-brand-200 font-body">CRM Educativo</span>
          <NavLink
            to="/"
            onClick={() => setSidebarOpen(false)}
            className="w-full flex items-center justify-center gap-2 py-2.5 mt-1 rounded-lg transition-colors text-sm font-bold text-brand-200 hover:text-white hover:bg-brand-600/80 border border-brand-600/50"
          >
            <Home size={18} />
            <span>Cambiar de herramienta</span>
          </NavLink>
        </div>
        {!isSupabaseConfigured() && (
          <div className="mx-4 mb-2 px-3 py-2 rounded-lg bg-amber-500/20 text-amber-200 text-xs font-body">
            Configura Supabase en .env para persistir datos.
          </div>
        )}
        <div className="px-4 mb-4">
          <button
            onClick={openNewSchoolModal}
            className="w-full flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-500 text-white py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-primary/30"
          >
            <PlusCircle size={20} />
            <span>Nuevo Centro</span>
          </button>
        </div>
        <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
          <NavLink
            to="/crm/dashboard"
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
              `w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors font-bold ${isActive ? 'bg-brand-600 text-white border-l-4 border-white rounded-l-none' : 'text-brand-200 hover:bg-brand-600/80'}`
            }
          >
            <LayoutDashboard size={20} />
            <span>Dashboard</span>
          </NavLink>
          <div className="pt-4 pb-2 px-4 text-[11px] font-bold text-brand-200 uppercase tracking-wider">Gestión de Pipeline</div>
          <NavLink
            to="/crm/pipeline"
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
              `w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors font-bold ${isActive ? 'bg-brand-600 text-white border-l-4 border-white rounded-l-none' : 'text-brand-200 hover:bg-brand-600/80'}`
            }
          >
            <Kanban size={20} />
            <span>Pipeline (Kanban)</span>
          </NavLink>
          <NavLink
            to="/crm/schools"
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
              `w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors font-bold ${isActive ? 'bg-brand-600 text-white border-l-4 border-white rounded-l-none' : 'text-brand-200 hover:bg-brand-600/80'}`
            }
          >
            <TableIcon size={20} />
            <span>Lista de Escuelas</span>
          </NavLink>
          <div className="pt-4 pb-2 px-4 text-[11px] font-bold text-brand-200 uppercase tracking-wider">Actividad</div>
          <NavLink
            to="/crm/calendar"
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
              `w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors font-bold ${
                isActive
                  ? 'bg-brand-600 text-white border-l-4 border-white rounded-l-none'
                  : 'text-brand-200 hover:bg-brand-600/80'
              }`
            }
          >
            <CalendarIcon size={20} />
            <span>Calendario</span>
          </NavLink>
          <NavLink
            to="/crm/import"
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
              `w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors font-bold ${isActive ? 'bg-brand-600 text-white border-l-4 border-white rounded-l-none' : 'text-brand-200 hover:bg-brand-600/80'}`
            }
          >
            <Upload size={20} />
            <span>Importar Excel</span>
          </NavLink>
        </nav>
        <div className="p-4 border-t border-brand-600">
          <NavLink
            to="/crm/settings"
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
              `w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors font-bold ${isActive ? 'bg-brand-600 text-white border-l-4 border-white rounded-l-none' : 'text-brand-200 hover:bg-brand-600/80'}`
            }
          >
            <Settings size={20} />
            <span>Configuración</span>
          </NavLink>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-full overflow-hidden min-w-0">
        <header className="relative z-[30] h-14 sm:h-16 bg-gradient-to-b from-primary/5 to-white border-b border-brand-200 flex items-center justify-between gap-2 px-3 sm:px-6 lg:px-8 shrink-0">
          <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 text-brand-500 hover:bg-brand-100/50 rounded-lg shrink-0"
              aria-label="Abrir menú"
            >
              <Menu size={24} />
            </button>
            <div className="relative flex-1 min-w-0 max-w-xl">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-400 w-4 h-4 pointer-events-none" />
              <input
                type="text"
                placeholder="Buscar por nombre, ciudad..."
                className="w-full pl-10 pr-3 sm:pr-4 py-2 bg-brand-100/50 border-transparent focus:bg-white focus:border-primary rounded-lg text-sm transition-all outline-none font-body text-primary placeholder:text-brand-400"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          <div className="flex items-center gap-1 sm:gap-4 shrink-0">
            <Link
              to="/"
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-brand-600 hover:bg-brand-100/50 hover:text-primary font-bold text-sm transition-colors border border-transparent hover:border-brand-200"
              title="Volver a la selección de herramientas"
            >
              <Home size={18} />
              <span className="hidden sm:inline">Cambiar de herramienta</span>
            </Link>
            <NotificationsDropdown
              upcomingReminders={upcomingReminders}
              onSelectSchool={setSelectedSchoolId}
              onGoToCalendar={() => navigate('/crm/calendar')}
            />
            <div className="flex items-center gap-3 pl-2">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold text-primary">{user?.email ?? 'Usuario'}</p>
                <p className="mt-1 inline-flex items-center gap-1 rounded-full bg-primary text-white px-2 py-0.5 text-[10px] font-bold tracking-wide">
                  <span className="w-1.5 h-1.5 rounded-full bg-white/80" />
                  CRM Finomik
                </p>
              </div>
              <button
                type="button"
                onClick={() => signOut()}
                className="flex items-center gap-2 px-3 py-2 text-brand-500 hover:bg-brand-100/50 hover:text-primary rounded-lg text-sm font-body transition-colors"
                title="Cerrar sesión"
              >
                <LogOut size={18} />
                <span className="hidden sm:inline">Cerrar sesión</span>
              </button>
            </div>
          </div>
        </header>

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

      {selectedSchool && (
        <SchoolDetail
          school={selectedSchool}
          onClose={() => setSelectedSchoolId(null)}
          onUpdate={updateSchool}
          onDelete={isSupabaseConfigured() ? deleteSchoolFromContext : undefined}
          refetchSchools={refetchSchools}
        />
      )}
    </div>
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
    <div className="relative flex items-center gap-2 pr-4 border-r border-brand-200">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="p-2 text-brand-500 hover:bg-brand-100/50 rounded-full relative transition-colors"
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
          <div className="fixed inset-0 z-40" aria-hidden onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-[min(20rem,calc(100vw-2rem))] max-h-[70vh] overflow-y-auto bg-white rounded-xl border border-brand-200 shadow-lg z-50 py-2">
            <div className="px-4 py-2 border-b border-brand-100">
              <h3 className="font-bold text-primary text-sm">Notificaciones</h3>
            </div>
            {upcomingReminders.length === 0 ? (
              <p className="px-4 py-6 text-brand-500 text-sm font-body">No hay notificaciones próximas.</p>
            ) : (
              <ul className="py-2">
                {upcomingReminders.map((item) => (
                  <li key={`${item.schoolId}-${item.at.getTime()}-${item.title}`} className="px-4 py-2 hover:bg-brand-100/30">
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
            <div className="border-t border-brand-100 px-4 py-2">
              <button type="button" onClick={() => { onGoToCalendar(); setOpen(false); }} className="text-sm font-bold text-brand-600 hover:text-primary">
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
    if (!isSupabaseConfigured()) return;
    const result = await createSchool(newSchool);
    if (!result) {
      toast.toast.error('No se pudo crear el centro');
      return;
    }
    refetchSchools();
    setIsNewSchoolModalOpen(false);
    toast.toast.success('Centro creado');
  };

  const handleImportedSchools = async (processedSchools: School[]) => {
    if (!isSupabaseConfigured()) return;
    let failed = 0;
    for (const school of processedSchools) {
      const result = await createSchool(school);
      if (!result) failed++;
    }
    refetchSchools();
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
    navigate(tab === 'table' ? '/crm/schools' : '/crm/pipeline');
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
