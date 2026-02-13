import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, Legend } from 'recharts';
import {
  Users,
  Briefcase,
  CheckCircle2,
  DollarSign,
  TrendingUp,
  CheckSquare,
  Wallet,
  Target
} from 'lucide-react';
import { getOverviewKpis, getOverviewCharts, getOverviewLists } from '../services/reporting';
import { KpiCard } from './KpiCard';
import { ChartCard } from './ChartCard';
import { ActionableList } from './ActionableList';
import { formatCurrency } from '../../finance/formatCurrency';
import { COLORS } from '../../../constants';
import type { ReportingDateRangeInput } from '../services/reporting';

interface OverviewTabProps {
  range: ReportingDateRangeInput;
  drillDownQuery: { range?: string; from?: string; to?: string };
}

const STAGE_LABELS: Record<string, string> = {
  new: 'Nuevo',
  qualified: 'Cualificado',
  proposal_sent: 'Propuesta',
  negotiation: 'Negociación',
  won: 'Ganado',
  lost: 'Perdido',
};

const TASK_STATUS_LABELS: Record<string, string> = {
  open: 'Abierta',
  in_progress: 'En curso',
  done: 'Hecha',
  archived: 'Archivada',
};

const PIE_COLORS = [COLORS.brand[500], COLORS.brand[300], '#818cf8', '#34d399', '#f472b6'];

function buildQueryString(q: { range?: string; from?: string; to?: string }): string {
  const params = new URLSearchParams();
  if (q.range) params.set('range', q.range);
  if (q.from) params.set('from', q.from);
  if (q.to) params.set('to', q.to);
  const s = params.toString();
  return s ? `?${s}` : '';
}

export function OverviewTab({ range, drillDownQuery }: OverviewTabProps) {
  const navigate = useNavigate();
  const qs = buildQueryString(drillDownQuery);

  const { data: kpis, isLoading: kpisLoading } = useQuery({
    queryKey: ['reporting', 'overview', 'kpis', range.from, range.to],
    queryFn: () => getOverviewKpis(range),
  });

  const { data: charts, isLoading: chartsLoading } = useQuery({
    queryKey: ['reporting', 'overview', 'charts', range.from, range.to],
    queryFn: () => getOverviewCharts(range),
  });

  const { data: lists } = useQuery({
    queryKey: ['reporting', 'overview', 'lists', range.from, range.to],
    queryFn: () => getOverviewLists(range),
  });

  const loading = kpisLoading || chartsLoading;

  if (loading && !kpis) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-brand-muted">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
        <p className="text-sm font-medium">Calculando métricas...</p>
      </div>
    );
  }

  const k = kpis!;

  return (
    <div className="space-y-8">
      {/* KPI Grid - 4 Columns for cleaner look */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <KpiCard
          value={k.activeClients}
          label="Clientes Activos"
          icon={Users}
          onClick={() => navigate(`/crm/leads?status=active`)}
          delay={0}
        />
        <KpiCard
          value={k.newClientsInRange}
          label="Nuevos Leads"
          icon={Target}
          subtext="En el periodo seleccionado"
          onClick={() => navigate(`/crm/leads?createdFrom=${range.from}&createdTo=${range.to}`)}
          delay={50}
        />
        <KpiCard
          value={k.openDeals}
          label="Deals Abiertos"
          icon={Briefcase}
          onClick={() => navigate(`/crm/deals${qs}`)}
          delay={100}
        />
        <KpiCard
          value={formatCurrency(k.pipelineValue)}
          label="Valor Pipeline"
          icon={TrendingUp}
          onClick={() => navigate(`/crm/deals${qs}`)}
          delay={150}
        />
        <KpiCard
          value={k.activeProjects}
          label="Proyectos Activos"
          icon={CheckCircle2}
          onClick={() => navigate(`/crm/projects?status=active`)}
          delay={200}
        />
        <KpiCard
          value={k.openTasks}
          label="Tareas Abiertas"
          icon={CheckSquare}
          onClick={() => navigate('/tasks/all')}
          delay={250}
        />
        <KpiCard
          value={formatCurrency(k.incomeInRange)}
          label="Ingresos"
          icon={DollarSign}
          trendColor="green"
          onClick={() => navigate(`/finance/income${qs ? qs : `?from=${range.from}&to=${range.to}`}`)}
          delay={300}
        />
        <KpiCard
          value={formatCurrency(k.netResult)}
          label="Beneficio Neto"
          subtext="Ingresos − Gastos"
          icon={Wallet}
          onClick={() => navigate(`/finance/dashboard`)}
          delay={350}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">

        {/* Main Chart Section - 2/3 Width */}
        <div className="xl:col-span-2 grid grid-cols-1 gap-8">
          <ChartCard title="Ingresos vs Gastos" subtitle="Evolución mensual comparada">
            {charts?.incomeExpensesByMonth && charts.incomeExpensesByMonth.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={charts.incomeExpensesByMonth.map((d) => ({ ...d, month: d.month.slice(0, 7) }))} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} dy={10} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    formatter={(v: number) => formatCurrency(v)}
                    labelFormatter={(l) => l}
                  />
                  <Line type="monotone" dataKey="income" name="Ingresos" stroke={COLORS.brand[600]} strokeWidth={3} dot={{ r: 4, fill: COLORS.brand[600], strokeWidth: 0 }} activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey="expenses" name="Gastos" stroke="#f43f5e" strokeWidth={3} dot={{ r: 4, fill: "#f43f5e", strokeWidth: 0 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-brand-muted text-sm">Sin datos en el rango seleccionado</div>
            )}
          </ChartCard>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <ChartCard title="Deals por Etapa">
              {charts?.dealsByStage && charts.dealsByStage.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={charts.dealsByStage.map((d) => ({ ...d, name: STAGE_LABELS[d.stage] ?? d.stage }))} layout="vertical" margin={{ left: 0 }}>
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '8px' }} />
                    <Bar dataKey="count" name="Deals" fill={COLORS.brand[400]} radius={[0, 4, 4, 0]} barSize={20} onClick={(data) => data?.stage && navigate(`/crm/deals?stage=${data.stage}`)} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-brand-muted text-sm">Sin datos</div>
              )}
            </ChartCard>

            <ChartCard title="Estado de Tareas">
              {charts?.workTasksByStatus && charts.workTasksByStatus.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={charts.workTasksByStatus.map((d) => ({ ...d, name: TASK_STATUS_LABELS[d.status] ?? d.status }))}
                      dataKey="count"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      onClick={(data) => data?.status && navigate(`/tasks/all?status=${data.status}`)}
                    >
                      {charts.workTasksByStatus.map((_, i) => (
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
          </div>
        </div>

        {/* Right Column - Lists */}
        <div className="space-y-6">
          <ActionableList
            title="Deals Próximos a Cerrar"
            items={(lists?.dealsClosingSoon ?? []).map((d) => ({
              id: d.id,
              title: d.title,
              subtitle: d.expectedCloseDate ? new Date(d.expectedCloseDate).toLocaleDateString('es-ES') : undefined,
              href: `/crm/leads/${d.clientId}`,
            }))}
            emptyMessage="No hay deals inminentes"
          />
          <ActionableList
            title="Tareas Vencidas"
            items={(lists?.overdueTasks ?? []).map((t) => ({
              id: t.id,
              title: t.title,
              subtitle: t.dueAt ? `Venció: ${new Date(t.dueAt).toLocaleDateString('es-ES')}` : undefined,
              href: `/tasks/all?overdue=1`,
            }))}
            emptyMessage="¡Todo al día!"
          />
        </div>

      </div>
    </div>
  );
}
