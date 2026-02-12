import React, { useState, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { School, Phase, CommercialStatus, Activity, Task, TaskPriority } from '../types';
import { PHASE_COLORS, STATUS_COLORS, PRIORITY_COLORS } from '../constants';
import { addActivity as addActivityApi, createTask as createTaskApi, updateTask } from '../services/schools';
import { getProfiles } from '../services/profiles';
import { getAuditLogBySchool } from '../services/audit';
import { isSupabaseConfigured } from '../services/supabase';
import { isGoogleCalendarConfigured, getStoredToken, syncTaskToGoogleCalendar } from '../services/googleCalendar';
import { useToast } from '../context/ToastContext';
import {
  X, Phone, Mail, MapPin, User, Calendar,
  MessageSquare, CheckCircle,
  Plus, Send, Clock,
  TrendingUp, Link2, ExternalLink, Copy
} from 'lucide-react';
import { getResourcesByEntity, createResource, linkExistingResource } from '../services/resources';
import { ResourceFormModal } from '../modules/resources/ResourceFormModal';
import { ResourceLinkModal } from '../modules/resources/ResourceLinkModal';
import type { ResourceFormState } from '../modules/resources/ResourceFormModal';
import type { ResourceWithLinks } from '../types';

function ResourceCard({ resource }: { resource: ResourceWithLinks }) {
  return (
    <div className="bg-white p-4 rounded-xl border border-brand-200/60 shadow-card flex items-center justify-between gap-3">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-primary truncate">{resource.title}</p>
        <p className="text-[10px] text-brand-500 font-body">{resource.type} · {resource.status}</p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button
          type="button"
          onClick={() => window.open(resource.url, '_blank')}
          className="p-1.5 rounded-xl text-brand-500 hover:bg-brand-100/50 transition-colors"
          title="Abrir"
        >
          <ExternalLink className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => navigator.clipboard.writeText(resource.url)}
          className="p-1.5 rounded-xl text-brand-500 hover:bg-brand-100/50 transition-colors"
          title="Copiar enlace"
        >
          <Copy className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

interface SchoolDetailProps {
  school: School;
  onClose: () => void;
  onUpdate: (school: School) => void;
  onDelete?: (schoolId: string) => void;
  refetchSchools?: () => void;
}

const SchoolDetail: React.FC<SchoolDetailProps> = ({ school, onClose, onUpdate, onDelete, refetchSchools }) => {
  const toast = useToast();
  const queryClient = useQueryClient();
  const { data: profiles = [] } = useQuery({ queryKey: ['profiles'], queryFn: getProfiles, enabled: isSupabaseConfigured() });
  const { data: auditLog = [] } = useQuery({
    queryKey: ['audit', school.id],
    queryFn: () => getAuditLogBySchool(school.id),
    enabled: isSupabaseConfigured() && activeTab === 'audit',
  });
  const { data: resourcesByEntity = { primary: [], others: [] } } = useQuery({
    queryKey: ['resourcesByEntity', 'client', school.id],
    queryFn: () => getResourcesByEntity('client', school.id),
    enabled: isSupabaseConfigured() && activeTab === 'resources',
  });
  const [activeTab, setActiveTab] = useState<'info' | 'negotiation' | 'tasks' | 'history' | 'audit' | 'resources'>('info');
  const [notesText, setNotesText] = useState(school.notes);
  const [newActivity, setNewActivity] = useState('');
  const [activityType, setActivityType] = useState<'Llamada' | 'Email' | 'Reunión' | 'Nota'>('Nota');
  const [showFollowUpModal, setShowFollowUpModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showUnsavedNotesConfirm, setShowUnsavedNotesConfirm] = useState(false);
  const [showResourceForm, setShowResourceForm] = useState(false);
  const [showResourceLinkModal, setShowResourceLinkModal] = useState(false);

  useEffect(() => {
    setNotesText(school.notes);
  }, [school.id, school.notes]);
  const [followUpData, setFollowUpData] = useState<{
    title: string;
    date: string;
    time: string;
    priority: TaskPriority;
    isMeeting: boolean;
    addToGoogleCalendar: boolean;
  }>({
    title: '',
    date: new Date().toISOString().split('T')[0],
    time: '10:00',
    priority: TaskPriority.HIGH,
    isMeeting: false,
    addToGoogleCalendar: false
  });

  const handleStatusChange = (status: CommercialStatus) => {
    onUpdate({ ...school, status });
  };

  const handlePhaseChange = (phase: Phase) => {
    onUpdate({ ...school, phase });
  };

  const addActivity = async () => {
    if (!newActivity.trim()) return;

    const activity: Activity = {
      id: Date.now().toString(),
      type: activityType,
      description: newActivity,
      date: new Date().toISOString().split('T')[0]
    };

    if (isSupabaseConfigured() && refetchSchools) {
      const created = await addActivityApi(school.id, { type: activity.type, description: activity.description, date: activity.date });
      if (!created) {
        toast.toast.error('No se pudo añadir la actividad');
        return;
      }
      refetchSchools();
      if (activityType === 'Reunión') {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        setFollowUpData(prev => ({
          ...prev,
          title: `Follow up: ${newActivity}`,
          date: tomorrow.toISOString().split('T')[0],
          time: '10:00',
          priority: TaskPriority.HIGH,
          isMeeting: false
        }));
        setNewActivity('');
        setShowFollowUpModal(true);
      } else {
        setNewActivity('');
      }
      return;
    }

    const updatedActivities = [activity, ...school.activities];
    if (activityType === 'Reunión') {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setFollowUpData({
        title: `Follow up: ${newActivity}`,
        date: tomorrow.toISOString().split('T')[0],
        time: '10:00',
        priority: TaskPriority.HIGH,
        isMeeting: false
      });
      onUpdate({ ...school, activities: updatedActivities });
      setNewActivity('');
      setShowFollowUpModal(true);
    } else {
      onUpdate({ ...school, activities: updatedActivities });
      setNewActivity('');
    }
  };

  const setQuickDate = (days: number) => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    setFollowUpData(prev => ({
      ...prev,
      date: date.toISOString().split('T')[0]
    }));
  };

  const saveFollowUpTask = async () => {
    if (!followUpData.title.trim()) return;
    const newTask: Task = {
      id: `task-${Date.now()}`,
      schoolId: school.id,
      title: followUpData.title,
      dueDate: followUpData.date,
      dueTime: followUpData.time,
      priority: followUpData.priority,
      completed: false,
      assignedTo: 'Current User',
      isMeeting: followUpData.isMeeting
    };
    if (isSupabaseConfigured() && refetchSchools) {
      const created = await createTaskApi(newTask);
      if (!created) {
        toast.toast.error('No se pudo crear la tarea');
        return;
      }
      refetchSchools();
      if (followUpData.addToGoogleCalendar && (isGoogleCalendarConfigured() || getStoredToken())) {
        await syncTaskToGoogleCalendar(
          newTask.title,
          newTask.dueDate,
          newTask.dueTime,
          school.name,
          newTask.isMeeting
        );
      }
      setShowFollowUpModal(false);
      setActiveTab('tasks');
      return;
    }
    onUpdate({
      ...school,
      tasks: [newTask, ...school.tasks]
    });
    setShowFollowUpModal(false);
    setActiveTab('tasks');
  };

  const toggleTask = async (taskId: string) => {
    const task = school.tasks.find(t => t.id === taskId);
    if (!task) return;
    if (isSupabaseConfigured() && refetchSchools) {
      const updated = await updateTask(taskId, { completed: !task.completed });
      if (updated) refetchSchools();
      else toast.toast.error('No se pudo actualizar la tarea');
      return;
    }
    onUpdate({
      ...school,
      tasks: school.tasks.map(t => t.id === taskId ? { ...t, completed: !t.completed } : t)
    });
  };

  const handleRequestClose = useCallback(() => {
    if (notesText.trim() !== (school.notes || '').trim()) {
      setShowUnsavedNotesConfirm(true);
    } else {
      onClose();
    }
  }, [notesText, school.notes, onClose]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleRequestClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleRequestClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="school-detail-title"
      className="fixed inset-0 bg-primary/40 backdrop-blur-sm z-50 flex justify-end"
      onClick={handleRequestClose}
    >
      <div
        className="w-full max-w-2xl bg-white h-full shadow-2xl overflow-hidden flex flex-col relative"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-primary text-white p-6 relative">
          <button onClick={handleRequestClose} className="absolute top-6 right-6 text-brand-200 hover:text-white transition-colors" aria-label="Cerrar">
            <X size={24} />
          </button>

          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 bg-brand-600 rounded-2xl flex items-center justify-center font-extrabold text-2xl">
              {school.name.charAt(0)}
            </div>
            <div>
              <h2 id="school-detail-title" className="text-2xl font-bold">{school.name}</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${PHASE_COLORS[school.phase]} bg-transparent`}>
                  {school.phase}
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${STATUS_COLORS[school.status]}`}>
                  {school.status}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs font-bold text-brand-200 mt-6">
            <div className="flex items-center gap-2"><MapPin size={14} className="text-brand-300" /> {school.city}, {school.region}</div>
            <div className="flex items-center gap-2"><User size={14} className="text-brand-300" /> {school.contactPerson} ({school.role})</div>
          </div>
        </div>

        <div className="flex border-b border-brand-200 px-6 overflow-x-auto">
          {(['info', 'negotiation', 'tasks', 'history', 'audit', 'resources'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-4 text-sm font-bold border-b-2 transition-all shrink-0 ${activeTab === tab ? 'border-brand-600 text-brand-600' : 'border-transparent text-brand-500 hover:text-primary'}`}
            >
              {tab === 'info' && 'Ficha General'}
              {tab === 'negotiation' && 'Seguimiento'}
              {tab === 'tasks' && 'Tareas'}
              {tab === 'history' && 'Historial'}
              {tab === 'audit' && 'Auditoría'}
              {tab === 'resources' && 'Resources'}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-brand-100/20">
          {activeTab === 'info' && (
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-xl border border-brand-200 shadow-sm space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-[10px] font-bold text-brand-400 uppercase block mb-1">Teléfono</label>
                    <div className="flex items-center gap-2 text-primary font-bold">
                      <Phone size={14} className="text-brand-400" /> {school.phone}
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-brand-400 uppercase block mb-1">Email Principal</label>
                    <div className="flex items-center gap-2 text-primary font-bold overflow-hidden">
                      <Mail size={14} className="text-brand-400 shrink-0" /> <span className="truncate">{school.email}</span>
                    </div>
                  </div>
                </div>

                <hr className="border-brand-100" />

                <div>
                  <label className="text-[10px] font-bold text-brand-400 uppercase block mb-2">Cambiar Fase del Pipeline</label>
                  <div className="flex flex-wrap gap-2">
                    {Object.values(Phase).map(p => (
                      <button
                        key={p}
                        onClick={() => handlePhaseChange(p)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${school.phase === p ? 'bg-primary text-white border-primary' : 'bg-white text-brand-500 border-brand-200 hover:border-brand-400'}`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-brand-400 uppercase block mb-2">Cambiar Estado Comercial</label>
                  <div className="flex flex-wrap gap-2">
                    {Object.values(CommercialStatus).filter(s => s !== CommercialStatus.NONE).map(s => (
                      <button
                        key={s}
                        onClick={() => handleStatusChange(s)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${school.status === s ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-brand-500 border-brand-200 hover:border-brand-400'}`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                {isSupabaseConfigured() && profiles.length > 0 && (
                  <div>
                    <label className="text-[10px] font-bold text-brand-400 uppercase block mb-2">Asignado a</label>
                    <select
                      value={school.assignedToId ?? ''}
                      onChange={(e) => onUpdate({ ...school, assignedToId: e.target.value || null })}
                      className="w-full max-w-xs p-2 rounded-lg border border-brand-200 text-sm font-body text-primary focus:ring-2 focus:ring-brand-100 outline-none"
                    >
                      <option value="">Sin asignar</option>
                      {profiles.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.displayName || p.email || p.id.slice(0, 8)}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="bg-white p-6 rounded-xl border border-brand-200 shadow-sm">
                <label className="text-[10px] font-bold text-brand-400 uppercase block mb-3">Notas Internas</label>
                  <textarea
                  className="w-full bg-brand-100/30 p-4 rounded-xl text-sm text-primary border border-brand-100 focus:outline-none focus:border-brand-400 focus:bg-white transition-all min-h-[120px] font-body"
                  placeholder="Escribe detalles adicionales sobre este centro..."
                  value={notesText}
                  onChange={(e) => setNotesText(e.target.value)}
                />
              </div>
            </div>
          )}

          {activeTab === 'negotiation' && (
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-xl border border-brand-200 shadow-sm">
                <h3 className="text-primary font-bold mb-4 flex items-center gap-2">
                  <TrendingUp size={18} className="text-brand-600" /> Hitos de Negociación
                </h3>
                <div className="space-y-3">
                  {['Presentación inicial', 'Demo enviada', 'Propuesta económica', 'Decisión dirección'].map((milestone) => (
                    <div key={milestone} className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={school.milestones.includes(milestone)}
                        onChange={() => {
                          const newMilestones = school.milestones.includes(milestone)
                            ? school.milestones.filter(m => m !== milestone)
                            : [...school.milestones, milestone];
                          onUpdate({ ...school, milestones: newMilestones });
                        }}
                        className="w-4 h-4 rounded border-brand-300 text-brand-600 focus:ring-primary"
                      />
                      <span className={`text-sm font-body ${school.milestones.includes(milestone) ? 'text-brand-400 line-through' : 'text-primary font-bold'}`}>
                        {milestone}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-xs font-bold text-brand-400 uppercase tracking-widest">Actividad de Seguimiento</h4>
                <div className="space-y-3">
                  {school.activities.filter(a => ['Llamada', 'Reunión'].includes(a.type)).map(activity => (
                    <div key={activity.id} className="bg-white p-4 rounded-xl border border-brand-200 flex gap-4">
                      <div className={`p-2 rounded-lg shrink-0 ${activity.type === 'Llamada' ? 'bg-orange-50 text-orange-600' : 'bg-purple-50 text-purple-600'}`}>
                        {activity.type === 'Llamada' ? <Phone size={16} /> : <MessageSquare size={16} />}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-primary">{activity.description}</p>
                        <p className="text-[10px] text-brand-400 mt-1 font-body">{activity.date} • {activity.type}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'tasks' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-bold text-brand-400 uppercase tracking-widest">Tareas Pendientes</h4>
                <button
                  type="button"
                  onClick={() => {
                    setFollowUpData({
                      title: '',
                      date: new Date().toISOString().split('T')[0],
                      time: '10:00',
                      priority: TaskPriority.MEDIUM,
                      isMeeting: false,
                      addToGoogleCalendar: false
                    });
                    setShowFollowUpModal(true);
                  }}
                  className="text-brand-600 text-xs font-bold flex items-center gap-1 hover:underline"
                >
                  <Plus size={14} /> Nueva Tarea
                </button>
              </div>
              <div className="space-y-2">
                {school.tasks.map(task => (
                  <div
                    key={task.id}
                    className={`p-4 rounded-xl border bg-white flex items-center gap-4 transition-all ${task.completed ? 'opacity-60 border-brand-100' : 'border-brand-200 hover:border-brand-400'}`}
                  >
                    <button
                      onClick={() => toggleTask(task.id)}
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${task.completed ? 'bg-green-500 border-green-500 text-white' : 'border-brand-200'}`}
                    >
                      {task.completed && <CheckCircle size={14} />}
                    </button>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className={`text-sm font-bold ${task.completed ? 'line-through text-brand-400' : 'text-primary'}`}>{task.title}</p>
                        {task.isMeeting && <span className="bg-purple-100 text-purple-700 text-[9px] font-bold px-1.5 py-0.5 rounded">Reunión</span>}
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-[10px] text-brand-400 flex items-center gap-1 font-body"><Calendar size={12} /> {task.dueDate} {task.dueTime ? `@ ${task.dueTime}` : ''}</span>
                        <span className={`text-[10px] font-bold uppercase ${PRIORITY_COLORS[task.priority]}`}>{task.priority}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'resources' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-xs font-bold text-brand-400 uppercase tracking-widest">Resources</h4>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowResourceLinkModal(true)}
                    className="text-brand-600 text-xs font-bold flex items-center gap-1 hover:underline"
                  >
                    <Link2 size={14} /> Link existing resource
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowResourceForm(true)}
                    className="text-brand-600 text-xs font-bold flex items-center gap-1 hover:underline"
                  >
                    <Plus size={14} /> Add new resource
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h5 className="text-[10px] font-bold text-brand-500 uppercase mb-2">Primary resources</h5>
                  {resourcesByEntity.primary.length === 0 ? (
                    <p className="text-brand-500 text-xs font-body">No hay recursos marcados como principales.</p>
                  ) : (
                    <div className="space-y-2">
                      {resourcesByEntity.primary.map((r) => (
                        <ResourceCard key={r.id} resource={r} />
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <h5 className="text-[10px] font-bold text-brand-500 uppercase mb-2">All linked resources</h5>
                  {resourcesByEntity.others.length === 0 && resourcesByEntity.primary.length === 0 ? (
                    <p className="text-brand-500 text-xs font-body">No hay recursos vinculados a este cliente.</p>
                  ) : (
                    <div className="space-y-2">
                      {resourcesByEntity.others.map((r) => (
                        <ResourceCard key={r.id} resource={r} />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'audit' && (
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-xl border border-brand-200 shadow-sm">
                <h3 className="font-bold text-primary mb-4">Registro de cambios</h3>
                {auditLog.length === 0 ? (
                  <p className="text-brand-500 font-body text-sm">No hay registros de auditoría para este centro.</p>
                ) : (
                  <ul className="space-y-3">
                    {auditLog.map((entry) => (
                      <li key={entry.id} className="flex flex-col gap-1 py-2 border-b border-brand-100 last:border-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold uppercase text-brand-500">{entry.action}</span>
                          <span className="text-[10px] text-brand-400 font-body">
                            {new Date(entry.createdAt).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })}
                          </span>
                        </div>
                        {entry.action === 'updated' && entry.oldData && entry.newData && (
                          <div className="text-xs font-body text-brand-600">
                            {['phase', 'status', 'name', 'email'].map((field) => {
                              const oldVal = (entry.oldData as Record<string, unknown>)[field];
                              const newVal = (entry.newData as Record<string, unknown>)[field];
                              if (oldVal !== newVal)
                                return (
                                  <span key={field} className="block">
                                    {field === 'phase' && 'Fase'}
                                    {field === 'status' && 'Estado'}
                                    {field === 'name' && 'Nombre'}
                                    {field === 'email' && 'Email'}: {String(oldVal)} → {String(newVal)}
                                  </span>
                                );
                              return null;
                            })}
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-6">
              <div className="bg-white p-4 rounded-xl border border-brand-200">
                <div className="flex flex-col gap-3">
                  <div className="flex gap-2">
                    <select
                      value={activityType}
                      onChange={(e) => setActivityType(e.target.value as Activity['type'])}
                      className="bg-brand-100 border-none text-xs font-bold text-primary px-3 py-2 rounded-lg focus:ring-2 focus:ring-brand-100 outline-none"
                    >
                      <option value="Nota">Nota</option>
                      <option value="Llamada">Llamada</option>
                      <option value="Email">Email</option>
                      <option value="Reunión">Reunión</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="text"
                      placeholder={`Registrar nueva ${activityType.toLowerCase()}...`}
                      className="flex-1 bg-brand-100/30 border-none px-4 py-2 rounded-lg text-sm font-body text-primary focus:bg-white focus:ring-2 focus:ring-brand-100 transition-all outline-none"
                      value={newActivity}
                      onChange={(e) => setNewActivity(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && addActivity()}
                    />
                    <button
                      onClick={addActivity}
                      className="bg-primary text-white p-2 rounded-lg hover:bg-brand-600 transition-all"
                    >
                      <Send size={18} />
                    </button>
                  </div>
                </div>
              </div>

              <div className="relative pl-6 space-y-8 before:content-[''] before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-brand-200">
                {school.activities.map((activity) => (
                  <div key={activity.id} className="relative">
                    <div className={`absolute -left-[23px] top-1 w-5 h-5 rounded-full border-4 border-brand-200 ${activity.type === 'Reunión' ? 'bg-purple-500' : 'bg-white'}`}></div>
                    <div className="bg-white p-4 rounded-xl border border-brand-200 shadow-sm">
                      <div className="flex justify-between items-start mb-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest ${
                          activity.type === 'Reunión' ? 'bg-purple-100 text-purple-600' :
                            activity.type === 'Llamada' ? 'bg-orange-100 text-orange-600' : 'bg-brand-100 text-brand-500'
                        }`}>
                          {activity.type}
                        </span>
                        <span className="text-[10px] text-brand-400 font-body">{activity.date}</span>
                      </div>
                      <p className="text-sm text-primary leading-relaxed font-body">{activity.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-brand-200 bg-white flex items-center justify-between">
          {onDelete ? (
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="text-red-500 text-xs font-bold hover:underline"
            >
              Eliminar Escuela
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => onUpdate({ ...school, notes: notesText })}
              className="px-6 py-2 rounded-lg bg-brand-600 text-white font-bold text-sm hover:bg-primary transition-all shadow-md"
            >
              Guardar Cambios
            </button>
          </div>
        </div>

        {showFollowUpModal && (
          <div className="absolute inset-0 z-10 bg-primary/50 backdrop-blur-sm flex items-center justify-center p-6">
            <div className="bg-white w-full rounded-3xl shadow-2xl p-6 space-y-6 border border-brand-200 max-w-md">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-purple-600">
                  <div className="bg-purple-100 p-2 rounded-xl">
                    <Calendar className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-lg text-primary leading-none">Agendar Seguimiento</h3>
                    <p className="text-[10px] text-brand-500 font-body mt-1 uppercase tracking-wide">Planificación de Ventas</p>
                  </div>
                </div>
                <button onClick={() => setShowFollowUpModal(false)} className="text-brand-400 hover:text-primary"><X size={20} /></button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-brand-500 uppercase block mb-1">Título del Evento / Tarea</label>
                  <input
                    value={followUpData.title}
                    onChange={(e) => setFollowUpData({ ...followUpData, title: e.target.value })}
                    className="w-full p-3 bg-brand-100/30 border border-brand-200 rounded-xl text-sm font-body text-primary focus:ring-2 focus:ring-brand-100 outline-none"
                  />
                </div>

                <div className="bg-brand-100/30 p-4 rounded-xl border border-brand-100">
                  <div className="flex justify-between items-center mb-3">
                    <label className="text-[10px] font-bold text-brand-500 uppercase">Fecha y Hora</label>
                    <div className="flex gap-1">
                      <button type="button" onClick={() => setQuickDate(1)} className="text-[10px] bg-white border border-brand-200 px-2 py-1 rounded-md hover:border-brand-400 transition-colors">+1 Día</button>
                      <button type="button" onClick={() => setQuickDate(3)} className="text-[10px] bg-white border border-brand-200 px-2 py-1 rounded-md hover:border-brand-400 transition-colors">+3 Días</button>
                      <button type="button" onClick={() => setQuickDate(7)} className="text-[10px] bg-white border border-brand-200 px-2 py-1 rounded-md hover:border-brand-400 transition-colors">+1 Sem</button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="date"
                      value={followUpData.date}
                      onChange={(e) => setFollowUpData({ ...followUpData, date: e.target.value })}
                      className="w-full p-2 bg-white border border-brand-200 rounded-lg text-sm font-body text-primary focus:ring-2 focus:ring-brand-100 outline-none"
                    />
                    <input
                      type="time"
                      value={followUpData.time}
                      onChange={(e) => setFollowUpData({ ...followUpData, time: e.target.value })}
                      className="w-full p-2 bg-white border border-brand-200 rounded-lg text-sm font-body text-primary focus:ring-2 focus:ring-brand-100 outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-brand-500 uppercase block mb-1">Tipo</label>
                    <div className="flex bg-brand-100/30 p-1 rounded-lg border border-brand-200">
                      <button
                        type="button"
                        onClick={() => setFollowUpData({ ...followUpData, isMeeting: false })}
                        className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${!followUpData.isMeeting ? 'bg-white shadow-sm text-primary' : 'text-brand-400'}`}
                      >
                        Tarea
                      </button>
                      <button
                        type="button"
                        onClick={() => setFollowUpData({ ...followUpData, isMeeting: true })}
                        className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${followUpData.isMeeting ? 'bg-white shadow-sm text-purple-600' : 'text-brand-400'}`}
                      >
                        Reunión
                      </button>
                    </div>
                  </div>
                            <div>
                                <label className="text-[10px] font-bold text-brand-500 uppercase block mb-1">Prioridad</label>
                                <select
                                    value={followUpData.priority}
                                    onChange={(e) => setFollowUpData({ ...followUpData, priority: e.target.value as TaskPriority })}
                                    className="w-full p-2 bg-brand-100/30 border border-brand-200 rounded-lg text-sm font-body text-primary focus:ring-2 focus:ring-brand-100 outline-none h-[38px]"
                                >
                                    {Object.values(TaskPriority).map(p => <option key={p} value={p}>{p}</option>)}
                                </select>
                            </div>
                        </div>
                        {isGoogleCalendarConfigured() && (
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="addToGoogle"
                                    checked={followUpData.addToGoogleCalendar}
                                    onChange={(e) => setFollowUpData({ ...followUpData, addToGoogleCalendar: e.target.checked })}
                                    className="w-4 h-4 rounded border-brand-300 text-brand-600 focus:ring-primary"
                                />
                                <label htmlFor="addToGoogle" className="text-sm font-body text-primary">Añadir a Google Calendar (recibirás recordatorios de Google)</label>
                            </div>
                        )}
                    </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={saveFollowUpTask}
                  className="w-full py-3 bg-primary text-white font-bold text-sm rounded-xl hover:bg-brand-600 transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
                >
                  <Calendar size={16} />
                  {followUpData.isMeeting ? 'Agendar Reunión' : 'Guardar Tarea'}
                </button>
              </div>
            </div>
          </div>
        )}

        {showResourceForm && (
          <ResourceFormModal
            isOpen={showResourceForm}
            onClose={() => setShowResourceForm(false)}
            onSave={async (form: ResourceFormState) => {
              await createResource({
                title: form.title.trim(),
                url: form.url.trim(),
                type: form.type,
                source: form.source,
                status: form.status,
                version: form.version || null,
                description: form.description || null,
                linkTo: { entityType: 'client', entityId: school.id },
                isPrimary: form.isPrimary,
              });
              queryClient.invalidateQueries({ queryKey: ['resourcesByEntity', 'client', school.id] });
              queryClient.invalidateQueries({ queryKey: ['resources'], exact: false });
            }}
            presetEntity={{ entityType: 'client', entityId: school.id }}
          />
        )}

        {showResourceLinkModal && (
          <ResourceLinkModal
            isOpen={showResourceLinkModal}
            onClose={() => setShowResourceLinkModal(false)}
            onLink={async (resourceId, isPrimary) => {
              await linkExistingResource(resourceId, 'client', school.id, isPrimary);
              queryClient.invalidateQueries({ queryKey: ['resourcesByEntity', 'client', school.id] });
              queryClient.invalidateQueries({ queryKey: ['resources'], exact: false });
            }}
            entityType="client"
            entityId={school.id}
          />
        )}

        {showDeleteConfirm && (
          <div className="absolute inset-0 z-20 bg-primary/50 backdrop-blur-sm flex items-center justify-center p-6">
            <div className="bg-white rounded-2xl shadow-xl border border-brand-200 p-6 max-w-md w-full">
              <h3 className="font-bold text-primary text-lg mb-2">Eliminar centro</h3>
              <p className="text-brand-500 font-body text-sm mb-6">
                ¿Eliminar este centro y todo su historial? Esta acción no se puede deshacer.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 rounded-lg font-bold text-brand-600 hover:bg-brand-100/50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onDelete?.(school.id);
                    onClose();
                    setShowDeleteConfirm(false);
                  }}
                  className="px-4 py-2 rounded-lg font-bold text-white bg-red-500 hover:bg-red-600 transition-colors"
                >
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        )}

        {showUnsavedNotesConfirm && (
          <div className="absolute inset-0 z-20 bg-primary/50 backdrop-blur-sm flex items-center justify-center p-6">
            <div className="bg-white rounded-2xl shadow-xl border border-brand-200 p-6 max-w-md w-full">
              <h3 className="font-bold text-primary text-lg mb-2">Cambios sin guardar</h3>
              <p className="text-brand-500 font-body text-sm mb-6">
                Tienes cambios sin guardar en las notas. ¿Cerrar de todos modos?
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setShowUnsavedNotesConfirm(false)}
                  className="px-4 py-2 rounded-lg font-bold text-brand-600 hover:bg-brand-100/50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowUnsavedNotesConfirm(false);
                    onClose();
                  }}
                  className="px-4 py-2 rounded-lg font-bold text-white bg-primary hover:bg-brand-600 transition-colors"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SchoolDetail;
