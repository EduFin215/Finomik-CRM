import React, { useState } from 'react';
import { AcademicCapIcon, PhoneIcon } from '@heroicons/react/24/solid';
import { Save } from 'lucide-react';
import { School, Phase, CommercialStatus } from '../types';
import { Select } from '../modules/tasks/Select';
import { Modal } from './ui/Modal';

interface NewSchoolModalProps {
  onClose: () => void;
  onCreate: (school: School) => void;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_NAME = 200;
const MAX_CITY = 100;

const NewSchoolModal: React.FC<NewSchoolModalProps> = ({ onClose, onCreate }) => {
  const [formData, setFormData] = useState<Partial<School>>({
    name: '',
    city: '',
    region: '',
    phone: '',
    email: '',
    contactPerson: '',
    role: '',
    notes: '',
    phase: Phase.LEAD,
    status: CommercialStatus.NONE,
  });
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; city?: string; email?: string }>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (fieldErrors[name as keyof typeof fieldErrors]) setFieldErrors(prev => ({ ...prev, [name]: undefined }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: { name?: string; city?: string; email?: string } = {};
    const name = (formData.name || '').trim();
    const city = (formData.city || '').trim();
    const email = (formData.email || '').trim().toLowerCase();
    if (!name) errors.name = 'El nombre es obligatorio';
    else if (name.length > MAX_NAME) errors.name = `Máximo ${MAX_NAME} caracteres`;
    if (!city) errors.city = 'La ciudad es obligatoria';
    else if (city.length > MAX_CITY) errors.city = `Máximo ${MAX_CITY} caracteres`;
    if (!email) errors.email = 'El email es obligatorio';
    else if (!EMAIL_REGEX.test(email)) errors.email = 'Email no válido';
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});

    const newSchool: School = {
      ...formData as School,
      id: `man-${Date.now()}`,
      name,
      city,
      email,
      activities: [],
      tasks: [],
      milestones: []
    };

