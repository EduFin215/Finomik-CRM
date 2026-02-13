import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from 'recharts';
import {
  Users,
  Briefcase,
  TrendingUp,
  CheckSquare,
  Target
} from 'lucide-react';
import {
  getCrmDashboardMetrics,
  getDateRange,
  type DateRangeKey,
  type CrmDashboardMetrics,
} from '../services/crm/dashboard';
import { Phase } from '../types';
import { COLORS } from '../constants';
import { KpiCard } from '../modules/reporting/components/KpiCard';
import { ChartCard } from '../modules/reporting/components/ChartCard';
import { ActionableList } from '../modules/reporting/components/ActionableList';

const DATE_RANGE_OPTIONS: { key: DateRangeKey; label: string }[] = [
  { key: 'last30', label: 'Últimos 30 días' },
  { key: 'last90', label: 'Últimos 90 días' },
  { key: 'ytd', label: 'Año actual' },
];

const DEAL_STAGE_COLORS: Record<string, string> = {
  // Sales
  [Phase.INTERESTED]: COLORS.brand[100],
  [Phase.MEETING]: COLORS.brand[300],
  [Phase.PROPOSAL]: COLORS.brand[400],
  [Phase.NEGOTIATION]: '#f59e0b',

  // Onboarding
  [Phase.ONBOARDING_SETUP]: COLORS.secondary,
  [Phase.ONBOARDING_TRAINING]: COLORS.accent,
  [Phase.ONBOARDING_DONE]: '#22c55e',
};

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [dateRangeKey, setDateRangeKey] = useState<DateRangeKey>('last30');

  const dateRange = useMemo(
    () => getDateRange(dateRangeKey),
    [dateRangeKey]
  );

  const { data: metrics = null, isLoading } = useQuery({
    queryKey: ['crm-dashboard', dateRange],
    queryFn: () => getCrmDashboardMetrics(dateRange),
  });

  const m: CrmDashboardMetrics = metrics ?? {
    totalSchools: 0,
    newLeadsInRange: 0,
    openOpportunities: 0,
    pipelineValue: 0,
    wonInRange: 0,
    activeOnboarding: 0,
    activeClients: 0,
    tasksDueSoonCount: 0,
    pipelineByPhase: [],
    pipelineValueByMonth: [],
    newLeadsByMonth: [],
    opportunitiesClosingSoon: [],
    staleOpportunities: [],
  };

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-brand-muted">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
        <p className="text-sm font-medium">Cargando Dashboard...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-primary tracking-tight">CRM Dashboard</h2>
          <p className="text-brand-muted text-sm mt-1">
            Resumen de actividad comercial y onboarding.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex bg-white border border-brand-very-soft/60 rounded-lg p-1 shadow-sm">
            {DATE_RANGE_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => setDateRangeKey(opt.key)}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${dateRangeKey === opt.key
                  ? 'bg-brand-50 text-brand-600 shadow-sm'
                  : 'text-brand-400 hover:text-primary hover:bg-gray-50'
                  }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 4 Key KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <KpiCard
          value={formatCurrency(m.pipelineValue)}
          label="Valor Pipeline"
          icon={TrendingUp}
          onClick={() => navigate('/crm/pipeline')}
        />
        <KpiCard
          value={m.openOpportunities}
          label="Oportunidades Abiertas"
          icon={Briefcase}
          onClick={() => navigate('/crm/pipeline')}
        />
        <KpiCard
          value={m.activeOnboarding}
          label="En Onboarding"
          icon={Target}
          subtext="Proyectos activos"
          onClick={() => navigate('/crm/onboarding')}
        />
        <KpiCard
          value={m.tasksDueSoonCount}
          label="Tareas Pendientes"
          icon={CheckSquare}
          trendColor="red"
          onClick={() => navigate('/tasks/all')}
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ChartCard title="Evolución Pipeline (Forecast)">
            {m.pipelineValueByMonth.length === 0 ? (
              <div className="h-full flex items-center justify-center text-brand-muted text-sm">Sin datos</div>
            ) : (
              <div className="h-[260px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={m.pipelineValueByMonth}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="month" fontSize={11} tickFormatter={(v) => v.slice(0, 7)} tick={{ fill: '#94a3b8' }} axisLine={false} tickLine={false} dy={10} />
                    <YAxis fontSize={11} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} tick={{ fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      formatter={(v: number) => formatCurrency(v)}
                      labelFormatter={(l) => l?.slice(0, 7)}
                    />
                    <Line type="monotone" dataKey="value" stroke={COLORS.brand[500]} strokeWidth={3} dot={{ r: 4, strokeWidth: 0, fill: COLORS.brand[500] }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </ChartCard>
        </div>

        <ChartCard title="Fases del Pipeline">
          {m.pipelineByPhase.length === 0 ? (
            <div className="h-full flex items-center justify-center text-brand-muted text-sm">Sin datos</div>
          ) : (
            <div className="h-[260px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={m.pipelineByPhase} layout="vertical" margin={{ left: 0 }}>
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="phase" width={80} fontSize={10} tick={{ fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '8px' }} />
                  <Bar dataKey="count" name="Count" radius={[0, 4, 4, 0]} barSize={24}>
                    {m.pipelineByPhase.map((entry, i) => (
                      <Cell key={i} fill={DEAL_STAGE_COLORS[entry.phase] ?? COLORS.brand[300]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </ChartCard>
      </div>

      {/* Actionable Lists */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ActionableList
          title="Cierre Próximo (30 días)"
          items={m.opportunitiesClosingSoon.map(d => ({
            id: d.id,
            title: d.name,
            subtitle: `Cierre: ${d.expectedCloseDate} · ${formatCurrency(d.value)}`,
            href: '/crm/pipeline'
          }))}
          emptyMessage="No hay cierres próximos"
        />
        <ActionableList
          title="Oportunidades Estancadas (+14 días)"
          items={m.staleOpportunities.map(d => ({
            id: d.id,
            title: d.name,
            subtitle: `${d.phase} · Actualizado: ${new Date(d.updatedAt).toLocaleDateString()}`,
            href: '/crm/pipeline'
          }))}
          emptyMessage="Todo al día"
        />
      </div>
    </div>
  );
};

export default Dashboard;
