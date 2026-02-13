import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import {
  CheckSquare,
  AlertCircle,
  Flag,
  CheckCircle2,
  Ban
} from 'lucide-react';
import { getOperativoKpis, getOperativoCharts } from '../services/reporting';
import { KpiCard } from './KpiCard';
import { ChartCard } from './ChartCard';
import { COLORS } from '../../../constants';
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

const PIE_COLORS = [COLORS.brand[500], COLORS.brand[300], '#818cf8', '#34d399', '#f472b6'];

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
      <div className="flex flex-col items-center justify-center py-20 text-brand-muted">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
        <p className="text-sm font-medium">Calculando métricas operativas...</p>
      </div>
    );
  }

  const k = kpis!;

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-6">
        <KpiCard
          value={k.openTasks}
          label="Tareas Abiertas"
          icon={CheckSquare}
          onClick={() => navigate('/tasks/all')}
        />
        <KpiCard
          value={k.overdueTasks}
          label="Tareas Vencidas"
          icon={AlertCircle}
          trendColor="red"
          onClick={() => navigate('/tasks/all?overdue=1')}
        />
        <KpiCard
          value={k.highPriorityTasks}
          label="Alta Prioridad"
          icon={Flag}
          onClick={() => navigate('/tasks/all?priority=high')}
        />
        <KpiCard
          value={k.activeProjects}
          label="Proyectos Activos"
          icon={CheckCircle2}
          onClick={() => navigate('/crm/projects?status=active')}
        />
        <KpiCard
          value={k.blockedProjects}
          label="Proyectos Bloqueados"
          icon={Ban}
          trendColor="red"
          onClick={() => navigate('/crm/projects?status=blocked')}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <ChartCard title="Tareas por Prioridad">
          {charts?.tasksByPriority && charts.tasksByPriority.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={charts.tasksByPriority.map((d) => ({ ...d, name: PRIORITY_LABELS[d.priority] ?? d.priority }))} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '8px' }} />
                <Bar dataKey="count" name="Tareas" fill={COLORS.brand[400]} radius={[4, 4, 0, 0]} barSize={40} onClick={(data) => data?.priority && navigate(`/tasks/all?priority=${data.priority}`)} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-brand-muted text-sm">Sin datos</div>
          )}
        </ChartCard>

        <ChartCard title="Tareas por Estado">
          {charts?.tasksByStatus && charts.tasksByStatus.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={charts.tasksByStatus.map((d) => ({ ...d, name: STATUS_LABELS[d.status] ?? d.status }))}
                  dataKey="count"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  onClick={(data) => data?.status && navigate(`/tasks/all?status=${data.status}`)}
                >
                  {charts.tasksByStatus.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} strokeWidth={0} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '8px' }} />
                <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-brand-muted text-sm">Sin datos</div>
          )}
        </ChartCard>

        <ChartCard title="Proyectos por Estado">
          {charts?.projectsByStatus && charts.projectsByStatus.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={charts.projectsByStatus.map((d) => ({ ...d, name: PROJECT_STATUS_LABELS[d.status] ?? d.status }))} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} interval={0} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '8px' }} />
                <Bar dataKey="count" name="Proyectos" fill="#8b5cf6" radius={[4, 4, 0, 0]} barSize={40} onClick={(data) => data?.status && navigate(`/crm/projects?status=${data.status}`)} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-brand-muted text-sm">Sin datos</div>
          )}
        </ChartCard>
      </div>
    </div>
  );
}
