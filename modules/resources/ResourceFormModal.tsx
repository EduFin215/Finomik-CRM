import React, { useState, useEffect } from 'react';
import {
  Link2,
  Image,
  FileText,
  Film,
  FileSpreadsheet,
  FileType,
  LayoutTemplate,
  BarChart2,
  Palette,
  File,
  Folder,
  ChevronDown,
} from 'lucide-react';
import type {
  Resource,
  ResourceSource,
  ResourceType,
  ResourceStatus,
  ResourceEntityType,
} from '../../types';
import { buildFolderTree } from '../../services/resourceFolders';
import type { ResourceFolder } from '../../types';
import { Select } from '../tasks/Select';
import { Modal } from '../../components/ui/Modal';

interface FolderNode extends ResourceFolder {
  children: FolderNode[];
}

function flattenFoldersForSelect(nodes: FolderNode[], depth = 0): { id: string; name: string }[] {
  const result: { id: string; name: string }[] = [];
  for (const node of nodes) {
    result.push({ id: node.id, name: '  '.repeat(depth) + node.name });
    result.push(...flattenFoldersForSelect(node.children, depth + 1));
  }
  return result;
}

const SOURCE_OPTIONS: { value: ResourceSource; label: string; icon: typeof File }[] = [
  { value: 'google_drive', label: 'Google Drive', icon: Folder },
  { value: 'canva', label: 'Canva', icon: Palette },
  { value: 'figma', label: 'Figma', icon: Image },
  { value: 'notion', label: 'Notion', icon: FileText },
  { value: 'loom', label: 'Loom', icon: Film },
  { value: 'other', label: 'Otro', icon: File },
];

const TYPE_OPTIONS: { value: ResourceType; label: string; icon: typeof FileText }[] = [
  { value: 'logo', label: 'Logo', icon: Image },
  { value: 'contract', label: 'Contrato', icon: FileText },
  { value: 'deck', label: 'Deck', icon: FileText },
  { value: 'template', label: 'Plantilla', icon: LayoutTemplate },
  { value: 'report', label: 'Informe', icon: BarChart2 },
  { value: 'image', label: 'Imagen', icon: Image },
  { value: 'video', label: 'Video', icon: Film },
  { value: 'spreadsheet', label: 'Hoja', icon: FileSpreadsheet },
  { value: 'doc', label: 'Documento', icon: FileType },
  { value: 'other', label: 'Otro', icon: File },
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
  folderId: string | null;
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
  folderId: null,
  linkToEntityType: '',
  linkToEntityId: '',
  isPrimary: false,
};

interface ResourceFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: ResourceFormState) => Promise<void>;
  editingResource?: Resource | null;
  presetEntity?: { entityType: ResourceEntityType; entityId: string };
  defaultFolderId?: string | null;
  folders?: ResourceFolder[];
}

const selectClass =
  'w-full rounded-xl border border-brand-200/60 px-3 py-2 text-sm font-body text-primary focus:border-primary focus:outline-none bg-white placeholder:text-brand-soft';

