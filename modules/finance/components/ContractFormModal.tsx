import React, { useState } from 'react';
import { FinanceModal, FormField } from './';
import { DateTimePicker } from '../../tasks/DateTimePicker';
import { Select } from '../../tasks/Select';
import { FinanceContract } from '../../../types';

const FREQUENCY_OPTIONS = [
    { value: 'monthly', label: 'Mensual' },
    { value: 'quarterly', label: 'Trimestral' },
    { value: 'yearly', label: 'Anual' },
];

const CONTRACT_STATUS_OPTIONS = [
    { value: 'active', label: 'Activo' },
    { value: 'pending', label: 'Pendiente' },
    { value: 'cancelled', label: 'Cancelado' },
    { value: 'ended', label: 'Finalizado' },
];

interface ContractFormModalProps {
    onClose: () => void;
    onSave: (data: any) => void;
    initialClientId?: string;
}

export function ContractFormModal({ onClose, onSave, initialClientId }: ContractFormModalProps) {
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
            clientId: initialClientId || null,
            title: title.trim() || 'Contrato sin título',
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
            title="Nuevo Contrato"
            footer={
                <>
                    <button type="button" onClick={onClose} className="px-4 py-2 text-brand-600 font-bold text-sm hover:bg-brand-50 rounded-xl transition-colors">Cancelar</button>
                    <button type="submit" form="contract-form" className="px-5 py-2 bg-primary text-white font-bold text-sm rounded-xl hover:bg-brand-600 shadow-md transition-all">Crear Contrato</button>
                </>
            }
        >
            <form id="contract-form" onSubmit={handleSubmit} className="space-y-5">
                <FormField label="Título del Contrato">
                    <input type="text" value={title} onChange={e => setTitle(e.target.value)} className="w-full px-4 py-2.5 border border-brand-200/60 rounded-xl text-primary focus:ring-2 focus:ring-primary/10 focus:border-primary outline-none transition-all" placeholder="Ej. Mantenimiento Web" autoFocus />
                </FormField>
                <div className="grid grid-cols-2 gap-4">
                    <FormField label="Fecha Inicio">
                        <DateTimePicker dateValue={startDate} onChangeDate={setStartDate} showTime={false} placeholder="Seleccionar" />
                    </FormField>
                    <FormField label="Fecha Fin (Opcional)">
                        <DateTimePicker dateValue={endDate} onChangeDate={setEndDate} showTime={false} placeholder="Sin fecha fin" />
                    </FormField>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <FormField label="Frecuencia Facturación">
                        <Select value={frequency} onChange={v => setFrequency(v as any)} options={FREQUENCY_OPTIONS} placeholder="Seleccionar" />
                    </FormField>
                    <FormField label="Estado">
                        <Select value={status} onChange={v => setStatus(v as any)} options={CONTRACT_STATUS_OPTIONS} placeholder="Seleccionar" />
                    </FormField>
                </div>
                <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-2">
                        <FormField label="Importe">
                            <input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} className="w-full px-4 py-2.5 border border-brand-200/60 rounded-xl text-primary focus:ring-2 focus:ring-primary/10 focus:border-primary outline-none transition-all" placeholder="0.00" />
                        </FormField>
                    </div>
                    <FormField label="Moneda">
                        <input type="text" value={currency} onChange={e => setCurrency(e.target.value)} className="w-full px-4 py-2.5 border border-brand-200/60 rounded-xl text-primary focus:ring-2 focus:ring-primary/10 focus:border-primary outline-none transition-all" />
                    </FormField>
                </div>
            </form>
        </FinanceModal>
    );
}
