import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import {
  X,
  Plus,
  Filter,
  Search,
  FileText,
  Calendar,
  MoreHorizontal,
  ArrowUpDown,
  Download,
  CheckCircle2,
  AlertCircle,
  Clock
} from 'lucide-react';
import {
  listFinanceContracts,
  listFinanceInvoices,
  createFinanceContract,
  createFinanceInvoice,
  getFinanceContract,
  getFinanceInvoice,
  getIncomeSummary,
} from '../../services/finance';
import type { FinanceContract, FinanceInvoice } from '../../types';
import { formatCurrency } from './formatCurrency';
import { DateTimePicker } from '../tasks/DateTimePicker';
import { Select } from '../tasks/Select';
import { FinanceModal, FormField, StatusBadge, ContractFormModal, InvoiceFormModal } from './components';
// --- Types & Options ---

const SORT_OPTIONS = [
  { value: 'newest', label: 'Más recientes' },
  { value: 'oldest', label: 'Más antiguas' },
  { value: 'amount', label: 'Importe alto-bajo' },
  { value: 'due', label: 'F. Vencimiento' },
];

// --- Types & Options ---

type Tab = 'contracts' | 'invoices';



// --- Components ---

function SummaryMetric({
  label,
  value,
  icon: Icon,
  colorClass
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  colorClass: string
}) {
  return (
    <div className="bg-white rounded-xl border border-brand-very-soft/60 p-4 flex items-start justify-between shadow-sm hover:shadow-md transition-shadow">
      <div>
        <p className="text-brand-muted text-xs font-medium uppercase tracking-wider mb-1">{label}</p>
        <p className="text-xl font-extrabold text-primary">{value}</p>
      </div>
      <div className={`p-2 rounded-lg ${colorClass}`}>
        <Icon size={20} />
      </div>
    </div>
  );
}

function SideDrawer({
  open,
  onClose,
  children,
  title
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
}) {
  if (!open) return null;
  return (
    <>
      <div className="fixed inset-0 bg-primary/20 backdrop-blur-sm z-40 transition-opacity" onClick={onClose} aria-hidden />
      <div className="fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-300">
        <div className="flex items-center justify-between p-6 border-b border-brand-very-soft/50 bg-slate-50/50">
          <h3 className="text-xl font-bold text-primary">{title || 'Detalles'}</h3>
          <button type="button" onClick={onClose} className="p-2 text-brand-muted hover:text-primary hover:bg-brand-100/50 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-brand-100">{children}</div>
      </div>
    </>
  );
}

// --- Main Page Component ---

