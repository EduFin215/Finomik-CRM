import React, { useState } from 'react';
import { FinanceModal, FormField } from './';
import { DateTimePicker } from '../../tasks/DateTimePicker';
import { Select } from '../../tasks/Select';
import { FinanceInvoice } from '../../../types';

const INVOICE_STATUS_OPTIONS = [
    { value: 'draft', label: 'Borrador' },
    { value: 'sent', label: 'Enviada' },
    { value: 'paid', label: 'Pagada' },
    { value: 'overdue', label: 'Vencida' },
    { value: 'cancelled', label: 'Cancelada' },
];

interface InvoiceFormModalProps {
    onClose: () => void;
    onSave: (data: any) => void;
    initialContractId?: string;
}

export function InvoiceFormModal({ onClose, onSave, initialContractId }: InvoiceFormModalProps) {
    const [title, setTitle] = useState('');
    const [amount, setAmount] = useState('');
    const [currency, setCurrency] = useState('EUR');
    const [issueDate, setIssueDate] = useState(new Date().toISOString().slice(0, 10));
    const [dueDate, setDueDate] = useState('');
    const [status, setStatus] = useState<FinanceInvoice['status']>('draft');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({
            contractId: initialContractId || null,
            title: title.trim() || 'Factura sin título',
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
            title="Crear Factura"
            footer={
                <>
                    <button type="button" onClick={onClose} className="px-4 py-2 text-brand-600 font-bold text-sm hover:bg-brand-50 rounded-xl transition-colors">Cancelar</button>
                    <button type="submit" form="invoice-form" className="px-5 py-2 bg-primary text-white font-bold text-sm rounded-xl hover:bg-brand-600 shadow-md transition-all">Crear Factura</button>
                </>
            }
        >
            <form id="invoice-form" onSubmit={handleSubmit} className="space-y-5">
                <FormField label="Referencia / Título">
                    <input type="text" value={title} onChange={e => setTitle(e.target.value)} className="w-full px-4 py-2.5 border border-brand-200/60 rounded-xl text-primary focus:ring-2 focus:ring-primary/10 focus:border-primary outline-none transition-all" placeholder="Ej. FAC-2024-001" autoFocus />
                </FormField>
                <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-2">
                        <FormField label="Importe Total">
                            <input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} className="w-full px-4 py-2.5 border border-brand-200/60 rounded-xl text-primary focus:ring-2 focus:ring-primary/10 focus:border-primary outline-none transition-all" placeholder="0.00" />
                        </FormField>
                    </div>
                    <FormField label="Moneda">
                        <input type="text" value={currency} onChange={e => setCurrency(e.target.value)} className="w-full px-4 py-2.5 border border-brand-200/60 rounded-xl text-primary focus:ring-2 focus:ring-primary/10 focus:border-primary outline-none transition-all" />
                    </FormField>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <FormField label="Fecha Emisión">
                        <DateTimePicker dateValue={issueDate} onChangeDate={setIssueDate} showTime={false} placeholder="Seleccionar" />
                    </FormField>
                    <FormField label="Fecha Vencimiento">
                        <DateTimePicker dateValue={dueDate} onChangeDate={setDueDate} showTime={false} placeholder="Seleccionar" />
                    </FormField>
                </div>
                <FormField label="Estado">
                    <Select value={status} onChange={v => setStatus(v as any)} options={INVOICE_STATUS_OPTIONS} placeholder="Seleccionar" />
                </FormField>
            </form>
        </FinanceModal>
    );
}
