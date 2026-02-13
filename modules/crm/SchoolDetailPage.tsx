import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { School, Phase, CommercialStatus, Activity, Task, TaskPriority } from '../../types';
import { PHASE_COLORS, STATUS_COLORS, PRIORITY_COLORS } from '../../constants';
import { getSchools, updateSchool, deleteSchool, addActivity as addActivityApi, createTask as createTaskApi, updateTask } from '../../services/schools';
import { getProfiles } from '../../services/profiles';
import { getAuditLogBySchool } from '../../services/audit';
import { isSupabaseConfigured } from '../../services/supabase';
import { isGoogleCalendarConfigured, getStoredToken, syncTaskToGoogleCalendar } from '../../services/googleCalendar';
import { useToast } from '../../context/ToastContext';
import {
    Phone, Mail, MapPin, User, Calendar,
    MessageSquare, CheckCircle,
    Plus, Send, ArrowLeft,
    TrendingUp, Link2, ExternalLink, Copy,
    FileText, Briefcase
} from 'lucide-react';
import { getResourcesByEntity, createResource, linkExistingResource } from '../../services/resources';
import { ResourceFormModal } from '../../modules/resources/ResourceFormModal';
import { ResourceLinkModal } from '../../modules/resources/ResourceLinkModal';
import { DateTimePicker } from '../../modules/tasks/DateTimePicker';
import { Select } from '../../modules/tasks/Select';
import { listFinanceContractsByClient } from '../../services/finance/contracts';
import { listFinanceInvoices } from '../../services/finance/invoices';
import { createFinanceContract, createFinanceInvoice } from '../../services/finance';
import { ContractFormModal, InvoiceFormModal, StatusBadge } from '../../modules/finance/components';
import { formatCurrency } from '../../modules/finance/formatCurrency';
import type { ResourceWithLinks, FinanceContract, FinanceInvoice } from '../../types';

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

