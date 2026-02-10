import React, { useMemo, useState } from 'react';
import { X, Calendar as CalendarIcon, CreditCard, EuroIcon } from 'lucide-react';
import type { Expense } from '../types';

const TODAY = new Date().toISOString().slice(0, 10);

const TAX_RATE_OPTIONS = [21, 10, 4, 0] as const;

const PAYMENT_METHOD_OPTIONS = ['Transferencia', 'Tarjeta', 'Efectivo', 'SEPA', 'Otro'] as const;

export interface NewExpenseModalProps {
  onClose: () => void;
  onSave: (payload: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
}

export const NewExpenseModal: React.FC<NewExpenseModalProps> = ({ onClose, onSave }) => {
  const [date, setDate] = useState<string>(TODAY);
  const [supplierName, setSupplierName] = useState('');
  const [supplierTaxId, setSupplierTaxId] = useState('');
  const [description, setDescription] = useState('');
  const [documentNumber, setDocumentNumber] = useState('');
  const [amountBase, setAmountBase] = useState<string>('0');
  const [taxRate, setTaxRate] = useState<number>(21);
  const [paymentMethod, setPaymentMethod] = useState<string>('Transferencia');
  const [paid, setPaid] = useState(false);
  const [paidDate, setPaidDate] = useState<string>(TODAY);
  const [costCenter, setCostCenter] = useState('');
  const [accountCode, setAccountCode] = useState('629');
  const [submitting, setSubmitting] = useState(false);

  const parsedAmountBase = Number.isNaN(Number(amountBase)) ? 0 : Number(amountBase);

  const { taxAmount, totalAmount } = useMemo(() => {
    const base = parsedAmountBase;
    const tax = +(base * (taxRate / 100)).toFixed(2);
    const total = +(base + tax).toFixed(2);
    return { taxAmount: tax, totalAmount: total };
  }, [parsedAmountBase, taxRate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierName.trim() || !description.trim()) return;
    setSubmitting(true);
    try {
      const payload: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'> = {
        documentNumber: documentNumber || null,
        date,
        dueDate: null,
        description: description.trim(),
        supplierName: supplierName.trim(),
        supplierTaxId: supplierTaxId || null,
        accountCode: accountCode || '629',
        costCenter: costCenter || null,
        currency: 'EUR',
        amountBase: parsedAmountBase,
        taxRate,
        taxAmount,
        totalAmount,
        paymentMethod,
        paid,
        paidDate: paid ? paidDate : null,
        schoolId: null,
        exportedAt: null,
        createdBy: null,
      };
      await onSave(payload);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-brand-200 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-brand-200 bg-primary/5">
          <div className="flex items-center gap-2">
            <EuroIcon className="text-primary w-5 h-5" />
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-primary">Nuevo gasto</h2>
              <p className="text-[11px] text-brand-500 font-body">Registra un gasto para exportarlo después a tu ERP.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-brand-400 hover:text-primary hover:bg-brand-100/60 transition-colors"
            aria-label="Cerrar"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-brand-500 uppercase tracking-wider mb-1">
                Fecha del gasto
              </label>
              <div className="relative">
                <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-400" />
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-brand-200 bg-white text-sm text-primary font-body focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                />
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-brand-500 uppercase tracking-wider mb-1">
                Nº documento (opcional)
              </label>
              <input
                type="text"
                value={documentNumber}
                onChange={(e) => setDocumentNumber(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-brand-200 bg-white text-sm text-primary font-body focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                placeholder="Factura 2025-001"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-brand-500 uppercase tracking-wider mb-1">
                Proveedor
              </label>
              <input
                type="text"
                value={supplierName}
                onChange={(e) => setSupplierName(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-lg border border-brand-200 bg-white text-sm text-primary font-body focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                placeholder="Nombre del proveedor"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-brand-500 uppercase tracking-wider mb-1">
                NIF / CIF (opcional)
              </label>
              <input
                type="text"
                value={supplierTaxId}
                onChange={(e) => setSupplierTaxId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-brand-200 bg-white text-sm text-primary font-body focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                placeholder="B12345678"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-brand-500 uppercase tracking-wider mb-1">
              Descripción
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-lg border border-brand-200 bg-white text-sm text-primary font-body focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
              placeholder="Ej: Suscripción SaaS, viaje comercial, material…"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-brand-500 uppercase tracking-wider mb-1">
                Base imponible
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-brand-400">€</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={amountBase}
                  onChange={(e) => setAmountBase(e.target.value)}
                  className="w-full pl-7 pr-3 py-2 rounded-lg border border-brand-200 bg-white text-sm text-primary font-body focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                />
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-brand-500 uppercase tracking-wider mb-1">
                IVA
              </label>
              <select
                value={taxRate}
                onChange={(e) => setTaxRate(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg border border-brand-200 bg-white text-sm text-primary font-body focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
              >
                {TAX_RATE_OPTIONS.map((rate) => (
                  <option key={rate} value={rate}>
                    {rate}% {rate === 0 ? '(exento)' : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-brand-500 uppercase tracking-wider mb-1">
                Total (con IVA)
              </label>
              <div className="px-3 py-2 rounded-lg border border-brand-200 bg-brand-100/40 text-sm text-primary font-bold flex items-center justify-between">
                <span>{totalAmount.toFixed(2)} €</span>
                <span className="text-[11px] text-brand-500 font-body">IVA: {taxAmount.toFixed(2)} €</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-brand-500 uppercase tracking-wider mb-1">
                Método de pago
              </label>
              <div className="relative">
                <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-400" />
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-brand-200 bg-white text-sm text-primary font-body focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                >
                  {PAYMENT_METHOD_OPTIONS.map((pm) => (
                    <option key={pm} value={pm}>
                      {pm}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-brand-500 uppercase tracking-wider mb-1">
                Cuenta contable
              </label>
              <input
                type="text"
                value={accountCode}
                onChange={(e) => setAccountCode(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-brand-200 bg-white text-sm text-primary font-body focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                placeholder="629, 623…"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-brand-500 uppercase tracking-wider mb-1">
                Centro de coste (opcional)
              </label>
              <input
                type="text"
                value={costCenter}
                onChange={(e) => setCostCenter(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-brand-200 bg-white text-sm text-primary font-body focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                placeholder="Ej: Marketing, Ventas…"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={paid}
                onChange={(e) => setPaid(e.target.checked)}
                className="w-4 h-4 rounded border-brand-300 text-primary focus:ring-primary"
              />
              <span className="text-sm font-body text-primary">Marcar como pagado</span>
            </label>
            {paid && (
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-brand-500 uppercase tracking-wider">Fecha de pago</span>
                <input
                  type="date"
                  value={paidDate}
                  onChange={(e) => setPaidDate(e.target.value)}
                  className="px-2 py-1 rounded-lg border border-brand-200 bg-white text-xs text-primary font-body focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                />
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-brand-200 text-sm font-body text-brand-500 hover:bg-brand-100/40"
              disabled={submitting}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-lg bg-primary text-white text-sm font-bold hover:bg-brand-600 flex items-center gap-2 shadow-md shadow-primary/20 disabled:opacity-60"
              disabled={submitting}
            >
              Guardar gasto
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewExpenseModal;

