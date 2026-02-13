import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { X, Plus, Filter } from 'lucide-react';
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
import { FinanceModal, FormField, StatusBadge } from './components';

type Tab = 'contracts' | 'invoices';

const FREQUENCY_OPTIONS = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Yearly' },
];
const CONTRACT_STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'pending', label: 'Pending' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'ended', label: 'Ended' },
];
const INVOICE_STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'sent', label: 'Sent' },
  { value: 'paid', label: 'Paid' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'cancelled', label: 'Cancelled' },
];
const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'amount', label: 'Amount high–low' },
  { value: 'due', label: 'Due date' },
];

function SideDrawer({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <>
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} aria-hidden />
      <div className="fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-xl z-50 flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-brand-200">
          <h3 className="text-lg font-bold text-primary">Details</h3>
          <button type="button" onClick={onClose} className="p-2 text-slate-500 hover:text-primary">
            <X size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-auto p-4">{children}</div>
      </div>
    </>
  );
}

function ContractFormModal({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (data: Omit<FinanceContract, 'id' | 'createdAt' | 'updatedAt'>) => void;
}) {
  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState('');
  const [frequency, setFrequency] = useState<FinanceContract['frequency']>('monthly');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('EUR');
  const [status, setStatus] = useState<FinanceContract['status']>('active');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      clientId: null,
      title: title.trim() || 'Untitled contract',
      startDate,
      endDate: endDate || null,
      frequency,
      amount: parseFloat(amount) || 0,
      currency,
      status,
    });
    onClose();
  };

  return (
    <FinanceModal
      open
      onClose={onClose}
      title="Add Contract"
      footer={
        <>
          <button type="button" onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-medium">
            Cancel
          </button>
          <button
            type="submit"
            form="contract-form"
            className="px-4 py-2 bg-primary text-white rounded-xl font-medium hover:opacity-90"
          >
            Add Contract
          </button>
        </>
      }
    >
      <form id="contract-form" onSubmit={handleSubmit} className="space-y-4">
        <FormField label="Title">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 border border-brand-200 rounded-xl text-primary"
            placeholder="e.g. Annual license"
          />
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Start date">
            <DateTimePicker dateValue={startDate} onChangeDate={setStartDate} showTime={false} placeholder="Select" />
          </FormField>
          <FormField label="End date">
            <DateTimePicker dateValue={endDate} onChangeDate={setEndDate} showTime={false} placeholder="Select" />
          </FormField>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Frequency">
            <Select value={frequency} onChange={(v) => setFrequency(v as FinanceContract['frequency'])} options={FREQUENCY_OPTIONS} placeholder="Select" />
          </FormField>
          <FormField label="Status">
            <Select value={status} onChange={(v) => setStatus(v as FinanceContract['status'])} options={CONTRACT_STATUS_OPTIONS} placeholder="Select" />
          </FormField>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Amount">
            <input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-3 py-2 border border-brand-200 rounded-xl text-primary"
              placeholder="0"
            />
          </FormField>
          <FormField label="Currency">
            <input type="text" value={currency} onChange={(e) => setCurrency(e.target.value)} className="w-full px-3 py-2 border border-brand-200 rounded-xl text-primary" />
          </FormField>
        </div>
      </form>
    </FinanceModal>
  );
}

function InvoiceFormModal({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (data: Omit<FinanceInvoice, 'id' | 'createdAt' | 'updatedAt'>) => void;
}) {
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('EUR');
  const [issueDate, setIssueDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState('');
  const [status, setStatus] = useState<FinanceInvoice['status']>('draft');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      contractId: null,
      title: title.trim() || 'Untitled invoice',
      amount: parseFloat(amount) || 0,
      currency,
      issueDate,
      dueDate: dueDate || null,
      status,
    });
    onClose();
  };

  return (
    <FinanceModal
      open
      onClose={onClose}
      title="Add Invoice"
      footer={
        <>
          <button type="button" onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-medium">
            Cancel
          </button>
          <button type="submit" form="invoice-form" className="px-4 py-2 bg-primary text-white rounded-xl font-medium hover:opacity-90">
            Add Invoice
          </button>
        </>
      }
    >
      <form id="invoice-form" onSubmit={handleSubmit} className="space-y-4">
        <FormField label="Title / Reference">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 border border-brand-200 rounded-xl text-primary"
            placeholder="e.g. Invoice #001"
          />
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Amount">
            <input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full px-3 py-2 border border-brand-200 rounded-xl text-primary" placeholder="0" />
          </FormField>
          <FormField label="Currency">
            <input type="text" value={currency} onChange={(e) => setCurrency(e.target.value)} className="w-full px-3 py-2 border border-brand-200 rounded-xl text-primary" />
          </FormField>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Issue date">
            <DateTimePicker dateValue={issueDate} onChangeDate={setIssueDate} showTime={false} placeholder="Select" />
          </FormField>
          <FormField label="Due date">
            <DateTimePicker dateValue={dueDate} onChangeDate={setDueDate} showTime={false} placeholder="Select" />
          </FormField>
        </div>
        <FormField label="Status">
          <Select value={status} onChange={(v) => setStatus(v as FinanceInvoice['status'])} options={INVOICE_STATUS_OPTIONS} placeholder="Select" />
        </FormField>
      </form>
    </FinanceModal>
  );
}