export default function FinanceIncomePage() {
  const [tab, setTab] = useState<Tab>('invoices'); // Default to invoices
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const [modalContract, setModalContract] = useState(false);
  const [modalInvoice, setModalInvoice] = useState(false);
  const [searchParams] = useSearchParams();
  const [invoicePill, setInvoicePill] = useState<'all' | 'unpaid' | 'draft' | 'paid'>('all');
  const [invoiceSearch, setInvoiceSearch] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterCustomer, setFilterCustomer] = useState('');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const queryClient = useQueryClient();

  useEffect(() => {
    const f = searchParams.get('filter');
    if (f === 'overdue') {
      setTab('invoices');
      setInvoicePill('unpaid');
    }
  }, [searchParams]);

  const { data: contracts = [], isLoading: contractsLoading } = useQuery({
    queryKey: ['finance-contracts'],
    queryFn: listFinanceContracts,
  });
  const { data: incomeSummary } = useQuery({
    queryKey: ['finance-income-summary'],
    queryFn: getIncomeSummary,
    enabled: tab === 'invoices',
  });

  const invoiceListParams = useMemo(() => {
    const p: { status?: FinanceInvoice['status'] | FinanceInvoice['status'][]; issueDateFrom?: string; issueDateTo?: string; contractIds?: string[] } = {};
    if (invoicePill === 'unpaid') p.status = ['sent', 'overdue'];
    else if (invoicePill === 'draft') p.status = 'draft';
    else if (invoicePill === 'paid') p.status = 'paid';
    if (filterFrom) p.issueDateFrom = filterFrom;
    if (filterTo) p.issueDateTo = filterTo;
    if (filterCustomer && contracts.length) {
      const ids = contracts.filter((c) => c.clientId === filterCustomer).map((c) => c.id);
      if (ids.length) p.contractIds = ids;
    }
    return Object.keys(p).length ? p : undefined;
  }, [invoicePill, filterFrom, filterTo, filterCustomer, contracts]);

  const { data: invoices = [], isLoading: invoicesLoading } = useQuery({
    queryKey: ['finance-invoices', invoiceListParams],
    queryFn: () => listFinanceInvoices(invoiceListParams),
  });

  const uniqueClients = useMemo(() => {
    const seen = new Set<string>();
    const out: { value: string; label: string }[] = [];
    for (const c of contracts) {
      if (c.clientId && c.clientName && !seen.has(c.clientId)) {
        seen.add(c.clientId);
        out.push({ value: c.clientId, label: c.clientName });
      }
    }
    return out;
  }, [contracts]);

  const contractIdToClientName = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of contracts) {
      if (c.id && c.clientName) m.set(c.id, c.clientName);
    }
    return m;
  }, [contracts]);

  const filteredAndSortedInvoices = useMemo(() => {
    let list = invoices as FinanceInvoice[];
    if (invoiceSearch.trim()) {
      const q = invoiceSearch.toLowerCase().trim();
      list = list.filter((inv) => inv.title.toLowerCase().includes(q));
    }
    // Sorting logic
    if (sortBy === 'oldest') list = [...list].sort((a, b) => a.issueDate.localeCompare(b.issueDate));
    else if (sortBy === 'amount') list = [...list].sort((a, b) => b.amount - a.amount);
    else if (sortBy === 'due') list = [...list].sort((a, b) => (a.dueDate ?? '').localeCompare(b.dueDate ?? ''));
    else list = [...list].sort((a, b) => b.issueDate.localeCompare(a.issueDate));
    return list;
  }, [invoices, invoiceSearch, sortBy]);

  // Handle Saves
  const handleAddContract = async (data: any) => {
    await createFinanceContract(data);
    queryClient.invalidateQueries({ queryKey: ['finance-contracts'] });
    queryClient.invalidateQueries({ queryKey: ['finance-dashboard-kpis'] });
  };
  const handleAddInvoice = async (data: any) => {
    await createFinanceInvoice(data);
    queryClient.invalidateQueries({ queryKey: ['finance-invoices'] });
    queryClient.invalidateQueries({ queryKey: ['finance-dashboard-kpis'] });
    queryClient.invalidateQueries({ queryKey: ['finance-income-summary'] });
  };

  // Selected item data
  const { data: selectedContract } = useQuery({
    queryKey: ['finance-contract', drawerId],
    queryFn: () => getFinanceContract(drawerId!),
    enabled: tab === 'contracts' && !!drawerId,
  });
  const { data: selectedInvoice } = useQuery({
    queryKey: ['finance-invoice', drawerId],
    queryFn: () => getFinanceInvoice(drawerId!),
    enabled: tab === 'invoices' && !!drawerId,
  });

  const isLoading = tab === 'contracts' ? contractsLoading : invoicesLoading;
  const list = tab === 'contracts' ? contracts : filteredAndSortedInvoices;

  return (
    <div className="p-6 sm:p-8 max-w-[1600px] mx-auto min-h-full space-y-6">

      {/* Header Area */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-extrabold text-primary tracking-tight">Gestión de Ingresos</h1>
          <p className="text-brand-muted mt-1">Administra contratos de clientes y emite facturas.</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Custom Tab Switcher */}
          <div className="p-1 bg-white border border-brand-very-soft/60 rounded-xl flex shadow-sm">
            <button
              onClick={() => setTab('invoices')}
              className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${tab === 'invoices' ? 'bg-primary text-white shadow-md' : 'text-brand-muted hover:bg-slate-50'}`}
            >
              Facturas
            </button>
            <button
              onClick={() => setTab('contracts')}
              className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${tab === 'contracts' ? 'bg-primary text-white shadow-md' : 'text-brand-muted hover:bg-slate-50'}`}
            >
              Contratos
            </button>
          </div>

          <button
            onClick={() => tab === 'invoices' ? setModalInvoice(true) : setModalContract(true)}
            className="bg-primary hover:bg-brand-600 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-brand-500/20 transition-all text-sm flex items-center gap-2"
          >
            <Plus size={18} strokeWidth={2.5} />
            {tab === 'invoices' ? 'Nueva Factura' : 'Nuevo Contrato'}
          </button>
        </div>
      </div>

      {/* Invoice Summary Cards (Only visible on Invoices tab) */}
      {tab === 'invoices' && incomeSummary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
          <SummaryMetric
            label="Importe Vencido"
            value={formatCurrency(incomeSummary.overdueAmount)}
            icon={AlertCircle}
            colorClass="bg-red-50 text-red-600"
          />
          <SummaryMetric
            label="Total Impagado"
            value={formatCurrency(incomeSummary.unpaidTotal)}
            icon={Clock}
            colorClass="bg-amber-50 text-amber-600"
          />
          <SummaryMetric
            label="En Borrador"
            value={formatCurrency(incomeSummary.draftTotal)}
            icon={FileText}
            colorClass="bg-slate-100 text-slate-600"
          />
          <SummaryMetric
            label="Vence Hoy"
            value={incomeSummary.dueTodayCount}
            icon={Calendar}
            colorClass="bg-brand-50 text-brand-600"
          />
        </div>
      )}

      {/* Filter Bar */}
      {tab === 'invoices' && (
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between bg-white p-2 rounded-2xl border border-brand-very-soft/50 shadow-sm">

          {/* Left: Search & Filters */}
          <div className="flex flex-1 items-center gap-3 w-full lg:w-auto">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-400 w-4 h-4" />
              <input
                type="text"
                value={invoiceSearch}
                onChange={e => setInvoiceSearch(e.target.value)}
                placeholder="Buscar facturas..."
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border-none rounded-xl text-sm font-medium text-primary placeholder:text-brand-soft focus:ring-2 focus:ring-primary/10 transition-all"
              />
            </div>

            <div className="relative">
              <button
                onClick={() => setFilterOpen(!filterOpen)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold transition-colors ${filterOpen || filterCustomer || filterFrom ? 'bg-brand-50 text-primary' : 'bg-transparent text-brand-muted hover:bg-slate-50'}`}
              >
                <Filter size={16} />
                <span>Filtrar</span>
              </button>

              {filterOpen && (
                <div className="absolute top-full left-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-brand-very-soft/60 p-4 z-50 animate-in zoom-in-95 duration-200">
                  <h4 className="text-xs font-bold text-brand-muted uppercase tracking-wider mb-4 border-b border-brand-very-soft/50 pb-2">Filtrar Facturas</h4>
                  <div className="space-y-4">
                    <FormField label="Cliente">
                      <Select value={filterCustomer} onChange={setFilterCustomer} options={[{ value: '', label: 'Todos los clientes' }, ...uniqueClients]} placeholder="Todos" />
                    </FormField>
                    <div className="grid grid-cols-2 gap-2">
                      <FormField label="Desde">
                        <DateTimePicker dateValue={filterFrom} onChangeDate={setFilterFrom} showTime={false} placeholder="Selec." />
                      </FormField>
                      <FormField label="Hasta">
                        <DateTimePicker dateValue={filterTo} onChangeDate={setFilterTo} showTime={false} placeholder="Selec." />
                      </FormField>
                    </div>
                    <button onClick={() => setFilterOpen(false)} className="w-full py-2 bg-primary text-white rounded-xl text-sm font-bold">Aplicar Filtros</button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right: Sort & Pills */}
          <div className="flex items-center gap-4 w-full lg:w-auto justify-between lg:justify-end">
            <div className="flex bg-slate-50 p-1 rounded-xl">
              <button onClick={() => setInvoicePill('all')} className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all ${invoicePill === 'all' ? 'bg-white text-primary shadow-sm ring-1 ring-black/5' : 'text-brand-muted hover:text-primary'}`}>Todas</button>
              <button onClick={() => setInvoicePill('unpaid')} className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all ${invoicePill === 'unpaid' ? 'bg-white text-primary shadow-sm ring-1 ring-black/5' : 'text-brand-muted hover:text-primary'}`}>Impagadas</button>
              <button onClick={() => setInvoicePill('draft')} className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all ${invoicePill === 'draft' ? 'bg-white text-primary shadow-sm ring-1 ring-black/5' : 'text-brand-muted hover:text-primary'}`}>Borrador</button>
              <button onClick={() => setInvoicePill('paid')} className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all ${invoicePill === 'paid' ? 'bg-white text-primary shadow-sm ring-1 ring-black/5' : 'text-brand-muted hover:text-primary'}`}>Pagadas</button>
            </div>
            <div className="w-px h-6 bg-brand-very-soft/60 mx-1 hidden lg:block" />
            <Select
              value={sortBy}
              onChange={setSortBy}
              options={SORT_OPTIONS}
              className="w-40"
              icon={<ArrowUpDown size={14} />}
            />
          </div>
        </div>
      )}

      {/* Main Data Table */}
      <div className="bg-white rounded-2xl border border-brand-very-soft/50 shadow-card overflow-hidden min-h-[400px]">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-20 text-brand-muted">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
            <p className="text-sm font-medium">Cargando...</p>
          </div>
        ) : list.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-20 text-center">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-brand-muted mb-4 shadow-sm">
              {tab === 'invoices' ? <FileText size={32} strokeWidth={1.5} /> : <FileText size={32} strokeWidth={1.5} />}
            </div>
            <h3 className="text-lg font-bold text-primary mb-1">No se encontraron {tab === 'invoices' ? 'facturas' : 'contratos'}</h3>
            <p className="text-brand-muted text-sm max-w-xs mx-auto mb-6">No tienes {tab === 'invoices' ? 'facturas' : 'contratos'} que coincidan con los filtros.</p>
            <button
              onClick={() => tab === 'invoices' ? setModalInvoice(true) : setModalContract(true)}
              className="text-primary font-bold text-sm hover:underline"
            >
              Crear {tab === 'invoices' ? 'nueva factura' : 'nuevo contrato'}
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50/50 border-b border-brand-very-soft/50">
                  {tab === 'invoices' ? (
                    <>
                      <th className="text-left py-4 px-6 text-xs font-bold text-brand-muted uppercase tracking-wider w-32">Estado</th>
                      <th className="text-left py-4 px-6 text-xs font-bold text-brand-muted uppercase tracking-wider">Referencia</th>
                      <th className="text-left py-4 px-6 text-xs font-bold text-brand-muted uppercase tracking-wider">Cliente</th>
                      <th className="text-left py-4 px-6 text-xs font-bold text-brand-muted uppercase tracking-wider">Fecha</th>
                      <th className="text-right py-4 px-6 text-xs font-bold text-brand-muted uppercase tracking-wider">Importe</th>
                    </>
                  ) : (
                    <>
                      <th className="text-left py-4 px-6 text-xs font-bold text-brand-muted uppercase tracking-wider w-32">Estado</th>
                      <th className="text-left py-4 px-6 text-xs font-bold text-brand-muted uppercase tracking-wider">Título</th>
                      <th className="text-left py-4 px-6 text-xs font-bold text-brand-muted uppercase tracking-wider">Cliente</th>
                      <th className="text-left py-4 px-6 text-xs font-bold text-brand-muted uppercase tracking-wider">Frecuencia</th>
                      <th className="text-right py-4 px-6 text-xs font-bold text-brand-muted uppercase tracking-wider">Valor</th>
                    </>
                  )}
                  <th className="w-10"></th>
                </tr>
              </thead>
              <tbody>
                {list.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => setDrawerId(item.id)}
                    className="group border-b border-brand-very-soft/30 hover:bg-brand-50/30 transition-colors cursor-pointer last:border-0"
                  >
                    {tab === 'invoices' ? (
                      <>
                        <td className="py-4 px-6">
                          <StatusBadge status={(item as FinanceInvoice).status} variant="invoice" />
                        </td>
                        <td className="py-4 px-6">
                          <div className="font-bold text-primary group-hover:text-brand-600 transition-colors text-sm">{(item as FinanceInvoice).title}</div>
                          <div className="text-xs text-brand-muted mt-0.5">Vence: {(item as FinanceInvoice).dueDate ?? '–'}</div>
                        </td>
                        <td className="py-4 px-6 text-sm text-brand-700 font-medium">
                          {(item as FinanceInvoice).contractId ? (contractIdToClientName.get((item as FinanceInvoice).contractId!) ?? (item as FinanceInvoice).contractTitle ?? '–') : ((item as FinanceInvoice).contractTitle ?? '–')}
                        </td>
                        <td className="py-4 px-6 text-sm text-brand-muted">{(item as FinanceInvoice).issueDate}</td>
                        <td className="py-4 px-6 text-right font-bold text-primary text-sm">
                          {formatCurrency((item as FinanceInvoice).amount, (item as FinanceInvoice).currency)}
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="py-4 px-6">
                          <StatusBadge status={(item as FinanceContract).status} variant="contract" />
                        </td>
                        <td className="py-4 px-6">
                          <div className="font-bold text-primary group-hover:text-brand-600 transition-colors text-sm">{(item as FinanceContract).title}</div>
                          <div className="text-xs text-brand-muted mt-0.5">Inicio: {(item as FinanceContract).startDate}</div>
                        </td>
                        <td className="py-4 px-6 text-sm text-brand-700 font-medium">{(item as FinanceContract).clientName ?? '–'}</td>
                        <td className="py-4 px-6 text-sm text-brand-muted capitalize">{(item as FinanceContract).frequency === 'monthly' ? 'Mensual' : (item as FinanceContract).frequency === 'quarterly' ? 'Trimestral' : 'Anual'}</td>
                        <td className="py-4 px-6 text-right font-bold text-primary text-sm">
                          {formatCurrency((item as FinanceContract).amount, (item as FinanceContract).currency)}
                        </td>
                      </>
                    )}
                    <td className="py-4 px-6 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                      <MoreHorizontal size={18} className="text-brand-muted" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Item Details Side Drawer */}
      <SideDrawer
        open={!!drawerId}
        onClose={() => setDrawerId(null)}
        title={tab === 'contracts' ? 'Detalles del Contrato' : 'Detalles de la Factura'}
      >
        {tab === 'contracts' && selectedContract ? (
          <div className="space-y-6">
            <div className="p-4 bg-slate-50 rounded-xl border border-brand-very-soft/50">
              <p className="text-xs text-brand-muted uppercase tracking-wider mb-1">Valor Total</p>
              <p className="text-2xl font-extrabold text-primary">{formatCurrency(selectedContract.amount, selectedContract.currency)}</p>
              <p className="text-sm font-medium text-brand-muted mt-1 capitalize">Facturado {selectedContract.frequency === 'monthly' ? 'mensualmente' : selectedContract.frequency === 'quarterly' ? 'trimestralmente' : 'anualmente'}</p>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center py-3 border-b border-brand-very-soft/30">
                <span className="text-sm text-brand-muted font-medium">Estado</span>
                <StatusBadge status={selectedContract.status} variant="contract" />
              </div>
              <div className="flex justify-between items-center py-3 border-b border-brand-very-soft/30">
                <span className="text-sm text-brand-muted font-medium">Cliente</span>
                <span className="text-sm font-bold text-primary">{selectedContract.clientName ?? '–'}</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-brand-very-soft/30">
                <span className="text-sm text-brand-muted font-medium">Fecha Inicio</span>
                <span className="text-sm font-medium text-primary">{selectedContract.startDate}</span>
              </div>
              {selectedContract.endDate && (
                <div className="flex justify-between items-center py-3 border-b border-brand-very-soft/30">
                  <span className="text-sm text-brand-muted font-medium">Fecha Fin</span>
                  <span className="text-sm font-medium text-primary">{selectedContract.endDate}</span>
                </div>
              )}
            </div>
          </div>
        ) : tab === 'invoices' && selectedInvoice ? (
          <div className="space-y-6">
            <div className="p-4 bg-slate-50 rounded-xl border border-brand-very-soft/50 flex justify-between items-center">
              <div>
                <p className="text-xs text-brand-muted uppercase tracking-wider mb-1">Importe Factura</p>
                <p className="text-2xl font-extrabold text-primary">{formatCurrency(selectedInvoice.amount, selectedInvoice.currency)}</p>
              </div>
              <StatusBadge status={selectedInvoice.status} variant="invoice" />
            </div>

            <div className="space-y-4">
              <div className="py-3 border-b border-brand-very-soft/30">
                <span className="block text-xs text-brand-muted font-medium uppercase mb-1">Referencia</span>
                <span className="text-base font-bold text-primary">{selectedInvoice.title}</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-brand-very-soft/30">
                <span className="text-sm text-brand-muted font-medium">Fecha Emisión</span>
                <span className="text-sm font-medium text-primary">{selectedInvoice.issueDate}</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-brand-very-soft/30">
                <span className="text-sm text-brand-muted font-medium">Fecha Vencimiento</span>
                <span className={`text-sm font-bold ${selectedInvoice.status === 'overdue' ? 'text-red-600' : 'text-primary'}`}>
                  {selectedInvoice.dueDate ?? '–'}
                </span>
              </div>

              {/* Actions area placeholder - could add "Mark as Paid" or "Download PDF" here */}
              <div className="pt-4 flex gap-3">
                <button className="flex-1 py-2.5 bg-primary text-white rounded-xl font-bold text-sm hover:bg-brand-600 transition-colors shadow-md">
                  Descargar PDF
                </button>
                {selectedInvoice.status !== 'paid' && (
                  <button className="flex-1 py-2.5 bg-brand-50 text-brand-700 border border-brand-200 rounded-xl font-bold text-sm hover:bg-brand-100 transition-colors">
                    Marcar Pagado
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </SideDrawer>

      {modalContract && <ContractFormModal onClose={() => setModalContract(false)} onSave={handleAddContract} />}
      {modalInvoice && <InvoiceFormModal onClose={() => setModalInvoice(false)} onSave={handleAddInvoice} />}
    </div>
  );
}
