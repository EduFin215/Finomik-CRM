import React, { useState, useEffect } from 'react';
import { Link2, X } from 'lucide-react';
import type {
  Resource,
  ResourceSource,
  ResourceType,
  ResourceStatus,
  ResourceEntityType,
} from '../../types';

const SOURCE_OPTIONS: { value: ResourceSource; label: string }[] = [
  { value: 'google_drive', label: 'Google Drive' },
  { value: 'canva', label: 'Canva' },
  { value: 'figma', label: 'Figma' },
  { value: 'notion', label: 'Notion' },
  { value: 'loom', label: 'Loom' },
  { value: 'other', label: 'Otro' },
];

const TYPE_OPTIONS: { value: ResourceType; label: string }[] = [
  { value: 'logo', label: 'Logo' },
  { value: 'contract', label: 'Contrato' },
  { value: 'deck', label: 'Deck' },
  { value: 'template', label: 'Plantilla' },
  { value: 'report', label: 'Informe' },
  { value: 'image', label: 'Imagen' },
  { value: 'video', label: 'Video' },
  { value: 'spreadsheet', label: 'Hoja de cálculo' },
  { value: 'doc', label: 'Documento' },
  { value: 'other', label: 'Otro' },
];

const STATUS_OPTIONS: { value: ResourceStatus; label: string }[] = [
  { value: 'draft', label: 'Borrador' },
  { value: 'final', label: 'Final' },
  { value: 'archived', label: 'Archivado' },
];

export interface ResourceFormState {
  title: string;
  url: string;
  type: ResourceType;
  source: ResourceSource;
  status: ResourceStatus;
  version: string;
  description: string;
  linkToEntityType: ResourceEntityType | '';
  linkToEntityId: string;
  isPrimary: boolean;
}

const emptyForm: ResourceFormState = {
  title: '',
  url: '',
  type: 'other',
  source: 'other',
  status: 'draft',
  version: '',
  description: '',
  linkToEntityType: '',
  linkToEntityId: '',
  isPrimary: false,
};

interface ResourceFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: ResourceFormState) => Promise<void>;
  editingResource?: Resource | null;
  /** Preselect entity when opening from SchoolDetail */
  presetEntity?: { entityType: ResourceEntityType; entityId: string };
}