export default function FinanceIncomePage() {
  const [tab, setTab] = useState<Tab>('contracts');
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const [modalContract, setModalContract] = useState(false);
  const [modalInvoice, setModalInvoice] = useState(false);
  const [searchParams] = useSearchParams();
  const [invoicePill, setInvoicePill] = useState<'all' | 'unpaid' | 'draft' | 'paid'>('all');
  const [invoiceSearch, setInvoiceSearch] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterCustomer, setFilterCustomer] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const queryClient = useQueryClient();

  useEffect(() => {
    const f = searchParams.get('filter');
    if (f === 'overdue') setInvoicePill('unpaid');
  }, [searchParams]);

  const { data: contracts = [], isLoading: contractsLoading } = useQuery({
    queryKey: ['finance-contracts'],
    queryFn: listFinanceContracts,
  });
  const { data: incomeSummary } = useQuery({
    queryKey: ['finance-income-summary'],
    queryFn: getIncomeSummary,
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
    if (sortBy === 'oldest') list = [...list].sort((a, b) => a.issueDate.localeCompare(b.issueDate));
    else if (sortBy === 'amount') list = [...list].sort((a, b) => b.amount - a.amount);
    else if (sortBy === 'due') list = [...list].sort((a, b) => (a.dueDate ?? '').localeCompare(b.dueDate ?? ''));
    else list = [...list].sort((a, b) => b.issueDate.localeCompare(a.issueDate));
    return list;
  }, [invoices, invoiceSearch, sortBy]);
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

  const handleAddContract = async (data: Omit<FinanceContract, 'id' | 'createdAt' | 'updatedAt'>) => {
    await createFinanceContract(data);
    queryClient.invalidateQueries({ queryKey: ['finance-contracts'] });
    queryClient.invalidateQueries({ queryKey: ['finance-dashboard-kpis'] });
    queryClient.invalidateQueries({ queryKey: ['finance-income-expenses-by-month'] });
    queryClient.invalidateQueries({ queryKey: ['finance-payable-owing'] });
  };
  const handleAddInvoice = async (data: Omit<FinanceInvoice, 'id' | 'createdAt' | 'updatedAt'>) => {
    await createFinanceInvoice(data);
    queryClient.invalidateQueries({ queryKey: ['finance-invoices'] });
    queryClient.invalidateQueries({ queryKey: ['finance-dashboard-kpis'] });
    queryClient.invalidateQueries({ queryKey: ['finance-invoices-due'] });
    queryClient.invalidateQueries({ queryKey: ['finance-income-summary'] });
    queryClient.invalidateQueries({ queryKey: ['finance-payable-owing'] });
  };

  const isLoading = tab === 'contracts' ? contractsLoading : invoicesLoading;
  const list = tab === 'contracts' ? contracts : filteredAndSortedInvoices;

  return (
    <div className="p-6 sm:p-8 max-w-6xl mx-auto bg-slate-50/50 min-h-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-title text-primary mb-1">Income</h1>
          <p className="text-slate-600 text-sm">Contracts and invoices.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-xl border border-brand-200 p-1 bg-white">
            <button type="button" onClick={() => setTab('contracts')} className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${tab === 'contracts' ? 'bg-primary text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
              Contracts
            </button>
            <button type="button" onClick={() => setTab('invoices')} className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${tab === 'invoices' ? 'bg-primary text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
              Invoices
            </button>
          </div>
          {tab === 'contracts' ? (
            <button type="button" onClick={() => setModalContract(true)} className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl font-medium hover:opacity-90">
              <Plus size={18} />
              Add Contract
            </button>
          ) : (
            <button type="button" onClick={() => setModalInvoice(true)} className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl font-medium hover:opacity-90">
              <Plus size={18} />
              Create invoice
            </button>
          )}
        </div>
      </div>

      {tab === 'invoices' && incomeSummary && (
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-brand-200/60 p-4">
            <p className="text-xs text-brand-500 font-body mb-1">Overdue amount</p>
            <p className="text-lg font-bold text-primary">{formatCurrency(incomeSummary.overdueAmount)}</p>
          </div>
          <div className="bg-white rounded-xl border border-brand-200/60 p-4">
            <p className="text-xs text-brand-500 font-body mb-1">Unpaid total</p>
            <p className="text-lg font-bold text-primary">{formatCurrency(incomeSummary.unpaidTotal)}</p>
          </div>
          <div className="bg-white rounded-xl border border-brand-200/60 p-4">
            <p className="text-xs text-brand-500 font-body mb-1">Draft total</p>
            <p className="text-lg font-bold text-primary">{formatCurrency(incomeSummary.draftTotal)}</p>
          </div>
          <div className="bg-white rounded-xl border border-brand-200/60 p-4">
            <p className="text-xs text-brand-500 font-body mb-1">Due today</p>
            <p className="text-lg font-bold text-primary">{incomeSummary.dueTodayCount}</p>
          </div>
        </section>
      )}

      {tab === 'invoices' && (
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <input
            type="text"
            placeholder="Search by invoice number or title"
            value={invoiceSearch}
            onChange={(e) => setInvoiceSearch(e.target.value)}
            className="flex-1 min-w-[200px] px-3 py-2 border border-brand-200 rounded-xl text-sm text-primary"
          />
          <div className="relative">
            <button type="button" onClick={() => setFilterOpen((o) => !o)} className="inline-flex items-center gap-2 px-4 py-2 border border-brand-200 bg-white rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50">
              <Filter size={18} />
              Filter
            </button>
            {filterOpen && (
              <>
                <div className="fixed inset-0 z-40" aria-hidden onClick={() => setFilterOpen(false)} />
                <div className="absolute right-0 top-full z-50 mt-2 w-72 p-4 bg-white rounded-xl border border-brand-200 shadow-lg">
                  <FormField label="Customer" className="mb-3">
                    <Select value={filterCustomer} onChange={setFilterCustomer} options={[{ value: '', label: 'All customers' }, ...uniqueClients]} placeholder="All customers" />
                  </FormField>
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <FormField label="From">
                      <DateTimePicker dateValue={filterFrom} onChangeDate={setFilterFrom} showTime={false} placeholder="From" />
                    </FormField>
                    <FormField label="To">
                      <DateTimePicker dateValue={filterTo} onChangeDate={setFilterTo} showTime={false} placeholder="To" />
                    </FormField>
                  </div>
                  <button type="button" onClick={() => setFilterOpen(false)} className="w-full py-2 bg-primary text-white rounded-xl font-medium text-sm">
                    Apply filters
                  </button>
                </div>
              </>
            )}
          </div>
          <Select value={sortBy} onChange={setSortBy} options={SORT_OPTIONS} placeholder="Sort" className="w-40" />
          <div className="flex flex-wrap gap-1">
            {(['all', 'unpaid', 'draft', 'paid'] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setInvoicePill(p)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium ${invoicePill === p ? 'bg-primary text-white' : 'bg-white border border-brand-200 text-slate-600 hover:bg-slate-50'}`}
              >
                {p === 'all' && `All (${invoices.length})`}
                {p === 'unpaid' && `Unpaid (${(invoices as FinanceInvoice[]).filter((i) => i.status === 'sent' || i.status === 'overdue').length})`}
                {p === 'draft' && `Draft (${(invoices as FinanceInvoice[]).filter((i) => i.status === 'draft').length})`}
                {p === 'paid' && `Paid (${(invoices as FinanceInvoice[]).filter((i) => i.status === 'paid').length})`}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-brand-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-slate-500">Loading…</div>
        ) : list.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-slate-500 mb-4">
              {tab === 'contracts' ? 'No contracts yet.' : 'No invoices yet.'}
            </p>
            <button
              type="button"
              onClick={() => (tab === 'contracts' ? setModalContract(true) : setModalInvoice(true))}
              className="text-primary font-medium hover:underline"
            >
              {tab === 'contracts' ? 'Add your first contract' : 'Add your first invoice'}
            </button>
          </div>
        ) : tab === 'contracts' ? (
          <table className="w-full">
            <thead>
              <tr className="border-b border-brand-200 bg-slate-50/80">
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Title</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Lead</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Amount</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Frequency</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Status</th>
              </tr>
            </thead>
            <tbody>
              {(list as FinanceContract[]).map((c) => (
                <tr key={c.id} onClick={() => setDrawerId(c.id)} className="border-b border-brand-100 hover:bg-slate-50/80 cursor-pointer transition-colors">
                  <td className="py-3 px-4 font-medium text-primary">{c.title}</td>
                  <td className="py-3 px-4 text-slate-600">{c.clientName ?? '–'}</td>
                  <td className="py-3 px-4">{formatCurrency(c.amount, c.currency)}</td>
                  <td className="py-3 px-4 text-slate-600">{c.frequency}</td>
                  <td className="py-3 px-4">
                    <StatusBadge status={c.status} variant="contract" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-brand-200 bg-slate-50/80">
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Status</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Date</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Number / Title</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Customer</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Total</th>
              </tr>
            </thead>
            <tbody>
              {(list as FinanceInvoice[]).map((inv) => (
                <tr key={inv.id} onClick={() => setDrawerId(inv.id)} className="border-b border-brand-100 hover:bg-slate-50/80 cursor-pointer transition-colors">
                  <td className="py-3 px-4">
                    <StatusBadge status={inv.status} variant="invoice" />
                  </td>
                  <td className="py-3 px-4 text-slate-600">{inv.issueDate}</td>
                  <td className="py-3 px-4 font-medium text-primary">{inv.title}</td>
                  <td className="py-3 px-4 text-slate-600">{inv.contractId ? (contractIdToClientName.get(inv.contractId) ?? inv.contractTitle ?? '–') : (inv.contractTitle ?? '–')}</td>
                  <td className="py-3 px-4">{formatCurrency(inv.amount, inv.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <SideDrawer open={!!drawerId} onClose={() => setDrawerId(null)}>
        {tab === 'contracts' && selectedContract && (
          <dl className="space-y-3">
            <div><dt className="text-xs text-slate-500">Title</dt><dd className="font-medium text-primary">{selectedContract.title}</dd></div>
            <div><dt className="text-xs text-slate-500">Lead</dt><dd>{selectedContract.clientName ?? '–'}</dd></div>
            <div><dt className="text-xs text-slate-500">Amount</dt><dd>{formatCurrency(selectedContract.amount, selectedContract.currency)}</dd></div>
            <div><dt className="text-xs text-slate-500">Frequency</dt><dd>{selectedContract.frequency}</dd></div>
            <div><dt className="text-xs text-slate-500">Status</dt><dd><StatusBadge status={selectedContract.status} variant="contract" /></dd></div>
            <div><dt className="text-xs text-slate-500">Start date</dt><dd>{selectedContract.startDate}</dd></div>
            {selectedContract.endDate && <div><dt className="text-xs text-slate-500">End date</dt><dd>{selectedContract.endDate}</dd></div>}
          </dl>
        )}
        {tab === 'invoices' && selectedInvoice && (
          <dl className="space-y-3">
            <div><dt className="text-xs text-slate-500">Title</dt><dd className="font-medium text-primary">{selectedInvoice.title}</dd></div>
            <div><dt className="text-xs text-slate-500">Amount</dt><dd>{formatCurrency(selectedInvoice.amount, selectedInvoice.currency)}</dd></div>
            <div><dt className="text-xs text-slate-500">Issue date</dt><dd>{selectedInvoice.issueDate}</dd></div>
            <div><dt className="text-xs text-slate-500">Due date</dt><dd>{selectedInvoice.dueDate ?? '–'}</dd></div>
            <div><dt className="text-xs text-slate-500">Status</dt><dd><StatusBadge status={selectedInvoice.status} variant="invoice" /></dd></div>
          </dl>
        )}
      </SideDrawer>

      {modalContract && <ContractFormModal onClose={() => setModalContract(false)} onSave={handleAddContract} />}
      {modalInvoice && <InvoiceFormModal onClose={() => setModalInvoice(false)} onSave={handleAddInvoice} />}
    </div>
  );
}
