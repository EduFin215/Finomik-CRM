import React, { useState } from 'react';
import { X, Save, School as SchoolIcon, Phone } from 'lucide-react';
import { School, Phase, CommercialStatus } from '../types';

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

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="new-school-title" className="fixed inset-0 bg-primary/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden">
        <div className="bg-primary text-white p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-brand-600 p-2 rounded-xl">
              <SchoolIcon size={24} />
            </div>
            <div>
              <h2 id="new-school-title" className="text-xl font-extrabold">Añadir Nuevo Centro</h2>
              <p className="text-brand-200 text-xs font-body">Completa los datos para registrar la escuela en el CRM.</p>
            </div>
          </div>
          <button onClick={onClose} className="text-brand-200 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 max-h-[80vh] overflow-y-auto bg-brand-100/30">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4 md:col-span-2">
              <h3 className="text-xs font-bold text-brand-500 uppercase tracking-widest flex items-center gap-2">
                <SchoolIcon size={14} /> Información Básica
              </h3>
              <div className="relative">
                <label className="text-[10px] font-bold text-brand-500 absolute top-2 left-3">Nombre del Colegio *</label>
                <input
                  required
                  maxLength={MAX_NAME}
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className={`w-full pt-6 pb-2 px-3 bg-white border rounded-xl focus:ring-2 focus:ring-brand-100 focus:border-primary outline-none transition-all text-sm font-body text-primary ${fieldErrors.name ? 'border-red-400' : 'border-brand-200'}`}
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
                className={`w-full pt-6 pb-2 px-3 bg-white border rounded-xl focus:ring-2 focus:ring-brand-100 focus:border-primary outline-none transition-all text-sm font-body ${fieldErrors.city ? 'border-red-400' : 'border-brand-200'}`}
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
                className="w-full pt-6 pb-2 px-3 bg-white border border-brand-200 rounded-xl focus:ring-2 focus:ring-brand-100 focus:border-primary outline-none transition-all text-sm font-body"
                placeholder="Ej: Comunidad de Madrid"
              />
            </div>

            <div className="space-y-4 md:col-span-2 mt-4">
              <h3 className="text-xs font-bold text-brand-400 uppercase tracking-widest flex items-center gap-2">
                <Phone size={14} /> Contacto
              </h3>
            </div>

            <div className="relative">
              <label className="text-[10px] font-bold text-brand-500 absolute top-2 left-3">Teléfono</label>
              <input
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="w-full pt-6 pb-2 px-3 bg-white border border-brand-200 rounded-xl focus:ring-2 focus:ring-brand-100 focus:border-primary outline-none transition-all text-sm font-body"
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
                className={`w-full pt-6 pb-2 px-3 bg-white border rounded-xl focus:ring-2 focus:ring-brand-100 focus:border-primary outline-none transition-all text-sm font-body ${fieldErrors.email ? 'border-red-400' : 'border-brand-200'}`}
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
                className="w-full pt-6 pb-2 px-3 bg-white border border-brand-200 rounded-xl focus:ring-2 focus:ring-brand-100 focus:border-primary outline-none transition-all text-sm font-body"
                placeholder="Nombre y Apellidos"
              />
            </div>

            <div className="relative">
              <label className="text-[10px] font-bold text-brand-500 absolute top-2 left-3">Cargo</label>
              <input
                name="role"
                value={formData.role}
                onChange={handleChange}
                className="w-full pt-6 pb-2 px-3 bg-white border border-brand-200 rounded-xl focus:ring-2 focus:ring-brand-100 focus:border-primary outline-none transition-all text-sm font-body"
                placeholder="Ej: Director/a"
              />
            </div>

            <div className="space-y-4 md:col-span-2 mt-4">
              <h3 className="text-xs font-bold text-brand-400 uppercase tracking-widest">Pipeline y Estado</h3>
            </div>

            <div className="relative">
              <label className="text-[10px] font-bold text-brand-500 absolute top-2 left-3">Fase Inicial</label>
              <select
                name="phase"
                value={formData.phase}
                onChange={handleChange}
                className="w-full pt-6 pb-2 px-3 bg-white border border-brand-200 rounded-xl focus:ring-2 focus:ring-brand-100 focus:border-primary outline-none transition-all text-sm font-body appearance-none"
              >
                {Object.values(Phase).map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>

            <div className="relative">
              <label className="text-[10px] font-bold text-brand-500 absolute top-2 left-3">Estado Comercial</label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full pt-6 pb-2 px-3 bg-white border border-brand-200 rounded-xl focus:ring-2 focus:ring-brand-100 focus:border-primary outline-none transition-all text-sm font-body appearance-none"
              >
                {Object.values(CommercialStatus).map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div className="md:col-span-2 relative mt-4">
              <label className="text-[10px] font-bold text-brand-500 absolute top-2 left-3">Notas Internas</label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows={3}
                className="w-full pt-6 pb-2 px-3 bg-white border border-brand-200 rounded-xl focus:ring-2 focus:ring-brand-100 focus:border-primary outline-none transition-all text-sm font-body min-h-[100px]"
                placeholder="Detalles relevantes de la escuela..."
              />
            </div>
          </div>

          <div className="mt-8 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-2xl border border-brand-200 text-brand-500 font-bold text-sm hover:bg-white transition-all font-body"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-[2] py-3 rounded-2xl bg-primary text-white font-bold text-sm hover:bg-brand-600 transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/30"
            >
              <Save size={18} />
              Guardar Escuela
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewSchoolModal;
