import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight, Filter, PlusCircle, Search } from 'lucide-react';
import { listClients, type ListClientsFilters } from '../../services/crm/clients';
import type { ClientType, ClientStage } from '../../types';
import { Select } from '../../modules/tasks/Select';
import { useCRM } from '../../context/CRMContext';

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
  const { openNewSchoolModal } = useCRM();
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
          <h2 className="text-xl sm:text-2xl font-title text-primary">Leads</h2>
          <p className="text-brand-500 font-body text-sm">Search and filter your leads.</p>
        </div>
        <button
          type="button"
          onClick={() => openNewSchoolModal()}
          className="flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-500 text-white px-4 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-primary/20 shrink-0"
        >
          <PlusCircle size={20} />
          <span>Nuevo Lead</span>
        </button>
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
          <Select
            value={typeFilter}
            onChange={(v) => {
              const val = (v || '') as ClientType | '';
              setTypeFilter(val);
              setSearchParams((p) => { const n = new URLSearchParams(p); if (val) n.set('type', val); else n.delete('type'); return n; });
            }}
            placeholder="All types"
            options={TYPE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
            className="min-w-0"
          />
          <Select
            value={stageFilter}
            onChange={(v) => {
              const val = (v || '') as ClientStage | '';
              setStageFilter(val);
              setSearchParams((p) => { const n = new URLSearchParams(p); if (val) n.set('stage', val); else n.delete('stage'); return n; });
            }}
            placeholder="All stages"
            options={STAGE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
            className="min-w-0"
          />
          <Select
            value={statusFilter}
            onChange={(v) => {
              const val = (v || '') as 'active' | 'archived' | '';
              setStatusFilter(val);
              setSearchParams((p) => { const n = new URLSearchParams(p); if (val) n.set('status', val); else n.delete('status'); return n; });
            }}
            placeholder="All statuses"
            options={STATUS_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
            className="min-w-0"
          />
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
                    onClick={() => navigate(`/crm/leads/${client.id}`)}
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
                        onClick={(e) => { e.stopPropagation(); navigate(`/crm/leads/${client.id}`); }}
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
            <p className="text-lg font-subtitle text-primary">No leads found</p>
            <p className="text-sm font-body">Adjust filters or add a new lead.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClientsListPage;
