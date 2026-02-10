import React, { useMemo, useState } from 'react';
import type { EsPurchaseInvoice, EsPurchaseLine, EsPurchasePayment } from '../types';
import { ChevronRight, X } from 'lucide-react';

const STATUSES: EsPurchaseInvoice['status'][] = ['Pendiente', 'Parcialmente pagada', 'Pagada', 'Cancelada'];

const MOCK_PURCHASE_INVOICES: EsPurchaseInvoice[] = [
  {
    id: 'pinv-1',
    supplierId: 'sup-1',
    supplierName: 'Proveedor SaaS',
    invoiceNumber: 'F-2025-001',
    issueDate: '2025-01-10',
    receptionDate: '2025-01-10',
    dueDate: '2025-02-10',
    currency: 'EUR',
    totalBase: 300,
    totalTax: 63,
    totalAmount: 363,
    status: 'Pendiente',
  },
  {
    id: 'pinv-2',
    supplierId: 'sup-2',
    supplierName: 'Proveedor Marketing',
    invoiceNumber: 'MKT-2025-010',
    issueDate: '2025-01-05',
    receptionDate: '2025-01-05',
    dueDate: '2025-01-20',
    currency: 'EUR',
    totalBase: 800,
    totalTax: 168,
    totalAmount: 968,
    status: 'Parcialmente pagada',
  },
];

const MOCK_PURCHASE_LINES: EsPurchaseLine[] = [
  {
    id: 'pline-1',
    purchaseInvoiceId: 'pinv-1',
    description: 'Suscripción mensual CRM',
    expenseAccount: '629',
    quantity: 1,
    unitPrice: 300,
    taxRateId: null,
    baseAmount: 300,
    taxAmount: 63,
    totalAmount: 363,
    position: 1,
  },
  {
    id: 'pline-2',
    purchaseInvoiceId: 'pinv-2',
    description: 'Campaña anuncios enero',
    expenseAccount: '627',
    quantity: 1,
    unitPrice: 800,
    taxRateId: null,
    baseAmount: 800,
    taxAmount: 168,
    totalAmount: 968,
    position: 1,
  },
];

const MOCK_PURCHASE_PAYMENTS: EsPurchasePayment[] = [
  {
    id: 'ppay-1',
    purchaseInvoiceId: 'pinv-2',
    amount: 500,
    paymentDate: '2025-01-25',
    method: 'Transferencia',
    status: 'Confirmado',
  },
];