export function ResourceFormModal({
  isOpen,
  onClose,
  onSave,
  editingResource,
  presetEntity,
}: ResourceFormModalProps) {
  const [form, setForm] = useState<ResourceFormState>(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (editingResource) {
        setForm({
          title: editingResource.title,
          url: editingResource.url,
          type: editingResource.type,
          source: editingResource.source,
          status: editingResource.status,
          version: editingResource.version ?? '',
          description: editingResource.description ?? '',
          linkToEntityType: presetEntity?.entityType ?? '',
          linkToEntityId: presetEntity?.entityId ?? '',
          isPrimary: false,
        });
      } else if (presetEntity) {
        setForm({
          ...emptyForm,
          linkToEntityType: presetEntity.entityType,
          linkToEntityId: presetEntity.entityId,
          isPrimary: false,
        });
      } else {
        setForm(emptyForm);
      }
    }
  }, [isOpen, editingResource, presetEntity]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = form.url.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      alert('La URL debe empezar por http:// o https://');
      return;
    }
    if (!form.title.trim()) {
      alert('El título es obligatorio');
      return;
    }
    setSaving(true);
    try {
      await onSave(form);
      onClose();
    } catch {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between gap-2 mb-4">
          <h2 className="text-lg font-bold text-primary flex items-center gap-2">
            <Link2 className="w-5 h-5 text-brand-600" />
            {editingResource ? 'Editar recurso' : 'Nuevo recurso'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-brand-500 hover:bg-brand-100"
            aria-label="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-brand-700 uppercase tracking-wide mb-1">
                Título *
              </label>
              <input
                type="text"
                value={form.title}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, title: e.target.value }))
                }
                className="w-full rounded-lg border border-brand-200 px-3 py-2 text-sm text-primary focus:border-brand-500 focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-brand-700 uppercase tracking-wide mb-1">
                Tipo *
              </label>
              <select
                value={form.type}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    type: e.target.value as ResourceType,
                  }))
                }
                className="w-full rounded-lg border border-brand-200 px-3 py-2 text-sm text-primary focus:border-brand-500 focus:outline-none"
              >
                {TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-brand-700 uppercase tracking-wide mb-1">
              URL *
            </label>
            <input
              type="url"
              value={form.url}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, url: e.target.value }))
              }
              placeholder="https://..."
              className="w-full rounded-lg border border-brand-200 px-3 py-2 text-sm text-primary focus:border-brand-500 focus:outline-none"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-brand-700 uppercase tracking-wide mb-1">
                Origen
              </label>
              <select
                value={form.source}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    source: e.target.value as ResourceSource,
                  }))
                }
                className="w-full rounded-lg border border-brand-200 px-3 py-2 text-sm text-primary focus:border-brand-500 focus:outline-none"
              >
                {SOURCE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-brand-700 uppercase tracking-wide mb-1">
                Estado
              </label>
              <select
                value={form.status}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    status: e.target.value as ResourceStatus,
                  }))
                }
                className="w-full rounded-lg border border-brand-200 px-3 py-2 text-sm text-primary focus:border-brand-500 focus:outline-none"
              >
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-brand-700 uppercase tracking-wide mb-1">
                Versión
              </label>
              <input
                type="text"
                value={form.version}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, version: e.target.value }))
                }
                placeholder="v1, 2026-final..."
                className="w-full rounded-lg border border-brand-200 px-3 py-2 text-sm text-primary focus:border-brand-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-brand-700 uppercase tracking-wide mb-1">
              Descripción
            </label>
            <textarea
              value={form.description}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, description: e.target.value }))
              }
              rows={3}
              className="w-full rounded-lg border border-brand-200 px-3 py-2 text-sm text-primary focus:border-brand-500 focus:outline-none"
            />
          </div>

          {!editingResource && (
            <div className="rounded-lg border border-brand-100 bg-brand-50/50 p-4 space-y-3">
              <p className="text-xs font-bold text-brand-600 uppercase tracking-wide">
                Vincular a entidad
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-brand-600 mb-1">
                    Tipo de entidad
                  </label>
                  <select
                    value={form.linkToEntityType}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        linkToEntityType: e.target
                          .value as ResourceEntityType | '',
                      }))
                    }
                    className="w-full rounded-lg border border-brand-200 px-3 py-2 text-sm text-primary focus:border-brand-500 focus:outline-none"
                  >
                    <option value="">— No vincular —</option>
                    <option value="client">Cliente</option>
                    <option value="deal">Deal</option>
                    <option value="project">Proyecto</option>
                    <option value="task">Tarea</option>
                    <option value="internal">Interno</option>
                  </select>
                </div>
                {form.linkToEntityType && form.linkToEntityType !== 'internal' && (
                  <div>
                    <label className="block text-xs text-brand-600 mb-1">
                      ID entidad
                    </label>
                    <input
                      type="text"
                      value={form.linkToEntityId}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          linkToEntityId: e.target.value,
                        }))
                      }
                      placeholder="UUID del cliente, deal..."
                      className="w-full rounded-lg border border-brand-200 px-3 py-2 text-sm text-primary focus:border-brand-500 focus:outline-none"
                    />
                  </div>
                )}
              </div>
              {form.linkToEntityType && (
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.isPrimary}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        isPrimary: e.target.checked,
                      }))
                    }
                    className="rounded border-brand-300"
                  />
                  <span className="text-sm text-brand-700">
                    Marcar como recurso principal para este tipo
                  </span>
                </label>
              )}
            </div>
          )}

          <div className="mt-6 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-brand-200 px-4 py-2 text-sm font-bold text-brand-700 hover:bg-brand-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-bold text-white hover:bg-brand-500 disabled:opacity-50"
            >
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
