import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { Plus, X } from 'lucide-react';
import {
  listFinanceContracts,
  listFinanceInvoices,
  createFinanceContract,
  createFinanceInvoice,
  getFinanceContract,
  getFinanceInvoice,
} from '../../services/finance';
import type { FinanceContract, FinanceInvoice } from '../../types';
import { formatCurrency } from './formatCurrency';

type Tab = 'contracts' | 'invoices';

const STATUS_BADGE_CLASS: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-800',
  pending: 'bg-amber-100 text-amber-800',
  cancelled: 'bg-slate-100 text-slate-600',
  ended: 'bg-slate-100 text-slate-600',
  draft: 'bg-slate-100 text-slate-600',
  sent: 'bg-blue-100 text-blue-800',
  paid: 'bg-emerald-100 text-emerald-800',
  overdue: 'bg-red-100 text-red-800',
};

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} aria-hidden />
      <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full p-6">
        <h2 className="text-xl font-bold text-primary mb-4">Add Contract</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-brand-200 rounded-lg text-primary"
              placeholder="e.g. Annual license"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Start date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-brand-200 rounded-lg text-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">End date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-brand-200 rounded-lg text-primary"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Frequency</label>
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as FinanceContract['frequency'])}
                className="w-full px-3 py-2 border border-brand-200 rounded-lg text-primary"
              >
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as FinanceContract['status'])}
                className="w-full px-3 py-2 border border-brand-200 rounded-lg text-primary"
              >
                <option value="active">Active</option>
                <option value="pending">Pending</option>
                <option value="cancelled">Cancelled</option>
                <option value="ended">Ended</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Amount</label>
              <input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-3 py-2 border border-brand-200 rounded-lg text-primary"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Currency</label>
              <input
                type="text"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full px-3 py-2 border border-brand-200 rounded-lg text-primary"
              />
            </div>
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">
              Cancel
            </button>
            <button type="submit" className="px-4 py-2 bg-primary text-white rounded-lg font-medium hover:opacity-90">
              Add Contract
            </button>
          </div>
        </form>
      </div>
    </div>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} aria-hidden />
      <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full p-6">
        <h2 className="text-xl font-bold text-primary mb-4">Add Invoice</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Title / Reference</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-brand-200 rounded-lg text-primary"
              placeholder="e.g. Invoice #001"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Amount</label>
              <input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-3 py-2 border border-brand-200 rounded-lg text-primary"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Currency</label>
              <input
                type="text"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full px-3 py-2 border border-brand-200 rounded-lg text-primary"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Issue date</label>
              <input
                type="date"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                className="w-full px-3 py-2 border border-brand-200 rounded-lg text-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Due date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 border border-brand-200 rounded-lg text-primary"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as FinanceInvoice['status'])}
              className="w-full px-3 py-2 border border-brand-200 rounded-lg text-primary"
            >
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">
              Cancel
            </button>
            <button type="submit" className="px-4 py-2 bg-primary text-white rounded-lg font-medium hover:opacity-90">
              Add Invoice
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function FinanceIncomePage() {
  const [tab, setTab] = useState<Tab>('contracts');
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const [modalContract, setModalContract] = useState(false);
  const [modalInvoice, setModalInvoice] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState<FinanceInvoice['status'] | ''>(() => (searchParams.get('status') as FinanceInvoice['status']) || '');
  const [invoiceDateFrom, setInvoiceDateFrom] = useState(() => searchParams.get('from') || '');
  const [invoiceDateTo, setInvoiceDateTo] = useState(() => searchParams.get('to') || '');
  const queryClient = useQueryClient();

  useEffect(() => {
    const status = searchParams.get('status');
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    if (status) setInvoiceStatusFilter(status as FinanceInvoice['status']);
    if (from) setInvoiceDateFrom(from);
    if (to) setInvoiceDateTo(to);
  }, [searchParams]);

  const { data: contracts = [], isLoading: contractsLoading } = useQuery({
    queryKey: ['finance-contracts'],
    queryFn: listFinanceContracts,
  });
  const invoiceListParams = React.useMemo(() => {
    const p: { status?: FinanceInvoice['status'] | FinanceInvoice['status'][]; issueDateFrom?: string; issueDateTo?: string } = {};
    if (invoiceStatusFilter) p.status = invoiceStatusFilter;
    if (invoiceDateFrom) p.issueDateFrom = invoiceDateFrom;
    if (invoiceDateTo) p.issueDateTo = invoiceDateTo;
    return Object.keys(p).length ? p : undefined;
  }, [invoiceStatusFilter, invoiceDateFrom, invoiceDateTo]);
  const { data: invoices = [], isLoading: invoicesLoading } = useQuery({
    queryKey: ['finance-invoices', invoiceListParams],
    queryFn: () => listFinanceInvoices(invoiceListParams),
  });
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
  };
  const handleAddInvoice = async (data: Omit<FinanceInvoice, 'id' | 'createdAt' | 'updatedAt'>) => {
    await createFinanceInvoice(data);
    queryClient.invalidateQueries({ queryKey: ['finance-invoices'] });
    queryClient.invalidateQueries({ queryKey: ['finance-dashboard-kpis'] });
    queryClient.invalidateQueries({ queryKey: ['finance-invoices-due'] });
  };

  const isLoading = tab === 'contracts' ? contractsLoading : invoicesLoading;
  const list = tab === 'contracts' ? contracts : invoices;

  return (
    <div className="p-6 sm:p-8 max-w-6xl mx-auto bg-slate-50/50 min-h-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-title text-primary mb-1">Income</h1>
          <p className="text-slate-600 text-sm">Contracts and invoices.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-brand-200 p-1 bg-white">
            <button
              type="button"
              onClick={() => setTab('contracts')}
              className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                tab === 'contracts' ? 'bg-primary text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Contracts
            </button>
            <button
              type="button"
              onClick={() => setTab('invoices')}
              className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                tab === 'invoices' ? 'bg-primary text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Invoices
            </button>
          </div>
          {tab === 'contracts' ? (
            <button
              type="button"
              onClick={() => setModalContract(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg font-medium hover:opacity-90"
            >
              <Plus size={18} />
              Add Contract
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setModalInvoice(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg font-medium hover:opacity-90"
            >
              <Plus size={18} />
              Add Invoice
            </button>
          )}
        </div>
      </div>

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
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Client</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Amount</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Frequency</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Status</th>
              </tr>
            </thead>
            <tbody>
              {(list as FinanceContract[]).map((c) => (
                <tr
                  key={c.id}
                  onClick={() => setDrawerId(c.id)}
                  className="border-b border-brand-100 hover:bg-slate-50/80 cursor-pointer transition-colors"
                >
                  <td className="py-3 px-4 font-medium text-primary">{c.title}</td>
                  <td className="py-3 px-4 text-slate-600">{c.clientName ?? '–'}</td>
                  <td className="py-3 px-4">{formatCurrency(c.amount, c.currency)}</td>
                  <td className="py-3 px-4 text-slate-600">{c.frequency}</td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${STATUS_BADGE_CLASS[c.status] ?? 'bg-slate-100'}`}>
                      {c.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-brand-200 bg-slate-50/80">
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Title</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Amount</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Issue date</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Due date</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Status</th>
              </tr>
            </thead>
            <tbody>
              {(list as FinanceInvoice[]).map((inv) => (
                <tr
                  key={inv.id}
                  onClick={() => setDrawerId(inv.id)}
                  className="border-b border-brand-100 hover:bg-slate-50/80 cursor-pointer transition-colors"
                >
                  <td className="py-3 px-4 font-medium text-primary">{inv.title}</td>
                  <td className="py-3 px-4">{formatCurrency(inv.amount, inv.currency)}</td>
                  <td className="py-3 px-4 text-slate-600">{inv.issueDate}</td>
                  <td className="py-3 px-4 text-slate-600">{inv.dueDate ?? '–'}</td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${STATUS_BADGE_CLASS[inv.status] ?? 'bg-slate-100'}`}>
                      {inv.status}
                    </span>
                  </td>
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
            <div><dt className="text-xs text-slate-500">Client</dt><dd>{selectedContract.clientName ?? '–'}</dd></div>
            <div><dt className="text-xs text-slate-500">Amount</dt><dd>{formatCurrency(selectedContract.amount, selectedContract.currency)}</dd></div>
            <div><dt className="text-xs text-slate-500">Frequency</dt><dd>{selectedContract.frequency}</dd></div>
            <div><dt className="text-xs text-slate-500">Status</dt><dd><span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${STATUS_BADGE_CLASS[selectedContract.status] ?? ''}`}>{selectedContract.status}</span></dd></div>
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
            <div><dt className="text-xs text-slate-500">Status</dt><dd><span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${STATUS_BADGE_CLASS[selectedInvoice.status] ?? ''}`}>{selectedInvoice.status}</span></dd></div>
          </dl>
        )}
      </SideDrawer>

      {modalContract && <ContractFormModal onClose={() => setModalContract(false)} onSave={handleAddContract} />}
      {modalInvoice && <InvoiceFormModal onClose={() => setModalInvoice(false)} onSave={handleAddInvoice} />}
    </div>
  );
}