export default function SchoolDetailPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const toast = useToast();
    const queryClient = useQueryClient();

    // Fetch School Data (we might need a specific getSchoolById, but finding in list works for now or we can use getSchools)
    const { data: schools = [], refetch: refetchSchools } = useQuery({
        queryKey: ['schools'],
        queryFn: getSchools,
    });

    const school = schools.find(s => s.id === id);

    const [activeTab, setActiveTab] = useState<'info' | 'negotiation' | 'tasks' | 'history' | 'audit' | 'resources' | 'finance'>('info');
    const [notesText, setNotesText] = useState('');
    const [newActivity, setNewActivity] = useState('');
    const [activityType, setActivityType] = useState<'Llamada' | 'Email' | 'Reunión' | 'Nota'>('Nota');
    const [showFollowUpModal, setShowFollowUpModal] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showResourceForm, setShowResourceForm] = useState(false);
    const [showResourceLinkModal, setShowResourceLinkModal] = useState(false);
    const [showContractModal, setShowContractModal] = useState(false);
    const [showInvoiceModal, setShowInvoiceModal] = useState(false);

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

    useEffect(() => {
        if (school) {
            setNotesText(school.notes || '');
        }
    }, [school]);

    const { data: profiles = [] } = useQuery({ queryKey: ['profiles'], queryFn: getProfiles, enabled: isSupabaseConfigured() });
    const { data: auditLog = [] } = useQuery({
        queryKey: ['audit', id],
        queryFn: () => getAuditLogBySchool(id!),
        enabled: isSupabaseConfigured() && !!id && activeTab === 'audit',
    });
    const { data: resourcesByEntity = { primary: [], others: [] } } = useQuery({
        queryKey: ['resourcesByEntity', 'client', id],
        queryFn: () => getResourcesByEntity('client', id!),
        enabled: isSupabaseConfigured() && !!id && activeTab === 'resources',
    });

    const { data: contracts = [] } = useQuery({
        queryKey: ['finance_contracts', id],
        queryFn: () => listFinanceContractsByClient(id!),
        enabled: isSupabaseConfigured() && !!id && activeTab === 'finance',
    });

    const contractIds = contracts.map(c => c.id);

    const { data: invoices = [] } = useQuery({
        queryKey: ['finance_invoices', id, contractIds],
        queryFn: () => listFinanceInvoices({ contractIds: contractIds.length > 0 ? contractIds : ['dummy'] }),
        enabled: isSupabaseConfigured() && !!id && activeTab === 'finance' && contractIds.length > 0,
    });

    if (!school) {
        return (
            <div className="flex items-center justify-center h-full">
                <p className="text-brand-muted">Cargando escuela o no encontrada...</p>
            </div>
        );
    }

    const handleUpdate = async (updatedSchool: School) => {
        if (isSupabaseConfigured()) {
            const success = await updateSchool(updatedSchool.id, updatedSchool);
            if (success) {
                toast.toast.success('Escuela actualizada');
                refetchSchools();
            } else {
                toast.toast.error('Error al actualizar');
            }
        } else {
            // Local update mock if needed, but in full app we mainly use Supabase
            // queryClient.setQueryData(['schools'], (old: School[]) => old.map(s => s.id === updatedSchool.id ? updatedSchool : s));
        }
    };

    const handleStatusChange = (status: CommercialStatus) => {
        handleUpdate({ ...school, status });
    };

    const handlePhaseChange = (phase: Phase) => {
        handleUpdate({ ...school, phase });
    };

    const addActivity = async () => {
        if (!newActivity.trim()) return;

        const activity: Activity = {
            id: Date.now().toString(),
            type: activityType,
            description: newActivity,
            date: new Date().toISOString().split('T')[0]
        };

        if (isSupabaseConfigured()) {
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
        }
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

        if (isSupabaseConfigured()) {
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
        }
    };

    const toggleTask = async (taskId: string) => {
        const task = school.tasks.find(t => t.id === taskId);
        if (!task) return;
        if (isSupabaseConfigured()) {
            const updated = await updateTask(taskId, { completed: !task.completed });
            if (updated) refetchSchools();
            else toast.toast.error('No se pudo actualizar la tarea');
        }
    };

    const handleDelete = async () => {
        if (isSupabaseConfigured()) {
            const success = await deleteSchool(school.id);
            if (success) {
                toast.toast.success('Escuela eliminada');
                navigate('/crm/leads');
            } else {
                toast.toast.error('Error al eliminar');
            }
        }
    };

    const handleCreateContract = async (data: any) => {
        // Inject client ID
        await createFinanceContract({ ...data, clientId: school.id });
        queryClient.invalidateQueries({ queryKey: ['finance_contracts'] });
        queryClient.invalidateQueries({ queryKey: ['finance-contracts'] }); // Global list
        toast.toast.success('Contrato creado');
    };

    const handleCreateInvoice = async (data: any) => {
        await createFinanceInvoice(data);
        queryClient.invalidateQueries({ queryKey: ['finance_invoices'] });
        queryClient.invalidateQueries({ queryKey: ['finance-invoices'] }); // Global list
        toast.toast.success('Factura creada');
    };


    return (
        <>
            <div className="max-w-7xl mx-auto p-6 space-y-6">

                {/* Header / Navigation */}
                <div className="flex items-center gap-4 mb-2">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 rounded-full hover:bg-white text-brand-500 hover:text-primary transition-colors"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <h1 className="text-2xl font-bold text-primary">Detalle de Escuela</h1>
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* Left Column: Context (Sticky) */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="bg-white p-6 rounded-2xl border border-brand-200/60 shadow-sm sticky top-6">
                            <div className="flex flex-col items-center text-center mb-6">
                                <div className="w-20 h-20 bg-gradient-to-br from-brand-600 to-brand-700 rounded-2xl flex items-center justify-center text-white text-3xl font-extrabold shadow-lg shadow-brand-500/20 mb-4">
                                    {school.name.charAt(0)}
                                </div>
                                <h2 className="text-xl font-bold text-primary">{school.name}</h2>
                                <div className="flex items-center gap-2 mt-2 flex-wrap justify-center">
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${PHASE_COLORS[school.phase]} bg-transparent`}>
                                        {school.phase}
                                    </span>
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${STATUS_COLORS[school.status]}`}>
                                        {school.status}
                                    </span>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center gap-3 text-sm">
                                    <User className="text-brand-400" size={16} />
                                    <span className="font-bold text-primary">{school.contactPerson}</span>
                                    <span className="text-brand-400 text-xs">({school.role})</span>
                                </div>
                                <div className="flex items-center gap-3 text-sm">
                                    <Mail className="text-brand-400" size={16} />
                                    <span className="text-primary break-all">{school.email}</span>
                                </div>
                                <div className="flex items-center gap-3 text-sm">
                                    <Phone className="text-brand-400" size={16} />
                                    <span className="text-primary">{school.phone}</span>
                                </div>
                                <div className="flex items-center gap-3 text-sm">
                                    <MapPin className="text-brand-400" size={16} />
                                    <span className="text-primary">{school.city}, {school.region}</span>
                                </div>
                            </div>

                            <hr className="my-6 border-brand-100" />

                            <div>
                                <label className="text-[10px] font-bold text-brand-400 uppercase block mb-3">Acciones Rápidas</label>
                                <div className="flex gap-2">
                                    <button onClick={() => { setActiveTab('tasks'); setShowFollowUpModal(true); }} className="flex-1 bg-brand-50 hover:bg-brand-100 text-brand-700 py-2 rounded-xl text-xs font-bold transition-colors">
                                        + Tarea
                                    </button>
                                    <button onClick={() => { setActiveTab('history'); document.getElementById('activity-input')?.focus(); }} className="flex-1 bg-brand-50 hover:bg-brand-100 text-brand-700 py-2 rounded-xl text-xs font-bold transition-colors">
                                        + Nota
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Tabs & Content */}
                    <div className="lg:col-span-2 space-y-6">

                        {/* Tabs */}
                        <div className="bg-white rounded-2xl border border-brand-200/60 shadow-sm p-1.5 flex overflow-x-auto">
                            {(['info', 'negotiation', 'tasks', 'finance', 'history', 'resources', 'audit'] as const).map(tab => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${activeTab === tab ? 'bg-brand-100/50 text-brand-700 shadow-sm' : 'text-brand-500 hover:bg-brand-50'}`}
                                >
                                    {tab === 'info' && 'General'}
                                    {tab === 'negotiation' && 'Seguimiento'}
                                    {tab === 'tasks' && 'Tareas'}
                                    {tab === 'finance' && 'Finanzas'}
                                    {tab === 'history' && 'Historial'}
                                    {tab === 'resources' && 'Recursos'}
                                    {tab === 'audit' && 'Auditoría'}
                                </button>
                            ))}
                        </div>

                        {/* Content Area */}
                        <div className="bg-transparent">
                            {activeTab === 'info' && (
                                <div className="bg-white p-6 rounded-2xl border border-brand-200/60 shadow-sm space-y-6 animate-in fade-in duration-300">
                                    <div>
                                        <label className="text-xs font-bold text-brand-400 uppercase block mb-3">Fase del Pipeline</label>
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
                                        <label className="text-xs font-bold text-brand-400 uppercase block mb-3">Estado Comercial</label>
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
                                        <div className="max-w-xs">
                                            <Select
                                                label="Asignado a"
                                                value={school.assignedToId ?? ''}
                                                onChange={(v) => handleUpdate({ ...school, assignedToId: v || null })}
                                                placeholder="Sin asignar"
                                                options={profiles.map((p) => ({ value: p.id, label: p.displayName || p.email || p.id.slice(0, 8) }))}
                                            />
                                        </div>
                                    )}

                                    <div>
                                        <label className="text-xs font-bold text-brand-400 uppercase block mb-3">Notas Internas</label>
                                        <textarea
                                            className="w-full bg-brand-50 p-4 rounded-xl text-sm text-primary border border-brand-200/60 focus:outline-none focus:border-brand-400 focus:bg-white transition-all min-h-[150px] font-body"
                                            placeholder="Escribe detalles adicionales sobre este centro..."
                                            value={notesText}
                                            onChange={(e) => setNotesText(e.target.value)}
                                            onBlur={() => handleUpdate({ ...school, notes: notesText })}
                                        />
                                    </div>

                                    <div className="flex justify-end pt-4">
                                        <button
                                            type="button"
                                            onClick={() => setShowDeleteConfirm(true)}
                                            className="text-red-500 text-xs font-bold hover:underline"
                                        >
                                            Eliminar Escuela
                                        </button>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'finance' && (
                                <div className="space-y-6 animate-in fade-in duration-300">
                                    {/* Contracts */}
                                    <div className="bg-white p-6 rounded-2xl border border-brand-200/60 shadow-sm">
                                        <div className="flex items-center justify-between mb-6">
                                            <h3 className="font-bold text-primary flex items-center gap-2">
                                                <Briefcase size={18} className="text-brand-600" /> Contratos
                                            </h3>
                                            <button
                                                onClick={() => setShowContractModal(true)}
                                                className="text-xs font-bold text-white bg-brand-600 px-3 py-1.5 rounded-lg hover:bg-brand-700 transition-colors flex items-center gap-1"
                                            >
                                                <Plus size={14} /> Nuevo
                                            </button>
                                        </div>

                                        {contracts.length === 0 ? (
                                            <p className="text-brand-muted text-sm text-center py-4">No hay contratos activos.</p>
                                        ) : (
                                            <div className="overflow-hidden rounded-xl border border-brand-200/60">
                                                <table className="w-full text-left text-sm">
                                                    <thead className="bg-brand-50 text-[10px] font-bold text-brand-400 uppercase">
                                                        <tr>
                                                            <th className="px-4 py-3">Título</th>
                                                            <th className="px-4 py-3">Importe</th>
                                                            <th className="px-4 py-3">Estado</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-brand-100">
                                                        {contracts.map(c => (
                                                            <tr key={c.id}>
                                                                <td className="px-4 py-3 font-bold text-primary">{c.title}</td>
                                                                <td className="px-4 py-3 text-primary">{formatCurrency(c.amount, c.currency)}</td>
                                                                <td className="px-4 py-3"><StatusBadge status={c.status} variant="contract" /></td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </div>

                                    {/* Invoices */}
                                    <div className="bg-white p-6 rounded-2xl border border-brand-200/60 shadow-sm">
                                        <div className="flex items-center justify-between mb-6">
                                            <h3 className="font-bold text-primary flex items-center gap-2">
                                                <FileText size={18} className="text-brand-600" /> Facturas
                                            </h3>
                                            <button
                                                onClick={() => setShowInvoiceModal(true)}
                                                className="text-xs font-bold text-white bg-brand-600 px-3 py-1.5 rounded-lg hover:bg-brand-700 transition-colors flex items-center gap-1"
                                            >
                                                <Plus size={14} /> Nueva
                                            </button>
                                        </div>

                                        {invoices.length === 0 ? (
                                            <p className="text-brand-muted text-sm text-center py-4">No hay facturas registradas.</p>
                                        ) : (
                                            <div className="overflow-hidden rounded-xl border border-brand-200/60">
                                                <table className="w-full text-left text-sm">
                                                    <thead className="bg-brand-50 text-[10px] font-bold text-brand-400 uppercase">
                                                        <tr>
                                                            <th className="px-4 py-3">Ref</th>
                                                            <th className="px-4 py-3">Fecha</th>
                                                            <th className="px-4 py-3">Importe</th>
                                                            <th className="px-4 py-3">Estado</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-brand-100">
                                                        {invoices.map(inv => (
                                                            <tr key={inv.id}>
                                                                <td className="px-4 py-3 font-bold text-primary">{inv.title}</td>
                                                                <td className="px-4 py-3 text-brand-500">{inv.issueDate}</td>
                                                                <td className="px-4 py-3 text-primary font-bold">{formatCurrency(inv.amount, inv.currency)}</td>
                                                                <td className="px-4 py-3"><StatusBadge status={inv.status} variant="invoice" /></td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {activeTab === 'negotiation' && (
                                <div className="bg-white p-6 rounded-2xl border border-brand-200/60 shadow-sm space-y-6 animate-in fade-in duration-300">
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
                                                        handleUpdate({ ...school, milestones: newMilestones });
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
                            )}

                            {activeTab === 'tasks' && (
                                <div className="bg-white p-6 rounded-2xl border border-brand-200/60 shadow-sm space-y-4 animate-in fade-in duration-300">
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

                            {activeTab === 'history' && (
                                <div className="space-y-6 animate-in fade-in duration-300">
                                    <div className="bg-white p-4 rounded-xl border border-brand-200 shadow-sm">
                                        <div className="flex flex-col gap-3">
                                            <div className="flex gap-2">
                                                <Select
                                                    value={activityType}
                                                    onChange={(v) => setActivityType(v as Activity['type'])}
                                                    placeholder="Tipo"
                                                    options={[
                                                        { value: 'Nota', label: 'Nota' },
                                                        { value: 'Llamada', label: 'Llamada' },
                                                        { value: 'Email', label: 'Email' },
                                                        { value: 'Reunión', label: 'Reunión' },
                                                    ]}
                                                    className="min-w-0"
                                                />
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <input
                                                    id="activity-input"
                                                    type="text"
                                                    placeholder={`Registrar nueva ${activityType.toLowerCase()}...`}
                                                    className="flex-1 bg-brand-50 border-none px-4 py-2 rounded-lg text-sm font-body text-primary focus:bg-white focus:ring-2 focus:ring-brand-100 transition-all outline-none"
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
                                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest ${activity.type === 'Reunión' ? 'bg-purple-100 text-purple-600' :
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

                            {activeTab === 'resources' && (
                                <div className="bg-white p-6 rounded-2xl border border-brand-200/60 shadow-sm space-y-6 animate-in fade-in duration-300">
                                    <div className="flex items-center justify-between mb-4">
                                        <h4 className="text-xs font-bold text-brand-400 uppercase tracking-widest">Recursos</h4>
                                        <div className="flex gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setShowResourceLinkModal(true)}
                                                className="text-brand-600 text-xs font-bold flex items-center gap-1 hover:underline"
                                            >
                                                <Link2 size={14} /> Vincular existente
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setShowResourceForm(true)}
                                                className="text-brand-600 text-xs font-bold flex items-center gap-1 hover:underline"
                                            >
                                                <Plus size={14} /> Crear Nuevo
                                            </button>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div>
                                            <h5 className="text-[10px] font-bold text-brand-500 uppercase mb-2">Principales</h5>
                                            {resourcesByEntity.primary.length === 0 ? (
                                                <p className="text-brand-500 text-xs font-body">No hay recursos principales.</p>
                                            ) : (
                                                <div className="space-y-2">
                                                    {resourcesByEntity.primary.map((r) => (
                                                        <ResourceCard resource={r} />
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <h5 className="text-[10px] font-bold text-brand-500 uppercase mb-2">Vinculados</h5>
                                            {resourcesByEntity.others.length === 0 && resourcesByEntity.primary.length === 0 ? (
                                                <p className="text-brand-500 text-xs font-body">No hay recursos vinculados.</p>
                                            ) : (
                                                <div className="space-y-2">
                                                    {resourcesByEntity.others.map((r) => (
                                                        <ResourceCard resource={r} />
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'audit' && (
                                <div className="bg-white p-6 rounded-2xl border border-brand-200/60 shadow-sm space-y-6 animate-in fade-in duration-300">
                                    <h3 className="font-bold text-primary mb-4">Registro de cambios</h3>
                                    {auditLog.length === 0 ? (
                                        <p className="text-brand-500 font-body text-sm">No hay registros de auditoría.</p>
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
                            )}
                        </div>
                    </div>
                </div>

                {/* Modals */}
                {showFollowUpModal && (
                    <div className="fixed inset-0 z-50 bg-primary/40 backdrop-blur-sm flex items-center justify-center p-6">
                        <div className="bg-white w-full rounded-3xl shadow-2xl p-6 space-y-6 border border-brand-200 max-w-md animate-in fade-in zoom-in-95 duration-200">
                            <h3 className="font-bold text-lg text-primary">Agendar Seguimiento</h3>
                            <div className="space-y-4">
                                <input
                                    value={followUpData.title}
                                    onChange={(e) => setFollowUpData({ ...followUpData, title: e.target.value })}
                                    className="w-full p-3 bg-brand-50 border border-brand-200 rounded-xl text-sm outline-none"
                                    placeholder="Título..."
                                />
                                <div className="grid grid-cols-2 gap-4">
                                    <input
                                        type="date"
                                        value={followUpData.date}
                                        onChange={(e) => setFollowUpData({ ...followUpData, date: e.target.value })}
                                        className="p-3 bg-brand-50 border border-brand-200 rounded-xl text-sm"
                                    />
                                    <input
                                        type="time"
                                        value={followUpData.time}
                                        onChange={(e) => setFollowUpData({ ...followUpData, time: e.target.value })}
                                        className="p-3 bg-brand-50 border border-brand-200 rounded-xl text-sm"
                                    />
                                </div>
                                <div className="flex gap-3 pt-2">
                                    <button onClick={() => setShowFollowUpModal(false)} className="flex-1 py-2 text-brand-600 font-bold hover:bg-brand-50 rounded-xl">Cancelar</button>
                                    <button onClick={saveFollowUpTask} className="flex-1 py-2 bg-primary text-white font-bold rounded-xl hover:bg-brand-600">Guardar</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {school && showResourceForm && (
                    <ResourceFormModal
                        isOpen={showResourceForm}
                        onClose={() => setShowResourceForm(false)}
                        presetEntity={{ entityType: 'client', entityId: school.id }}
                        onSave={async (data) => {
                            await createResource(data);
                            queryClient.invalidateQueries({ queryKey: ['resourcesByEntity'] });
                            setShowResourceForm(false);
                        }}
                    />
                )}

                {school && showResourceLinkModal && (
                    <ResourceLinkModal
                        isOpen={showResourceLinkModal}
                        onClose={() => setShowResourceLinkModal(false)}
                        entityType="client"
                        entityId={school.id}
                        onLink={async (resourceId, isPrimary) => {
                            await linkExistingResource(school.id, 'client', resourceId, isPrimary);
                            queryClient.invalidateQueries({ queryKey: ['resourcesByEntity'] });
                            setShowResourceLinkModal(false);
                        }}
                    />
                )}

                {showContractModal && (
                    <ContractFormModal
                        onClose={() => setShowContractModal(false)}
                        onSave={handleCreateContract}
                        initialClientId={school?.id}
                    />
                )}

                {showInvoiceModal && (
                    <InvoiceFormModal
                        onClose={() => setShowInvoiceModal(false)}
                        onSave={handleCreateInvoice}
                    />
                )}

                {showDeleteConfirm && (
                    <div className="fixed inset-0 z-50 bg-primary/40 backdrop-blur-sm flex items-center justify-center p-6">
                        <div className="bg-white w-full max-w-sm p-6 rounded-2xl shadow-xl space-y-4">
                            <h3 className="font-bold text-lg text-red-600">¿Eliminar escuela?</h3>
                            <p className="text-sm text-brand-600">Esta acción no se puede deshacer. Se perderán todos los datos asociados.</p>
                            <div className="flex gap-3 pt-2">
                                <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 py-2 font-bold text-brand-600 hover:bg-brand-50 rounded-xl">Cancelar</button>
                                <button onClick={handleDelete} className="flex-1 py-2 font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl">Eliminar</button>
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </>
    );
}
