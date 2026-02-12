import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, Legend } from 'recharts';
import { getOverviewKpis, getOverviewCharts, getOverviewLists } from '../services/reporting';
import { KpiCard } from './KpiCard';
import { ChartCard } from './ChartCard';
import { ActionableList } from './ActionableList';
import { formatCurrency } from '../../finance/formatCurrency';
import type { ReportingDateRangeInput } from '../services/reporting';

interface OverviewTabProps {
  range: ReportingDateRangeInput;
  drillDownQuery: { range?: string; from?: string; to?: string };
}

const STAGE_LABELS: Record<string, string> = {
  new: 'New',
  qualified: 'Qualified',
  proposal_sent: 'Proposal',
  negotiation: 'Negotiation',
  won: 'Won',
  lost: 'Lost',
};

const TASK_STATUS_LABELS: Record<string, string> = {
  open: 'Open',
  in_progress: 'In progress',
  done: 'Done',
  archived: 'Archived',
};

const PIE_COLORS = ['#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e'];

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
      <div className="flex items-center justify-center py-20">
        <p className="text-brand-500 text-sm">Cargando…</p>
      </div>
    );
  }

  const k = kpis!;

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4">
        <KpiCard value={k.activeClients} label="Clientes activos" onClick={() => navigate(`/crm/clients?status=active`)} />
        <KpiCard value={k.newClientsInRange} label="Nuevos clientes" onClick={() => navigate(`/crm/clients?createdFrom=${range.from}&createdTo=${range.to}`)} />
        <KpiCard value={k.openDeals} label="Deals abiertos" onClick={() => navigate(`/crm/deals${qs}`)} />
        <KpiCard value={formatCurrency(k.pipelineValue)} label="Pipeline" onClick={() => navigate(`/crm/deals${qs}`)} />
        <KpiCard value={k.activeProjects} label="Proyectos activos" onClick={() => navigate(`/crm/projects?status=active`)} />
        <KpiCard value={k.openTasks} label="Tareas abiertas" onClick={() => navigate('/tasks/all')} />
        <KpiCard value={formatCurrency(k.incomeInRange)} label="Ingresos" onClick={() => navigate(`/finance/income${qs ? qs : `?from=${range.from}&to=${range.to}`}`)} />
        <KpiCard value={formatCurrency(k.netResult)} label="Resultado neto" subtext="Ingresos − gastos" onClick={() => navigate(`/finance/dashboard`)} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <ChartCard title="Ingresos vs Gastos (mensual)">
          {charts?.incomeExpensesByMonth && charts.incomeExpensesByMonth.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={charts.incomeExpensesByMonth.map((d) => ({ ...d, month: d.month.slice(0, 7) }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} labelFormatter={(l) => l} />
                <Line type="monotone" dataKey="income" name="Ingresos" stroke="#6366f1" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="expenses" name="Gastos" stroke="#f43f5e" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-brand-400 py-8 text-center">Sin datos en el rango</p>
          )}
        </ChartCard>

        <ChartCard title="Deals por etapa">
          {charts?.dealsByStage && charts.dealsByStage.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={charts.dealsByStage.map((d) => ({ ...d, name: STAGE_LABELS[d.stage] ?? d.stage }))} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" name="Deals" fill="#6366f1" radius={[4, 4, 0, 0]} onClick={(data) => data?.stage && navigate(`/crm/deals?stage=${data.stage}`)} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-brand-400 py-8 text-center">Sin datos</p>
          )}
        </ChartCard>

        <ChartCard title="Tareas por estado">
          {charts?.workTasksByStatus && charts.workTasksByStatus.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={charts.workTasksByStatus.map((d) => ({ ...d, name: TASK_STATUS_LABELS[d.status] ?? d.status }))}
                  dataKey="count"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={70}
                  label={({ name, count }) => `${name}: ${count}`}
                  onClick={(data) => data?.status && navigate(`/tasks/all?status=${data.status}`)}
                >
                  {charts.workTasksByStatus.map((_, i) => (
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
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ActionableList
          title="Deals próximos a cerrar"
          items={(lists?.dealsClosingSoon ?? []).map((d) => ({
            id: d.id,
            title: d.title,
            subtitle: d.expectedCloseDate ? new Date(d.expectedCloseDate).toLocaleDateString('es-ES') : undefined,
            href: `/crm/clients/${d.clientId}`,
          }))}
        />
        <ActionableList
          title="Tareas vencidas"
          items={(lists?.overdueTasks ?? []).map((t) => ({
            id: t.id,
            title: t.title,
            subtitle: t.dueAt ? new Date(t.dueAt).toLocaleDateString('es-ES') : undefined,
            href: `/tasks/all?overdue=1`,
          }))}
        />
      </div>
    </div>
  );
}
