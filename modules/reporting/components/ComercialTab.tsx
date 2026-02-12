import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { getComercialKpis, getComercialCharts } from '../services/reporting';
import { KpiCard } from './KpiCard';
import { ChartCard } from './ChartCard';
import { formatCurrency } from '../../finance/formatCurrency';
import type { ReportingDateRangeInput } from '../services/reporting';

interface ComercialTabProps {
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
      <div className="flex items-center justify-center py-20">
        <p className="text-brand-500 text-sm">Cargando…</p>
      </div>
    );
  }

  const k = kpis!;

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <KpiCard value={k.newLeads} label="Leads nuevos" onClick={() => navigate(`/crm/clients?createdFrom=${range.from}&createdTo=${range.to}`)} />
        <KpiCard value={k.dealsWon} label="Deals ganados" onClick={() => navigate(`/crm/deals?stage=won${qs ? `&${qs.replace('?', '')}` : ''}`)} />
        <KpiCard value={k.dealsLost} label="Deals perdidos" onClick={() => navigate(`/crm/deals?stage=lost`)} />
        <KpiCard value={k.conversionRate != null ? `${k.conversionRate}%` : '–'} label="Tasa conversión" />
        <KpiCard value={k.ticketMedio != null ? formatCurrency(k.ticketMedio) : '–'} label="Ticket medio" />
        <KpiCard value={formatCurrency(k.pipelineTotal)} label="Pipeline total" onClick={() => navigate(`/crm/deals${qs}`)} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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

        <ChartCard title="Ganados vs Perdidos por mes">
          {charts?.wonLostByMonth && charts.wonLostByMonth.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={charts.wonLostByMonth.map((d) => ({ ...d, month: d.month.slice(0, 7) }))} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="won" name="Ganados" fill="#22c55e" radius={[4, 4, 0, 0]} stackId="a" />
                <Bar dataKey="lost" name="Perdidos" fill="#ef4444" radius={[4, 4, 0, 0]} stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-brand-400 py-8 text-center">Sin datos en el rango</p>
          )}
        </ChartCard>

        <ChartCard title="Evolución del pipeline">
          {charts?.pipelineByMonth && charts.pipelineByMonth.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={charts.pipelineByMonth.map((d) => ({ ...d, month: d.month.slice(0, 7) }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Line type="monotone" dataKey="value" name="Pipeline" stroke="#6366f1" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-brand-400 py-8 text-center">Sin datos</p>
          )}
        </ChartCard>
      </div>
    </div>
  );
}
