import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { getOperativoKpis, getOperativoCharts } from '../services/reporting';
import { KpiCard } from './KpiCard';
import { ChartCard } from './ChartCard';
import type { ReportingDateRangeInput } from '../services/reporting';

interface OperativoTabProps {
  range: ReportingDateRangeInput;
}

const PRIORITY_LABELS: Record<string, string> = { low: 'Baja', medium: 'Media', high: 'Alta' };
const STATUS_LABELS: Record<string, string> = {
  open: 'Abiertas',
  in_progress: 'En progreso',
  done: 'Hechas',
  archived: 'Archivadas',
};
const PROJECT_STATUS_LABELS: Record<string, string> = {
  planned: 'Planificado',
  active: 'Activo',
  blocked: 'Bloqueado',
  done: 'Hecho',
  archived: 'Archivado',
};

const PIE_COLORS = ['#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899'];

export function OperativoTab({ range: _range }: OperativoTabProps) {
  const navigate = useNavigate();

  const { data: kpis, isLoading: kpisLoading } = useQuery({
    queryKey: ['reporting', 'operativo', 'kpis'],
    queryFn: () => getOperativoKpis(),
  });

  const { data: charts, isLoading: chartsLoading } = useQuery({
    queryKey: ['reporting', 'operativo', 'charts'],
    queryFn: () => getOperativoCharts(),
  });

  const loading = kpisLoading || chartsLoading;

  if (loading && !kpis) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-brand-500 text-sm">Cargando…</p>
      </div>
    );
  }

  const k = kpis!;

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <KpiCard value={k.openTasks} label="Tareas abiertas" onClick={() => navigate('/tasks/all')} />
        <KpiCard value={k.overdueTasks} label="Tareas vencidas" onClick={() => navigate('/tasks/all?overdue=1')} />
        <KpiCard value={k.highPriorityTasks} label="Prioridad alta" onClick={() => navigate('/tasks/all?priority=high')} />
        <KpiCard value={k.activeProjects} label="Proyectos activos" onClick={() => navigate('/crm/projects?status=active')} />
        <KpiCard value={k.blockedProjects} label="Proyectos bloqueados" onClick={() => navigate('/crm/projects?status=blocked')} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <ChartCard title="Tareas por prioridad">
          {charts?.tasksByPriority && charts.tasksByPriority.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={charts.tasksByPriority.map((d) => ({ ...d, name: PRIORITY_LABELS[d.priority] ?? d.priority }))} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" name="Tareas" fill="#6366f1" radius={[4, 4, 0, 0]} onClick={(data) => data?.priority && navigate(`/tasks/all?priority=${data.priority}`)} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-brand-400 py-8 text-center">Sin datos</p>
          )}
        </ChartCard>

        <ChartCard title="Tareas por estado">
          {charts?.tasksByStatus && charts.tasksByStatus.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={charts.tasksByStatus.map((d) => ({ ...d, name: STATUS_LABELS[d.status] ?? d.status }))}
                  dataKey="count"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={70}
                  label={({ name, count }) => `${name}: ${count}`}
                  onClick={(data) => data?.status && navigate(`/tasks/all?status=${data.status}`)}
                >
                  {charts.tasksByStatus.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-brand-400 py-8 text-center">Sin datos</p>
          )}
        </ChartCard>

        <ChartCard title="Proyectos por estado">
          {charts?.projectsByStatus && charts.projectsByStatus.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={charts.projectsByStatus.map((d) => ({ ...d, name: PROJECT_STATUS_LABELS[d.status] ?? d.status }))} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" name="Proyectos" fill="#8b5cf6" radius={[4, 4, 0, 0]} onClick={(data) => data?.status && navigate(`/crm/projects?status=${data.status}`)} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-brand-400 py-8 text-center">Sin datos</p>
          )}
        </ChartCard>
      </div>
    </div>
  );
}
