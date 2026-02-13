import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import {
  Users,
  Trophy,
  XCircle,
  Percent,
  CreditCard,
  Target
} from 'lucide-react';
import { getComercialKpis, getComercialCharts } from '../services/reporting';
import { KpiCard } from './KpiCard';
import { ChartCard } from './ChartCard';
import { formatCurrency } from '../../finance/formatCurrency';
import { COLORS } from '../../../constants';
import type { ReportingDateRangeInput } from '../services/reporting';

interface ComercialTabProps {
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

function buildQueryString(q: { range?: string; from?: string; to?: string }): string {
  const params = new URLSearchParams();
  if (q.range) params.set('range', q.range);
  if (q.from) params.set('from', q.from);
  if (q.to) params.set('to', q.to);
  const s = params.toString();
  return s ? `?${s}` : '';
}

export function ComercialTab({ range, drillDownQuery }: ComercialTabProps) {
  const navigate = useNavigate();
  const qs = buildQueryString(drillDownQuery);

  const { data: kpis, isLoading: kpisLoading } = useQuery({
    queryKey: ['reporting', 'comercial', 'kpis', range.from, range.to],
    queryFn: () => getComercialKpis(range),
  });

  const { data: charts, isLoading: chartsLoading } = useQuery({
    queryKey: ['reporting', 'comercial', 'charts', range.from, range.to],
    queryFn: () => getComercialCharts(range),
  });

  const loading = kpisLoading || chartsLoading;

  if (loading && !kpis) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-brand-muted">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
        <p className="text-sm font-medium">Calculando rendimiento comercial...</p>
      </div>
    );
  }

  const k = kpis!;

  return (
    <div className="space-y-8">
      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-6">
        <KpiCard
          value={k.newLeads}
          label="Leads Nuevos"
          icon={Users}
          onClick={() => navigate(`/crm/leads?createdFrom=${range.from}&createdTo=${range.to}`)}
        />
        <KpiCard
          value={k.dealsWon}
          label="Deals Ganados"
          icon={Trophy}
          trendColor="green"
          onClick={() => navigate(`/crm/deals?stage=won${qs ? `&${qs.replace('?', '')}` : ''}`)}
        />
        <KpiCard
          value={k.dealsLost}
          label="Deals Perdidos"
          icon={XCircle}
          trendColor="red"
          onClick={() => navigate(`/crm/deals?stage=lost`)}
        />
        <KpiCard
          value={k.conversionRate != null ? `${k.conversionRate}%` : '–'}
          label="Tasa Conversión"
          icon={Percent}
        />
        <KpiCard
          value={k.ticketMedio != null ? formatCurrency(k.ticketMedio) : '–'}
          label="Ticket Medio"
          icon={CreditCard}
        />
        <KpiCard
          value={formatCurrency(k.pipelineTotal)}
          label="Pipeline Total"
          icon={Target}
          onClick={() => navigate(`/crm/deals${qs}`)}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">

        {/* Full Width / Large Chart */}
        <div className="lg:col-span-2 xl:col-span-1">
          <ChartCard title="Distribución del Pipeline" subtitle="Por etapa actual">
            {charts?.dealsByStage && charts.dealsByStage.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={charts.dealsByStage.map((d) => ({ ...d, name: STAGE_LABELS[d.stage] ?? d.stage }))} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '8px' }} />
                  <Bar dataKey="count" name="Deals" fill={COLORS.brand[400]} radius={[4, 4, 0, 0]} barSize={40} onClick={(data) => data?.stage && navigate(`/crm/deals?stage=${data.stage}`)} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-brand-muted text-sm">Sin datos</div>
            )}
          </ChartCard>
        </div>

        <ChartCard title="Ganados vs Perdidos" subtitle="Tendencia mensual">
          {charts?.wonLostByMonth && charts.wonLostByMonth.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={charts.wonLostByMonth.map((d) => ({ ...d, month: d.month.slice(0, 7) }))} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: '8px' }} />
                <Bar dataKey="won" name="Ganados" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} />
                <Bar dataKey="lost" name="Perdidos" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-brand-muted text-sm">Sin datos en el rango</div>
          )}
        </ChartCard>

        <ChartCard title="Evolución del Pipeline" subtitle="Valor total en el tiempo">
          {charts?.pipelineByMonth && charts.pipelineByMonth.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={charts.pipelineByMonth.map((d) => ({ ...d, month: d.month.slice(0, 7) }))} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  formatter={(v: number) => formatCurrency(v)}
                />
                <Line type="monotone" dataKey="value" name="Pipeline" stroke={COLORS.brand[600]} strokeWidth={3} dot={{ r: 4, strokeWidth: 0, fill: COLORS.brand[600] }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-brand-muted text-sm">Sin datos</div>
          )}
        </ChartCard>
      </div>
    </div>
  );
}
