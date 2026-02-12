import React, { useState } from 'react';
import { FileText, Repeat, Euro, BarChart3, Receipt, CreditCard } from 'lucide-react';
import { ToolLayout } from './layout/ToolLayout';
import { TOOLS } from '../config/tools';
import BillingContractsTab from './BillingContractsTab';
import BillingInvoicesTab from './BillingInvoicesTab';
import BillingVatTab from './BillingVatTab';
import BillingExpensesTab from './BillingExpensesTab';
import BillingBankTab from './BillingBankTab';

type BillingTab = 'contracts' | 'invoices' | 'vat' | 'expenses' | 'bank';

const FINANCE_TOOL = TOOLS.find((t) => t.id === 'finance')!;

const BillingView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<BillingTab>('contracts');

  return (
    <ToolLayout currentTool={FINANCE_TOOL}>
      <div className="h-full flex overflow-hidden">
      {/* Sidebar similar al CRM, pero para el módulo de facturación */}
      <aside className="w-64 bg-primary text-white flex flex-col shrink-0">
        <div className="p-4 flex flex-col items-center gap-2">
          <div className="bg-white p-2 rounded-xl shadow-sm border border-primary/20">
            <img src="/finomik-logo-white.png" alt="Finomik" className="h-8 w-auto object-contain" />
          </div>
          <span className="text-[10px] uppercase tracking-widest text-brand-200 font-body">
            Facturación e IVA España
          </span>
        </div>
        <nav className="flex-1 px-4 space-y-1">
          <button
            type="button"
            onClick={() => setActiveTab('contracts')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors font-bold text-sm ${
              activeTab === 'contracts'
                ? 'bg-brand-600 text-white border-l-4 border-white rounded-l-none'
                : 'text-brand-200 hover:bg-brand-600/80'
            }`}
          >
            <Repeat size={18} />
            <span>Contratos</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('invoices')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors font-bold text-sm ${
              activeTab === 'invoices'
                ? 'bg-brand-600 text-white border-l-4 border-white rounded-l-none'
                : 'text-brand-200 hover:bg-brand-600/80'
            }`}
          >
            <FileText size={18} />
            <span>Facturas y cobros</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('vat')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors font-bold text-sm ${
              activeTab === 'vat'
                ? 'bg-brand-600 text-white border-l-4 border-white rounded-l-none'
                : 'text-brand-200 hover:bg-brand-600/80'
            }`}
          >
            <Euro size={18} />
            <span>IVA / Modelos</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('expenses')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors font-bold text-sm ${
              activeTab === 'expenses'
                ? 'bg-brand-600 text-white border-l-4 border-white rounded-l-none'
                : 'text-brand-200 hover:bg-brand-600/80'
            }`}
          >
            <Receipt size={18} />
            <span>Gastos / Compras</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('bank')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors font-bold text-sm ${
              activeTab === 'bank'
                ? 'bg-brand-600 text-white border-l-4 border-white rounded-l-none'
                : 'text-brand-200 hover:bg-brand-600/80'
            }`}
          >
            <CreditCard size={18} />
            <span>Banco</span>
          </button>
        </nav>
      </aside>

      <main className="flex-1 px-6 sm:px-10 py-8 bg-slate-50/60">
        <section className="max-w-6xl mx-auto mb-6">
          <div className="mb-4 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl sm:text-3xl font-title text-primary mb-1">Panel de contabilidad</h2>
              <p className="text-slate-600 font-body text-sm sm:text-base">
                Gestiona contratos, facturas, gastos y modelos de IVA para tus centros en España.
              </p>
            </div>
          </div>
        </section>

        <section className="max-w-6xl mx-auto">
          {activeTab === 'contracts' && <BillingContractsTab />}
          {activeTab === 'invoices' && <BillingInvoicesTab />}
          {activeTab === 'vat' && <BillingVatTab />}
          {activeTab === 'expenses' && <BillingExpensesTab />}
          {activeTab === 'bank' && <BillingBankTab />}
        </section>

        <section className="max-w-6xl mx-auto mt-10">
          <div className="bg-white rounded-2xl border border-brand-200/80 shadow-sm p-7 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-100 text-primary flex items-center justify-center shadow-inner">
                <BarChart3 size={20} />
              </div>
              <div>
                <h3 className="text-base font-title text-primary">Próximo paso</h3>
                <p className="text-xs sm:text-sm text-slate-600 font-body">
                  Conecta los contratos del CRM con este módulo para que al cerrar una venta se cree automáticamente su contrato
                  de facturación.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
    </ToolLayout>
  );
};

export default BillingView;