    onCreate(newSchool);
  };

  const footer = (
    <>
      <button
        type="button"
        onClick={onClose}
        className="px-4 py-2 rounded-xl border border-brand-200 text-brand-500 font-bold text-sm hover:bg-white transition-all font-body"
      >
        Cancelar
      </button>
      <button
        onClick={handleSubmit}
        className="px-4 py-2 rounded-xl bg-primary text-white font-bold text-sm hover:bg-brand-600 transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/30"
      >
        <Save size={18} />
        Guardar Lead
      </button>
    </>
  );

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={
        <div className="flex items-center gap-3">
          <div className="bg-brand-100/50 p-2 rounded-xl text-primary">
            <AcademicCapIcon className="w-6 h-6" />
          </div>
          <div>
            <span className="block text-xl font-extrabold">Nuevo Lead</span>
            <span className="block text-brand-muted text-xs font-body font-normal mt-0.5">Completa los datos para registrar el lead.</span>
          </div>
        </div>
      }
      maxWidth="2xl"
      footer={footer}
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-brand-500 uppercase tracking-widest flex items-center gap-2 border-b border-brand-very-soft/40 pb-2">
              <AcademicCapIcon className="w-3.5 h-3.5" /> Información Básica
            </h3>

            <div className="relative">
              <label className="text-[10px] font-bold text-brand-500 absolute top-2 left-3">Nombre del Colegio *</label>
              <input
                required
                maxLength={MAX_NAME}
                name="name"
                value={formData.name}
                onChange={handleChange}
                className={`w-full pt-6 pb-2 px-3 bg-slate-50 border rounded-xl focus:bg-white focus:ring-2 focus:ring-brand-100 focus:border-primary outline-none transition-all text-sm font-body text-primary ${fieldErrors.name ? 'border-red-400' : 'border-brand-200'}`}
                placeholder="Ej: Colegio San José"
              />
              {fieldErrors.name && <p className="text-xs text-red-600 mt-1 font-body">{fieldErrors.name}</p>}
            </div>
          </div>

          <div className="relative">
            <label className="text-[10px] font-bold text-brand-500 absolute top-2 left-3">Ciudad *</label>
            <input
              required
              maxLength={MAX_CITY}
              name="city"
              value={formData.city}
              onChange={handleChange}
              className={`w-full pt-6 pb-2 px-3 bg-slate-50 border rounded-xl focus:bg-white focus:ring-2 focus:ring-brand-100 focus:border-primary outline-none transition-all text-sm font-body ${fieldErrors.city ? 'border-red-400' : 'border-brand-200'}`}
              placeholder="Ej: Madrid"
            />
            {fieldErrors.city && <p className="text-xs text-red-600 mt-1 font-body">{fieldErrors.city}</p>}
          </div>

          <div className="relative">
            <label className="text-[10px] font-bold text-brand-500 absolute top-2 left-3">Región</label>
            <input
              name="region"
              value={formData.region}
              onChange={handleChange}
              className="w-full pt-6 pb-2 px-3 bg-slate-50 border border-brand-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-brand-100 focus:border-primary outline-none transition-all text-sm font-body"
              placeholder="Ej: Comunidad de Madrid"
            />
          </div>

          <div className="space-y-4 mt-2">
            <h3 className="text-xs font-bold text-brand-400 uppercase tracking-widest flex items-center gap-2 border-b border-brand-very-soft/40 pb-2">
              <PhoneIcon className="w-3.5 h-3.5" /> Contacto
            </h3>
          </div>

          <div className="relative">
            <label className="text-[10px] font-bold text-brand-500 absolute top-2 left-3">Teléfono</label>
            <input
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className="w-full pt-6 pb-2 px-3 bg-slate-50 border border-brand-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-brand-100 focus:border-primary outline-none transition-all text-sm font-body"
              placeholder="Ej: 910 00 00 00"
            />
          </div>

          <div className="relative">
            <label className="text-[10px] font-bold text-brand-500 absolute top-2 left-3">Email *</label>
            <input
              required
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className={`w-full pt-6 pb-2 px-3 bg-slate-50 border rounded-xl focus:bg-white focus:ring-2 focus:ring-brand-100 focus:border-primary outline-none transition-all text-sm font-body ${fieldErrors.email ? 'border-red-400' : 'border-brand-200'}`}
              placeholder="ejemplo@escuela.com"
            />
            {fieldErrors.email && <p className="text-xs text-red-600 mt-1 font-body">{fieldErrors.email}</p>}
          </div>

          <div className="relative">
            <label className="text-[10px] font-bold text-brand-500 absolute top-2 left-3">Persona de Contacto</label>
            <input
              name="contactPerson"
              value={formData.contactPerson}
              onChange={handleChange}
              className="w-full pt-6 pb-2 px-3 bg-slate-50 border border-brand-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-brand-100 focus:border-primary outline-none transition-all text-sm font-body"
              placeholder="Nombre y Apellidos"
            />
          </div>

          <div className="relative">
            <label className="text-[10px] font-bold text-brand-500 absolute top-2 left-3">Cargo</label>
            <input
              name="role"
              value={formData.role}
              onChange={handleChange}
              className="w-full pt-6 pb-2 px-3 bg-slate-50 border border-brand-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-brand-100 focus:border-primary outline-none transition-all text-sm font-body"
              placeholder="Ej: Director/a"
            />
          </div>

          <div className="space-y-4 mt-2">
            <h3 className="text-xs font-bold text-brand-400 uppercase tracking-widest border-b border-brand-very-soft/40 pb-2">Pipeline y Estado</h3>
          </div>

          <div>
            <Select
              label="Fase Inicial"
              value={formData.phase ?? ''}
              onChange={(v) => setFormData((prev) => ({ ...prev, phase: v as Phase }))}
              placeholder="Fase"
              options={Object.values(Phase).map((p) => ({ value: p, label: p }))}
            />
          </div>

          <div>
            <Select
              label="Estado Comercial"
              value={formData.status ?? ''}
              onChange={(v) => setFormData((prev) => ({ ...prev, status: v as CommercialStatus }))}
              placeholder="Estado"
              options={Object.values(CommercialStatus).map((s) => ({ value: s, label: s }))}
            />
          </div>

          <div className="relative mt-2">
            <label className="text-[10px] font-bold text-brand-500 absolute top-2 left-3">Notas Internas</label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows={3}
              className="w-full pt-6 pb-2 px-3 bg-slate-50 border border-brand-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-brand-100 focus:border-primary outline-none transition-all text-sm font-body min-h-[100px]"
              placeholder="Detalles relevantes de la escuela..."
            />
          </div>
        </div>
      </form>
    </Modal>
  );
};

export default NewSchoolModal;
