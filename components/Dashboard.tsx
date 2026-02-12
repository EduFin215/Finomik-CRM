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
  Cell,
  PieChart,
  Pie,
  CartesianGrid,
} from 'recharts';
import {
  Users,
  UserPlus,
  Briefcase,
  TrendingUp,
  CheckCircle,
  Percent,
  FolderOpen,
  Calendar,
  ChevronRight,
} from 'lucide-react';
import {
  getCrmDashboardMetrics,
  getDateRange,
  type DateRangeKey,
  type CrmDashboardMetrics,
} from '../services/crm/dashboard';
import type { ClientType } from '../types';
import { COLORS } from '../constants';

const DATE_RANGE_OPTIONS: { key: DateRangeKey; label: string }[] = [
  { key: 'last30', label: 'Last 30 days' },
  { key: 'last90', label: 'Last 90 days' },
  { key: 'ytd', label: 'YTD' },
];

const CLIENT_TYPES: { value: ClientType; label: string }[] = [
  { value: 'school', label: 'School' },
  { value: 'company', label: 'Company' },
  { value: 'partner', label: 'Partner' },
  { value: 'lead', label: 'Lead' },
];

const DEAL_STAGE_COLORS: Record<string, string> = {
  new: COLORS.brand[100],
  qualified: COLORS.brand[300],
  proposal_sent: COLORS.brand[400],
  negotiation: '#f59e0b',
  won: '#22c55e',
  lost: '#ef4444',
};

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [dateRangeKey, setDateRangeKey] = useState<DateRangeKey>('last30');
  const [clientType, setClientType] = useState<ClientType | ''>('');

  const dateRange = useMemo(
    () => getDateRange(dateRangeKey),
    [dateRangeKey]
  );

  const { data: metrics = null, isLoading } = useQuery({
    queryKey: ['crm-dashboard', dateRange, clientType || undefined],
    queryFn: () => getCrmDashboardMetrics(dateRange, clientType || undefined),
  });

  const m: CrmDashboardMetrics = metrics ?? {
    totalClients: 0,
    newClientsInRange: 0,
    openDealsCount: 0,
    pipelineValue: 0,
    wonDealsInRange: 0,
    conversionRate: null,
    activeProjectsCount: 0,
    tasksDueSoonCount: 0,
    dealsByStage: [],
    pipelineValueByMonth: [],
    newClientsByMonth: [],
    projectsByStatus: [],
    latestUpdatedClients: [],
    dealsClosingSoon: [],
    staleDeals: [],
  };

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
  const formatDate = (s: string) =>
    new Date(s).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-title text-primary">CRM Dashboard</h2>
          <p className="text-brand-500 font-body text-sm sm:text-base">
            Overview of clients, pipeline, and activity.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-brand-500 text-xs font-bold uppercase">Date range</span>
          <div className="flex gap-1 p-1 bg-brand-100/50 rounded-full">
            {DATE_RANGE_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => setDateRangeKey(opt.key)}
                className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${
                  dateRangeKey === opt.key
                    ? 'bg-primary text-white'
                    : 'text-brand-600 hover:bg-brand-100/50'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <span className="text-brand-500 text-xs font-bold uppercase ml-2">Type</span>
          <select
            value={clientType}
            onChange={(e) => setClientType((e.target.value || '') as ClientType | '')}
            className="rounded-xl border border-brand-200/60 bg-white px-3 py-2 text-sm font-body text-primary"
          >
            <option value="">All</option>
            {CLIENT_TYPES.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {isLoading && (
        <div className="flex justify-center py-8">
          <p className="text-brand-500 font-body">Loading...</p>
        </div>
      )}

      {!isLoading && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 sm:gap-4">
            <button
              type="button"
              onClick={() => navigate('/crm/clients')}
              className="bg-white p-4 rounded-2xl border border-brand-200/60 shadow-card text-left hover:shadow-md transition-all"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="bg-brand-100 p-2 rounded-lg text-brand-600">
                  <Users size={18} />
                </div>
              </div>
              <p className="text-brand-500 text-xs font-bold">Total Clients</p>
              <p className="text-lg font-extrabold text-primary">{m.totalClients}</p>
            </button>
            <button
              type="button"
              onClick={() => navigate('/crm/clients')}
              className="bg-white p-4 rounded-2xl border border-brand-200/60 shadow-card text-left hover:shadow-md transition-all"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="bg-emerald-50 p-2 rounded-lg text-emerald-600">
                  <UserPlus size={18} />
                </div>
              </div>
              <p className="text-brand-500 text-xs font-bold">New (range)</p>
              <p className="text-lg font-extrabold text-primary">{m.newClientsInRange}</p>
            </button>
            <button
              type="button"
              onClick={() => navigate('/crm/deals')}
              className="bg-white p-4 rounded-2xl border border-brand-200/60 shadow-card text-left hover:shadow-md transition-all"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="bg-amber-50 p-2 rounded-lg text-amber-600">
                  <Briefcase size={18} />
                </div>
              </div>
              <p className="text-brand-500 text-xs font-bold">Open Deals</p>
              <p className="text-lg font-extrabold text-primary">{m.openDealsCount}</p>
            </button>
            <button
              type="button"
              onClick={() => navigate('/crm/deals')}
              className="bg-white p-4 rounded-2xl border border-brand-200/60 shadow-card text-left hover:shadow-md transition-all"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="bg-brand-100 p-2 rounded-lg text-brand-600">
                  <TrendingUp size={18} />
                </div>
              </div>
              <p className="text-brand-500 text-xs font-bold">Pipeline Value</p>
              <p className="text-lg font-extrabold text-primary">{formatCurrency(m.pipelineValue)}</p>
            </button>
            <div className="bg-white p-4 rounded-2xl border border-brand-200/60 shadow-card text-left">
              <div className="flex items-center gap-2 mb-2">
                <div className="bg-green-50 p-2 rounded-lg text-green-600">
                  <CheckCircle size={18} />
                </div>
              </div>
              <p className="text-brand-500 text-xs font-bold">Won (range)</p>
              <p className="text-lg font-extrabold text-primary">{m.wonDealsInRange}</p>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-brand-200/60 shadow-card text-left">
              <div className="flex items-center gap-2 mb-2">
                <div className="bg-brand-100 p-2 rounded-lg text-brand-600">
                  <Percent size={18} />
                </div>
              </div>
              <p className="text-brand-500 text-xs font-bold">Conversion %</p>
              <p className="text-lg font-extrabold text-primary">
                {m.conversionRate != null ? `${m.conversionRate}%` : '–'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/crm/projects')}
              className="bg-white p-4 rounded-2xl border border-brand-200/60 shadow-card text-left hover:shadow-md transition-all"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="bg-purple-50 p-2 rounded-lg text-purple-600">
                  <FolderOpen size={18} />
                </div>
              </div>
              <p className="text-brand-500 text-xs font-bold">Active Projects</p>
              <p className="text-lg font-extrabold text-primary">{m.activeProjectsCount}</p>
            </button>
            <div className="bg-white p-4 rounded-2xl border border-brand-200/60 shadow-card text-left">
              <div className="flex items-center gap-2 mb-2">
                <div className="bg-brand-100 p-2 rounded-lg text-brand-600">
                  <Calendar size={18} />
                </div>
              </div>
              <p className="text-brand-500 text-xs font-bold">Tasks Due Soon</p>
              <p className="text-lg font-extrabold text-primary">{m.tasksDueSoonCount}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-4 sm:p-6 rounded-2xl border border-brand-200/60 shadow-card min-w-0">
              <h3 className="font-subtitle text-primary mb-4">Deals by Stage</h3>
              {m.dealsByStage.length === 0 ? (
                <p className="py-8 text-center text-brand-500 text-sm">No deal data in this period.</p>
              ) : (
                <div className="h-[240px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={m.dealsByStage} layout="vertical" margin={{ left: 80 }}>
                      <XAxis type="number" fontSize={12} />
                      <YAxis type="category" dataKey="stage" width={80} fontSize={11} />
                      <Tooltip />
                      <Bar dataKey="count" name="Count" radius={[0, 4, 4, 0]}>
                        {m.dealsByStage.map((entry, i) => (
                          <Cell key={i} fill={DEAL_STAGE_COLORS[entry.stage] ?? COLORS.brand[300]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
            <div className="bg-white p-4 sm:p-6 rounded-2xl border border-brand-200/60 shadow-card min-w-0">
              <h3 className="font-subtitle text-primary mb-4">Projects by Status</h3>
              {m.projectsByStatus.length === 0 ? (
                <p className="py-8 text-center text-brand-500 text-sm">No project data.</p>
              ) : (
                <div className="h-[240px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={m.projectsByStatus}>
                      <XAxis dataKey="status" fontSize={11} />
                      <YAxis fontSize={12} />
                      <Tooltip />
                      <Bar dataKey="count" name="Count" fill={COLORS.brand[400]} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-4 sm:p-6 rounded-2xl border border-brand-200/60 shadow-card min-w-0">
              <h3 className="font-subtitle text-primary mb-4">Pipeline Value by Month</h3>
              {m.pipelineValueByMonth.length === 0 ? (
                <p className="py-8 text-center text-brand-500 text-sm">No data in this period.</p>
              ) : (
                <div className="h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={m.pipelineValueByMonth}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="month" fontSize={11} tickFormatter={(v) => v.slice(0, 7)} />
                      <YAxis fontSize={11} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                      <Tooltip formatter={(v: number) => [formatCurrency(v), 'Value']} labelFormatter={(l) => l?.slice(0, 7)} />
                      <Line type="monotone" dataKey="value" stroke={COLORS.brand[500]} strokeWidth={2} dot={{ r: 3 }} name="Value" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
            <div className="bg-white p-4 sm:p-6 rounded-2xl border border-brand-200/60 shadow-card min-w-0">
              <h3 className="font-subtitle text-primary mb-4">New Clients by Month</h3>
              {m.newClientsByMonth.length === 0 ? (
                <p className="py-8 text-center text-brand-500 text-sm">No data in this period.</p>
              ) : (
                <div className="h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={m.newClientsByMonth}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="month" fontSize={11} tickFormatter={(v) => v.slice(0, 7)} />
                      <YAxis fontSize={11} />
                      <Tooltip labelFormatter={(l) => l?.slice(0, 7)} />
                      <Line type="monotone" dataKey="count" stroke={COLORS.brand[400]} strokeWidth={2} dot={{ r: 3 }} name="New clients" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white p-4 sm:p-6 rounded-2xl border border-brand-200/60 shadow-card">
              <h3 className="font-subtitle text-primary mb-4">Latest Updated Clients</h3>
              {m.latestUpdatedClients.length === 0 ? (
                <p className="py-6 text-center text-brand-500 text-sm">No clients yet.</p>
              ) : (
                <ul className="divide-y divide-brand-100">
                  {m.latestUpdatedClients.map((c) => (
                    <li key={c.id} className="py-2 flex items-center justify-between gap-2 hover:bg-brand-100/30 rounded-lg -mx-2 px-2">
                      <span className="font-medium text-primary truncate">{c.name}</span>
                      <button
                        type="button"
                        onClick={() => navigate(`/crm/clients/${c.id}`)}
                        className="shrink-0 p-1.5 text-brand-500 hover:text-primary hover:bg-brand-100/50 rounded-xl transition-colors"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="bg-white p-4 sm:p-6 rounded-2xl border border-brand-200/60 shadow-card">
              <h3 className="font-subtitle text-primary mb-4">Deals Closing Soon (30 days)</h3>
              {m.dealsClosingSoon.length === 0 ? (
                <p className="py-6 text-center text-brand-500 text-sm">No deals closing in the next 30 days.</p>
              ) : (
                <ul className="divide-y divide-brand-100">
                  {m.dealsClosingSoon.map((d) => (
                    <li key={d.id} className="py-2 flex items-center justify-between gap-2 hover:bg-brand-100/30 rounded-lg -mx-2 px-2">
                      <div className="min-w-0">
                        <p className="font-medium text-primary truncate">{d.title}</p>
                        <p className="text-xs text-brand-500">
                          {d.clientName ?? d.clientId} · {formatDate(d.expectedCloseDate)}
                          {d.valueEstimated != null ? ` · ${formatCurrency(d.valueEstimated)}` : ''}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => navigate('/crm/deals')}
                        className="shrink-0 p-1.5 text-brand-500 hover:text-primary hover:bg-brand-100/50 rounded-xl transition-colors"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="bg-white p-4 sm:p-6 rounded-2xl border border-brand-200/60 shadow-card">
              <h3 className="font-subtitle text-primary mb-4">Stale Deals (no update 14+ days)</h3>
              {m.staleDeals.length === 0 ? (
                <p className="py-6 text-center text-brand-500 text-sm">No stale deals.</p>
              ) : (
                <ul className="divide-y divide-brand-100">
                  {m.staleDeals.map((d) => (
                    <li key={d.id} className="py-2 flex items-center justify-between gap-2 hover:bg-brand-100/30 rounded-lg -mx-2 px-2">
                      <div className="min-w-0">
                        <p className="font-medium text-primary truncate">{d.title}</p>
                        <p className="text-xs text-brand-500">
                          {d.clientName ?? d.clientId} · {formatDate(d.updatedAt)} · {d.stage}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => navigate('/crm/deals')}
                        className="shrink-0 p-1.5 text-brand-500 hover:text-primary hover:bg-brand-100/50 rounded-xl transition-colors"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;