const BillingExpensesTab: React.FC = () => {
  const purchases = MOCK_PURCHASE_INVOICES;
  const isLoading = false;

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<EsPurchaseInvoice['status'][]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<EsPurchaseInvoice | null>(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return purchases.filter((inv) => {
      const matchesStatus = statusFilter.length === 0 || statusFilter.includes(inv.status);
      const matchesSearch =
        !q ||
        inv.invoiceNumber.toLowerCase().includes(q) ||
        inv.supplierName?.toLowerCase().includes(q) ||
        inv.id.toLowerCase().includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [purchases, search, statusFilter]);

  const toggleStatus = (s: EsPurchaseInvoice['status']) => {
    setStatusFilter((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );
  };

  return (
    <div className="bg-white rounded-2xl border border-brand-200/80 shadow-sm p-6 sm:p-7 flex flex-col lg:flex-row gap-6">
      <div className="flex-1 min-w-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-lg sm:text-xl font-title text-primary mb-1">Gastos y compras</h3>
            <p className="text-xs sm:text-sm text-slate-600 font-body">
              Revisa las facturas de proveedores y sus pagos.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="text"
              placeholder="Buscar por proveedor o nº factura…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="px-3 py-2 rounded-lg border border-brand-200 text-sm font-body text-primary placeholder:text-slate-400 bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary min-w-[220px]"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          {STATUSES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => toggleStatus(s)}
              className={`px-3 py-1.5 rounded-full text-[11px] font-bold border transition-all ${
                statusFilter.includes(s)
                  ? 'bg-primary text-white border-primary'
                  : 'bg-white text-brand-600 border-brand-200 hover:border-brand-400'
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        <div className="mt-2 border border-brand-200 rounded-xl overflow-hidden bg-white max-h-[480px] sm:max-h-[540px] flex flex-col">
          <div className="overflow-x-auto overflow-y-auto flex-1">
            <table className="w-full text-left border-collapse min-w-[680px]">
              <thead className="sticky top-0 bg-brand-100/40 z-10 border-b border-brand-200">
                <tr className="text-[10px] sm:text-[11px] text-brand-500 font-bold uppercase tracking-wider">
                  <th className="py-3 px-3 sm:px-4">Proveedor</th>
                  <th className="py-3 px-3 sm:px-4">Nº factura</th>
                  <th className="py-3 px-3 sm:px-4 hidden md:table-cell">Fecha emisión</th>
                  <th className="py-3 px-3 sm:px-4 hidden md:table-cell">Vencimiento</th>
                  <th className="py-3 px-3 sm:px-4 text-right">Importe</th>
                  <th className="py-3 px-3 sm:px-4">Estado</th>
                  <th className="py-3 px-3 sm:px-4 text-right w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-100 text-sm">
                {isLoading && (
                  <tr>
                    <td colSpan={7} className="py-6 px-4 text-center text-slate-500 font-body text-sm">
                      Cargando gastos…
                    </td>
                  </tr>
                )}
                {!isLoading && filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-6 px-4 text-center text-slate-500 font-body text-sm">
                      No hay facturas de compra que coincidan con los filtros.
                    </td>
                  </tr>
                )}
                {!isLoading &&
                  filtered.map((inv) => (
                    <tr key={inv.id} className="hover:bg-brand-100/20 transition-colors">
                      <td className="py-3 px-3 sm:px-4">
                        <span className="text-sm text-slate-800 font-body truncate max-w-[220px]">
                          {inv.supplierName || 'Proveedor sin nombre'}
                        </span>
                      </td>
                      <td className="py-3 px-3 sm:px-4 font-body text-sm text-primary font-semibold">
                        {inv.invoiceNumber}
                      </td>
                      <td className="py-3 px-3 sm:px-4 text-slate-700 font-body text-sm hidden md:table-cell">
                        {inv.issueDate}
                      </td>
                      <td className="py-3 px-3 sm:px-4 text-slate-700 font-body text-sm hidden md:table-cell">
                        {inv.dueDate ?? '—'}
                      </td>
                      <td className="py-3 px-3 sm:px-4 text-right text-slate-800 font-body text-sm">
                        {inv.totalAmount.toFixed(2)} {inv.currency}
                      </td>
                      <td className="py-3 px-3 sm:px-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                            inv.status === 'Pagada'
                              ? 'bg-emerald-100 text-emerald-800'
                              : inv.status === 'Parcialmente pagada'
                              ? 'bg-amber-100 text-amber-800'
                              : inv.status === 'Cancelada'
                              ? 'bg-slate-200 text-slate-700'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {inv.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 sm:px-4 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedInvoice(inv)}
                          className="p-2 bg-brand-100/60 text-brand-500 rounded-lg hover:bg-brand-600 hover:text-white transition-colors"
                          aria-label="Ver detalle"
                        >
                          <ChevronRight size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {selectedInvoice && (
        <PurchaseDetailPanel invoice={selectedInvoice} onClose={() => setSelectedInvoice(null)} />
      )}
    </div>
  );
};

function PurchaseDetailPanel({
  invoice,
  onClose,
}: {
  invoice: EsPurchaseInvoice;
  onClose: () => void;
}) {
  const lines = MOCK_PURCHASE_LINES.filter((l) => l.purchaseInvoiceId === invoice.id);
  const payments = MOCK_PURCHASE_PAYMENTS.filter((p) => p.purchaseInvoiceId === invoice.id);
  const loadingLines = false;
  const loadingPayments = false;

  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  const pending = invoice.totalAmount - totalPaid;

  return (
    <aside className="w-full lg:w-[360px] xl:w-[420px] bg-white rounded-2xl border border-brand-200/80 shadow-lg p-5 sm:p-6 flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="text-sm font-title text-primary uppercase tracking-wide mb-1">
            Detalle de compra
          </h4>
          <p className="text-lg font-title text-primary">
            {invoice.invoiceNumber}
          </p>
          <p className="text-xs text-slate-500 font-body">
            {invoice.supplierName || 'Proveedor sin nombre'} · {invoice.issueDate}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-primary transition-colors"
          aria-label="Cerrar detalle"
        >
          <X size={16} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs sm:text-sm font-body">
        <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
          <p className="text-slate-500 mb-1">Importe total</p>
          <p className="text-primary font-bold">
            {invoice.totalAmount.toFixed(2)} {invoice.currency}
          </p>
        </div>
        <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
          <p className="text-slate-500 mb-1">Pagado</p>
          <p className="text-emerald-700 font-bold">
            {totalPaid.toFixed(2)} {invoice.currency}
          </p>
        </div>
        <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
          <p className="text-slate-500 mb-1">Pendiente</p>
          <p className="text-amber-700 font-bold">
            {pending.toFixed(2)} {invoice.currency}
          </p>
        </div>
        <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
          <p className="text-slate-500 mb-1">Estado</p>
          <p className="text-slate-800 font-bold">{invoice.status}</p>
        </div>
      </div>

      <div className="flex-1 min-h-[120px] overflow-y-auto border-t border-brand-100 pt-3 mt-1">
        <h5 className="text-xs font-title text-primary uppercase tracking-wide mb-2">Líneas</h5>
        {loadingLines && (
          <p className="text-xs text-slate-500 font-body">Cargando líneas…</p>
        )}
        {!loadingLines && lines.length === 0 && (
          <p className="text-xs text-slate-500 font-body">No hay líneas de compra.</p>
        )}
        {!loadingLines && lines.length > 0 && (
          <ul className="space-y-2 text-xs font-body">
            {lines.map((l) => (
              <li
                key={l.id}
                className="flex items-start justify-between gap-3 border border-slate-100 rounded-lg p-2.5"
              >
                <div className="flex-1">
                  <p className="font-semibold text-slate-800 truncate">{l.description}</p>
                  <p className="text-[11px] text-slate-500">
                    {l.quantity} × {l.unitPrice.toFixed(2)} · cuenta {l.expenseAccount}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] text-slate-500">Base</p>
                  <p className="text-[11px] font-semibold text-slate-800">
                    {l.baseAmount.toFixed(2)}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">Total</p>
                  <p className="text-[11px] font-semibold text-primary">
                    {l.totalAmount.toFixed(2)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="border-t border-brand-100 pt-3">
        <h5 className="text-xs font-title text-primary uppercase tracking-wide mb-2">Pagos</h5>
        {loadingPayments && (
          <p className="text-xs text-slate-500 font-body">Cargando pagos…</p>
        )}
        {!loadingPayments && payments.length === 0 && (
          <p className="text-xs text-slate-500 font-body">No hay pagos registrados.</p>
        )}
        {!loadingPayments && payments.length > 0 && (
          <ul className="space-y-1.5 text-xs font-body">
            {payments.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-slate-800 font-semibold">
                    {p.amount.toFixed(2)} {invoice.currency}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {p.paymentDate} · {p.method}
                  </p>
                </div>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    p.status === 'Confirmado'
                      ? 'bg-emerald-100 text-emerald-800'
                      : p.status === 'Pendiente'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {p.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}

export default BillingExpensesTab;

