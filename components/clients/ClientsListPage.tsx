import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight, Filter, Search } from 'lucide-react';
import { listClients, type ListClientsFilters } from '../../services/crm/clients';
import type { ClientType, ClientStage } from '../../types';

const TYPE_OPTIONS: { value: ClientType; label: string }[] = [
  { value: 'school', label: 'School' },
  { value: 'company', label: 'Company' },
  { value: 'partner', label: 'Partner' },
  { value: 'lead', label: 'Lead' },
];

const STAGE_OPTIONS: { value: ClientStage; label: string }[] = [
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'proposal', label: 'Proposal' },
  { value: 'negotiation', label: 'Negotiation' },
  { value: 'won', label: 'Won' },
  { value: 'lost', label: 'Lost' },
];

const STATUS_OPTIONS = [
  { value: 'active' as const, label: 'Active' },
  { value: 'archived' as const, label: 'Archived' },
];

const ClientsListPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<ClientType | ''>(() => (searchParams.get('type') as ClientType) || '');
  const [stageFilter, setStageFilter] = useState<ClientStage | ''>(() => (searchParams.get('stage') as ClientStage) || '');
  const [statusFilter, setStatusFilter] = useState<'active' | 'archived' | ''>(() => (searchParams.get('status') as 'active' | 'archived') || '');
  const [createdFrom, setCreatedFrom] = useState(() => searchParams.get('createdFrom') || '');
  const [createdTo, setCreatedTo] = useState(() => searchParams.get('createdTo') || '');

  useEffect(() => {
    const status = searchParams.get('status');
    const createdFromQ = searchParams.get('createdFrom');
    const createdToQ = searchParams.get('createdTo');
    if (status) setStatusFilter(status as 'active' | 'archived');
    if (createdFromQ) setCreatedFrom(createdFromQ);
    if (createdToQ) setCreatedTo(createdToQ);
  }, [searchParams]);

  const filters: ListClientsFilters = useMemo(() => {
    const f: ListClientsFilters = {};
    if (typeFilter) f.type = typeFilter;
    if (stageFilter) f.stage = stageFilter;
    if (statusFilter) f.status = statusFilter;
    if (createdFrom) f.createdFrom = createdFrom;
    if (createdTo) f.createdTo = createdTo;
    return f;
  }, [typeFilter, stageFilter, statusFilter, createdFrom, createdTo]);

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ['clients', { filters, search }],
    queryFn: () => listClients({ filters: Object.keys(filters).length ? filters : undefined, search: search || undefined }),
  });

  const formatDate = (s: string | undefined) =>
    s ? new Date(s).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }) : '–';

  return (
    <div className="space-y-4 sm:space-y-6 h-full flex flex-col min-h-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div className="min-w-0">
          <h2 className="text-xl sm:text-2xl font-title text-primary">Clients</h2>
          <p className="text-brand-500 font-body text-sm">Search and filter your clients.</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 shrink-0">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search by name, email, location..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-3 py-2.5 border border-brand-200/60 rounded-xl text-sm font-body text-primary placeholder:text-brand-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-brand-500 text-xs font-bold uppercase flex items-center gap-1">
            <Filter size={12} /> Filters
          </span>
          <select
            value={typeFilter}
            onChange={(e) => {
              const v = (e.target.value || '') as ClientType | '';
              setTypeFilter(v);
              setSearchParams((p) => { const n = new URLSearchParams(p); if (v) n.set('type', v); else n.delete('type'); return n; });
            }}
            className="rounded-xl border border-brand-200/60 bg-white px-3 py-2 text-sm font-body text-primary"
          >
            <option value="">All types</option>
            {TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <select
            value={stageFilter}
            onChange={(e) => {
              const v = (e.target.value || '') as ClientStage | '';
              setStageFilter(v);
              setSearchParams((p) => { const n = new URLSearchParams(p); if (v) n.set('stage', v); else n.delete('stage'); return n; });
            }}
            className="rounded-xl border border-brand-200/60 bg-white px-3 py-2 text-sm font-body text-primary"
          >
            <option value="">All stages</option>
            {STAGE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => {
              const v = (e.target.value || '') as 'active' | 'archived' | '';
              setStatusFilter(v);
              setSearchParams((p) => { const n = new URLSearchParams(p); if (v) n.set('status', v); else n.delete('status'); return n; });
            }}
            className="rounded-xl border border-brand-200/60 bg-white px-3 py-2 text-sm font-body text-primary"
          >
            <option value="">All statuses</option>
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-brand-200/60 shadow-card overflow-hidden flex-1 flex flex-col min-h-0">
        {isLoading && (
          <div className="flex justify-center py-12">
            <p className="text-brand-500 text-sm">Loading...</p>
          </div>
        )}
        {!isLoading && (
          <div className="overflow-x-auto overflow-y-auto flex-1">
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead className="sticky top-0 bg-brand-100/30 z-10 border-b border-brand-200">
                <tr className="text-brand-400 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider">
                  <th className="py-3 px-3 sm:px-4">Name</th>
                  <th className="py-3 px-3 sm:px-4">Type</th>
                  <th className="py-3 px-3 sm:px-4">Stage</th>
                  <th className="py-3 px-3 sm:px-4 hidden md:table-cell">Location</th>
                  <th className="py-3 px-3 sm:px-4 hidden sm:table-cell">Updated</th>
                  <th className="py-3 px-3 sm:px-4 w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-100">
                {clients.map((client) => (
                  <tr
                    key={client.id}
                    className="group hover:bg-brand-100/30 transition-colors cursor-pointer"
                    onClick={() => navigate(`/crm/clients/${client.id}`)}
                  >
                    <td className="py-3 px-3 sm:px-4">
                      <span className="font-bold text-primary group-hover:text-brand-600 truncate block">{client.name}</span>
                    </td>
                    <td className="py-3 px-3 sm:px-4">
                      <span className="text-sm text-brand-600 capitalize">{client.type}</span>
                    </td>
                    <td className="py-3 px-3 sm:px-4">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-brand-100 text-brand-600 capitalize">{client.stage}</span>
                    </td>
                    <td className="py-3 px-3 sm:px-4 hidden md:table-cell text-sm text-brand-500 truncate max-w-[160px]">
                      {client.location || (client.city && client.region ? `${client.city}, ${client.region}` : client.city || client.region || '–')}
                    </td>
                    <td className="py-3 px-3 sm:px-4 hidden sm:table-cell text-xs text-brand-500">
                      {formatDate(client.updatedAt)}
                    </td>
                    <td className="py-3 px-3 sm:px-4 text-right">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); navigate(`/crm/clients/${client.id}`); }}
                        className="p-2 text-brand-500 hover:bg-brand-100/50 hover:text-primary rounded-xl transition-colors"
                      >
                        <ChevronRight size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!isLoading && clients.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-brand-400">
            <Filter size={48} className="mb-4 opacity-20" />
            <p className="text-lg font-subtitle text-primary">No clients found</p>
            <p className="text-sm font-body">Adjust filters or add a new client.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClientsListPage;