export function ResourceFormModal({
  isOpen,
  onClose,
  onSave,
  editingResource,
  presetEntity,
  defaultFolderId = null,
  folders = [],
}: ResourceFormModalProps) {
  const [form, setForm] = useState<ResourceFormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const folderId = defaultFolderId ?? null;
      if (editingResource) {
        setForm({
          title: editingResource.title,
          url: editingResource.url,
          type: editingResource.type,
          source: editingResource.source,
          status: editingResource.status,
          version: editingResource.version ?? '',
          description: editingResource.description ?? '',
          folderId: editingResource.folderId ?? null,
          linkToEntityType: presetEntity?.entityType ?? '',
          linkToEntityId: presetEntity?.entityId ?? '',
          isPrimary: false,
        });
      } else if (presetEntity) {
        setForm({
          ...emptyForm,
          linkToEntityType: presetEntity.entityType,
          linkToEntityId: presetEntity.entityId,
          folderId,
          isPrimary: false,
        });
      } else {
        setForm({ ...emptyForm, folderId });
      }
    }
  }, [isOpen, editingResource, presetEntity, defaultFolderId]);

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

  const tree = buildFolderTree(folders) as FolderNode[];
  const flatFolders = flattenFoldersForSelect(tree);

  const footer = (
    <>
      <button
        type="button"
        onClick={onClose}
        className="rounded-xl border border-brand-200/60 px-4 py-2 text-sm font-bold text-brand-700 hover:bg-white transition-colors"
      >
        Cancelar
      </button>
      <button
        onClick={handleSubmit}
        disabled={saving}
        className="rounded-xl bg-primary px-5 py-2 text-sm font-bold text-white hover:bg-brand-600 transition-colors disabled:opacity-50 shadow-md"
      >
        {saving ? 'Guardando...' : 'Guardar'}
      </button>
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <Link2 className="w-5 h-5 text-primary" />
          </div>
          <span className="text-lg font-title text-primary">
            {editingResource ? 'Editar recurso' : 'Añadir archivo'}
          </span>
        </div>
      }
      maxWidth="2xl"
      footer={footer}
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Solo lo esencial: Enlace, Nombre, Carpeta */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-brand-600 mb-1">Enlace *</label>
            <input
              type="url"
              value={form.url}
              onChange={(e) => setForm((prev) => ({ ...prev, url: e.target.value }))}
              placeholder="https://drive.google.com/..."
              className={`${selectClass} py-2.5`}
              required
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-brand-600 mb-1">Nombre *</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
              placeholder="Ej: Contrato 2026, Deck..."
              className={`${selectClass} py-2.5`}
              required
            />
          </div>
        </div>
        <div>
          <Select
            label="Carpeta"
            value={form.folderId ?? ''}
            onChange={(v) => setForm((prev) => ({ ...prev, folderId: v || null }))}
            placeholder="— Sin asignar —"
            options={flatFolders.map((f) => ({ value: f.id, label: f.name }))}
          />
          {defaultFolderId && (
            <p className="text-[11px] text-brand-500 mt-1">Por defecto: carpeta actual</p>
          )}
        </div>

        {/* Tipo, Origen, Estado y más - opcionales en "Más opciones" */}
        <div>
          <button
            type="button"
            onClick={() => setShowAdvanced((v) => !v)}
            className="flex items-center gap-2 text-sm font-bold text-brand-500 hover:text-primary transition-colors mb-2"
          >
            <ChevronDown className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
            Más opciones
          </button>

          <div className={`
             space-y-4 pl-4 border-l-2 border-brand-200/60 transition-all duration-300 ease-in-out overflow-hidden
             ${showAdvanced ? 'max-h-[500px] opacity-100 mt-3' : 'max-h-0 opacity-0'}
          `}>
            <div>
              <Select
                label="Tipo"
                value={form.type}
                onChange={(v) => setForm((prev) => ({ ...prev, type: v as ResourceType }))}
                placeholder="Seleccionar tipo"
                options={TYPE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
              />
            </div>
            <div>
              <Select
                label="Origen"
                value={form.source}
                onChange={(v) => setForm((prev) => ({ ...prev, source: v as ResourceSource }))}
                placeholder="Seleccionar origen"
                options={SOURCE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
              />
            </div>
            <div>
              <Select
                label="Estado"
                value={form.status}
                onChange={(v) => setForm((prev) => ({ ...prev, status: v as ResourceStatus }))}
                placeholder="Seleccionar estado"
                options={STATUS_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-brand-500 mb-1">Versión</label>
              <input
                type="text"
                value={form.version}
                onChange={(e) => setForm((prev) => ({ ...prev, version: e.target.value }))}
                placeholder="v1, 2026..."
                className={selectClass}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-brand-500 mb-1">Descripción</label>
              <input
                type="text"
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Opcional"
                className={selectClass}
              />
            </div>
            {!editingResource && (
              <>
                <div>
                  <Select
                    label="Vincular a"
                    value={form.linkToEntityType}
                    onChange={(v) =>
                      setForm((prev) => ({
                        ...prev,
                        linkToEntityType: v as ResourceEntityType | '',
                      }))
                    }
                    placeholder="— No vincular —"
                    options={[
                      { value: 'client', label: 'Lead' },
                      { value: 'deal', label: 'Deal' },
                      { value: 'project', label: 'Proyecto' },
                      { value: 'task', label: 'Tarea' },
                      { value: 'internal', label: 'Interno' },
                    ]}
                  />
                </div>
                {form.linkToEntityType && form.linkToEntityType !== 'internal' && (
                  <div>
                    <label className="block text-xs font-bold text-brand-500 mb-1">ID entidad</label>
                    <input
                      type="text"
                      value={form.linkToEntityId}
                      onChange={(e) => setForm((prev) => ({ ...prev, linkToEntityId: e.target.value }))}
                      placeholder="UUID"
                      className={selectClass}
                    />
                  </div>
                )}
                {form.linkToEntityType && (
                  <div className="sm:col-span-2 flex items-center">
                    <label className="flex items-center gap-2 text-sm font-body">
                      <input
                        type="checkbox"
                        checked={form.isPrimary}
                        onChange={(e) => setForm((prev) => ({ ...prev, isPrimary: e.target.checked }))}
                        className="rounded border-brand-300 text-primary focus:ring-primary"
                      />
                      Marcar como principal
                    </label>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </form>
    </Modal>
  );
}
