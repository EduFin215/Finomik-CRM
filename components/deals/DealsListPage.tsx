import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { List, Kanban, Filter, ChevronRight, CheckSquare } from 'lucide-react';
import { listDeals, type ListDealsFilters } from '../../services/crm/deals';
import type { DealStage } from '../../types';
import { DealsPipelineView } from './DealsPipelineView';
import { useAuth } from '../../hooks/useAuth';
import TaskFormModal from '../../modules/tasks/TaskFormModal';

function parseRangeToDates(range: string | null): { from: string; to: string } | null {
  if (!range) return null;
  const now = new Date();
  const to = now.toISOString().slice(0, 10);
  if (range === '30d') {
    const d = new Date(now); d.setDate(d.getDate() - 30);
    return { from: d.toISOString().slice(0, 10), to };
  }
  if (range === '90d') {
    const d = new Date(now); d.setDate(d.getDate() - 90);
    return { from: d.toISOString().slice(0, 10), to };
  }
  if (range === 'ytd') return { from: `${now.getFullYear()}-01-01`, to };
  return null;
}

const STAGE_OPTIONS: { value: DealStage; label: string }[] = [
  { value: 'new', label: 'New' },
  { value: 'qualified', label: 'Qualified' },
  { value: 'proposal_sent', label: 'Proposal sent' },
  { value: 'negotiation', label: 'Negotiation' },
  { value: 'won', label: 'Won' },
  { value: 'lost', label: 'Lost' },
];

const TYPE_OPTIONS = [
  { value: 'school', label: 'School' },
  { value: 'company', label: 'Company' },
  { value: 'partner', label: 'Partner' },
  { value: 'lead', label: 'Lead' },
];

const DealsListPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const [viewMode, setViewMode] = useState<'list' | 'pipeline'>('list');
  const [stageFilter, setStageFilter] = useState<DealStage | ''>(() => (searchParams.get('stage') as DealStage) || '');
  const [clientType, setClientType] = useState<string>(() => searchParams.get('clientType') || '');
  const [closeFrom, setCloseFrom] = useState(() => searchParams.get('expectedCloseFrom') || '');
  const [closeTo, setCloseTo] = useState(() => searchParams.get('expectedCloseTo') || '');
  const [addTaskForDealId, setAddTaskForDealId] = useState<string | null>(null);

  useEffect(() => {
    const stage = searchParams.get('stage');
    const expectedCloseFrom = searchParams.get('expectedCloseFrom');
    const expectedCloseTo = searchParams.get('expectedCloseTo');
    const range = searchParams.get('range');
    if (stage) setStageFilter(stage as DealStage);
    if (expectedCloseFrom) setCloseFrom(expectedCloseFrom);
    if (expectedCloseTo) setCloseTo(expectedCloseTo);
    if (range && !expectedCloseFrom && !expectedCloseTo) {
      const dates = parseRangeToDates(range);
      if (dates) {
        setCloseFrom(dates.from);
        setCloseTo(dates.to);
      }
    }
  }, [searchParams]);

  const filters: ListDealsFilters = useMemo(() => {
    const f: ListDealsFilters = {};
    if (stageFilter) f.stage = stageFilter;
    if (clientType) f.clientType = clientType;
    if (closeFrom) f.expectedCloseFrom = closeFrom;
    if (closeTo) f.expectedCloseTo = closeTo;
    return f;
  }, [stageFilter, clientType, closeFrom, closeTo]);

  const { data: deals = [], isLoading, refetch } = useQuery({
    queryKey: ['deals', filters],
    queryFn: () => listDeals(filters),
  });

  const formatDate = (s: string | undefined) =>
    s ? new Date(s).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }) : '–';
  const formatCurrency = (n: number) =>
    new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);

  return (
    <div className="space-y-4 sm:space-y-6 h-full flex flex-col min-h-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div>
          <h2 className="text-xl sm:text-2xl font-title text-primary">Deals</h2>
          <p className="text-brand-500 font-body text-sm">View and filter deals.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-xl border border-brand-200/60 p-1 bg-brand-100/30">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg font-bold transition-colors ${viewMode === 'list' ? 'bg-primary text-white' : 'text-brand-600 hover:bg-brand-100/50'}`}
              title="List view"
            >
              <List size={18} />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('pipeline')}
              className={`p-2 rounded-lg font-bold transition-colors ${viewMode === 'pipeline' ? 'bg-primary text-white' : 'text-brand-600 hover:bg-brand-100/50'}`}
              title="Pipeline view"
            >
              <Kanban size={18} />
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 shrink-0">
        <span className="text-brand-500 text-xs font-bold uppercase flex items-center gap-1">
          <Filter size={12} /> Filters
        </span>
        <select
          value={stageFilter}
          onChange={(e) => {
            const v = (e.target.value || '') as DealStage | '';
            setStageFilter(v);
            setSearchParams((p) => {
              const next = new URLSearchParams(p);
              if (v) next.set('stage', v); else next.delete('stage');
              return next;
            });
          }}
          className="rounded-xl border border-brand-200/60 bg-white px-3 py-2 text-sm font-body text-primary"
        >
          <option value="">All stages</option>
          {STAGE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <select
          value={clientType}
          onChange={(e) => setClientType(e.target.value)}
          className="rounded-xl border border-brand-200/60 bg-white px-3 py-2 text-sm font-body text-primary"
        >
          <option value="">All client types</option>
          {TYPE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <input
          type="date"
          value={closeFrom}
          onChange={(e) => {
            const v = e.target.value;
            setCloseFrom(v);
            setSearchParams((p) => { const n = new URLSearchParams(p); if (v) n.set('expectedCloseFrom', v); else n.delete('expectedCloseFrom'); return n; });
          }}
          placeholder="Close from"
          className="rounded-xl border border-brand-200/60 px-3 py-2 text-sm font-body"
        />
        <input
          type="date"
          value={closeTo}
          onChange={(e) => {
            const v = e.target.value;
            setCloseTo(v);
            setSearchParams((p) => { const n = new URLSearchParams(p); if (v) n.set('expectedCloseTo', v); else n.delete('expectedCloseTo'); return n; });
          }}
          placeholder="Close to"
          className="rounded-xl border border-brand-200/60 px-3 py-2 text-sm font-body"
        />
      </div>

      {isLoading && (
        <div className="flex justify-center py-12">
          <p className="text-brand-500 text-sm">Loading...</p>
        </div>
      )}

      {!isLoading && viewMode === 'pipeline' && (
        <DealsPipelineView deals={deals} refetch={refetch} />
      )}

      {!isLoading && viewMode === 'list' && (
        <div className="bg-white rounded-2xl border border-brand-200/60 shadow-card overflow-hidden flex-1 flex flex-col min-h-0">
          <div className="overflow-x-auto overflow-y-auto flex-1">
            <table className="w-full text-left border-collapse min-w-[640px]">
              <thead className="sticky top-0 bg-brand-100/30 z-10 border-b border-brand-200">
                <tr className="text-brand-400 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider">
                  <th className="py-3 px-3 sm:px-4">Title</th>
                  <th className="py-3 px-3 sm:px-4">Client</th>
                  <th className="py-3 px-3 sm:px-4">Stage</th>
                  <th className="py-3 px-3 sm:px-4">Value</th>
                  <th className="py-3 px-3 sm:px-4">Probability</th>
                  <th className="py-3 px-3 sm:px-4">Expected close</th>
                  <th className="py-3 px-3 sm:px-4 hidden sm:table-cell">Updated</th>
                  <th className="py-3 px-3 sm:px-4 w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-100">
                {deals.map((deal) => (
                  <tr
                    key={deal.id}
                    className="group hover:bg-brand-100/30 transition-colors cursor-pointer"
                    onClick={() => navigate(`/crm/clients/${deal.clientId}`)}
                  >
                    <td className="py-3 px-3 sm:px-4 font-medium text-primary">{deal.title}</td>
                    <td className="py-3 px-3 sm:px-4 text-sm text-brand-600 truncate max-w-[140px]">{deal.clientName ?? deal.clientId}</td>
                    <td className="py-3 px-3 sm:px-4">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-brand-100 text-brand-600 capitalize">{deal.stage.replace('_', ' ')}</span>
                    </td>
                    <td className="py-3 px-3 sm:px-4 text-sm font-medium">
                      {deal.valueEstimated != null ? formatCurrency(deal.valueEstimated) : '–'}
                    </td>
                    <td className="py-3 px-3 sm:px-4 text-sm">{deal.probability != null ? `${deal.probability}%` : '–'}</td>
                    <td className="py-3 px-3 sm:px-4 text-sm text-brand-500">{formatDate(deal.expectedCloseDate)}</td>
                    <td className="py-3 px-3 sm:px-4 hidden sm:table-cell text-xs text-brand-500">{formatDate(deal.updatedAt)}</td>
                    <td className="py-3 px-3 sm:px-4 text-right">
                      <div className="flex items-center justify-end gap-0.5">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setAddTaskForDealId(deal.id); }}
                          className="p-2 text-brand-500 hover:bg-brand-100/50 hover:text-primary rounded-xl transition-colors"
                          title="Add task"
                        >
                          <CheckSquare size={18} />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); navigate(`/crm/clients/${deal.clientId}`); }}
                          className="p-2 text-brand-500 hover:bg-brand-100/50 hover:text-primary rounded-xl transition-colors"
                        >
                          <ChevronRight size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {deals.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-brand-400">
              <Filter size={48} className="mb-4 opacity-20" />
              <p className="text-lg font-subtitle text-primary">No deals found</p>
              <p className="text-sm font-body">Adjust filters or add deals from a client.</p>
            </div>
          )}
        </div>
      )}

      {addTaskForDealId && (
        <TaskFormModal
          initialTask={null}
          defaultAssigneeUserId={user?.id ?? null}
          presetLink={{ entityType: 'deal', entityId: addTaskForDealId }}
          onClose={() => setAddTaskForDealId(null)}
          onSaved={() => setAddTaskForDealId(null)}
        />
      )}
    </div>
  );
};

export default DealsListPage;
