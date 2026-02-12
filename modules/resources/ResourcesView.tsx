import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Link2,
  PlusCircle,
  ExternalLink,
  Copy,
  Pencil,
  Archive,
  Filter,
} from 'lucide-react';
import {
  getResources,
  createResource,
  updateResource,
  archiveResource,
} from '../../services/resources';
import type {
  ResourceWithLinks,
  ResourceSource,
  ResourceType,
  ResourceStatus,
  ResourceEntityType,
} from '../../types';
import { ToolLayout } from '../../components/layout/ToolLayout';
import { TOOLS } from '../../config/tools';
import { ResourceFormModal } from './ResourceFormModal';
import type { ResourceFormState } from './ResourceFormModal';

const SOURCE_LABELS: Record<ResourceSource, string> = {
  google_drive: 'Google Drive',
  canva: 'Canva',
  figma: 'Figma',
  notion: 'Notion',
  loom: 'Loom',
  other: 'Otro',
};

const TYPE_LABELS: Record<ResourceType, string> = {
  logo: 'Logo',
  contract: 'Contrato',
  deck: 'Deck',
  template: 'Plantilla',
  report: 'Informe',
  image: 'Imagen',
  video: 'Video',
  spreadsheet: 'Hoja',
  doc: 'Documento',
  other: 'Otro',
};

const STATUS_LABELS: Record<ResourceStatus, string> = {
  draft: 'Borrador',
  final: 'Final',
  archived: 'Archivado',
};

export default function ResourcesView() {
  const queryClient = useQueryClient();
  const [filterType, setFilterType] = useState<ResourceType | ''>('');
  const [filterStatus, setFilterStatus] = useState<ResourceStatus | ''>('');
  const [filterSource, setFilterSource] = useState<ResourceSource | ''>('');
  const [filterEntity, setFilterEntity] = useState<ResourceEntityType | ''>('');
  const [onlyPrimary, setOnlyPrimary] = useState(false);
  const [search, setSearch] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingResource, setEditingResource] = useState<ResourceWithLinks | null>(null);

  const params = {
    type: filterType || undefined,
    status: filterStatus || undefined,
    source: filterSource || undefined,
    entityType: filterEntity || undefined,
    entityId: undefined,
    onlyPrimary: onlyPrimary && !!filterEntity ? true : undefined,
    search: search.trim() || undefined,
  };

  const {
    data: resources = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['resources', params],
    queryFn: () => getResources(params),
  });

  const handleSave = async (form: ResourceFormState) => {
    if (editingResource) {
      await updateResource(editingResource.id, {
        title: form.title.trim(),
        url: form.url.trim(),
        type: form.type,
        source: form.source,
        status: form.status,
        version: form.version || null,
        description: form.description || null,
      });
    } else {
      await createResource({
        title: form.title.trim(),
        url: form.url.trim(),
        type: form.type,
        source: form.source,
        status: form.status,
        version: form.version || null,
        description: form.description || null,
        linkTo:
          form.linkToEntityType &&
          (form.linkToEntityType === 'internal' || form.linkToEntityId.trim())
            ? {
                entityType: form.linkToEntityType,
                entityId:
                  form.linkToEntityType === 'internal'
                    ? null
                    : form.linkToEntityId.trim(),
              }
            : undefined,
        isPrimary: form.isPrimary,
      });
    }
    queryClient.invalidateQueries({ queryKey: ['resources'], exact: false });
  };

  const handleArchive = async (r: ResourceWithLinks) => {
    if (!window.confirm(`¿Archivar "${r.title}"?`)) return;
    await archiveResource(r.id);
    queryClient.invalidateQueries({ queryKey: ['resources'], exact: false });
  };

  const copyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    // Could add toast
  };

  const openNew = () => {
    setEditingResource(null);
    setIsFormOpen(true);
  };

  const openEdit = (r: ResourceWithLinks) => {
    setEditingResource(r);
    setIsFormOpen(true);
  };

  const resourcesTool = TOOLS.find((t) => t.id === 'resources')!;

  return (
    <ToolLayout currentTool={resourcesTool}>
      <div className="overflow-auto p-4 sm:p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-title text-primary flex items-center gap-2">
                <Link2 className="w-6 h-6 text-brand-600" />
                Resources
              </h1>
              <p className="mt-1 text-sm text-brand-600 font-body">
                Enlaces centralizados. Vincula recursos a clientes, deals o
                proyectos. La IA podrá encontrarlos en segundos.
              </p>
            </div>
            <button
              type="button"
              onClick={openNew}
              className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-brand-500 transition-all"
            >
              <PlusCircle className="w-4 h-4" />
              Add new resource
            </button>
          </div>

          {/* Filtros */}
          <div className="rounded-2xl border border-brand-200/60 bg-white p-4 shadow-card">
            <div className="flex items-center gap-2 mb-3">
              <Filter className="w-4 h-4 text-brand-500" />
              <span className="text-xs font-bold uppercase tracking-wide text-brand-500">
                Filtros
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              <input
                type="text"
                placeholder="Buscar por texto..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="rounded-xl border border-brand-200/60 px-3 py-2 text-sm font-body w-48 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
              />
              <select
                value={filterType}
                onChange={(e) =>
                  setFilterType((e.target.value as ResourceType) || '')
                }
                className="rounded-xl border border-brand-200/60 px-3 py-2 text-sm font-body focus:border-primary focus:outline-none"
              >
                <option value="">Todos los tipos</option>
                {Object.entries(TYPE_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
              <select
                value={filterStatus}
                onChange={(e) =>
                  setFilterStatus((e.target.value as ResourceStatus) || '')
                }
                className="rounded-xl border border-brand-200/60 px-3 py-2 text-sm font-body focus:border-primary focus:outline-none"
              >
                <option value="">Todos los estados</option>
                {Object.entries(STATUS_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
              <select
                value={filterSource}
                onChange={(e) =>
                  setFilterSource((e.target.value as ResourceSource) || '')
                }
                className="rounded-xl border border-brand-200/60 px-3 py-2 text-sm font-body focus:border-primary focus:outline-none"
              >
                <option value="">Todas las fuentes</option>
                {Object.entries(SOURCE_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
              <select
                value={filterEntity}
                onChange={(e) =>
                  setFilterEntity((e.target.value as ResourceEntityType) || '')
                }
                className="rounded-xl border border-brand-200/60 px-3 py-2 text-sm font-body focus:border-primary focus:outline-none"
              >
                <option value="">Todas las entidades</option>
                <option value="client">Cliente</option>
                <option value="deal">Deal</option>
                <option value="project">Proyecto</option>
                <option value="task">Tarea</option>
                <option value="internal">Interno</option>
              </select>
              {filterEntity && (
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={onlyPrimary}
                    onChange={(e) => setOnlyPrimary(e.target.checked)}
                    className="rounded border-brand-300"
                  />
                  <span className="text-xs text-brand-700">Solo primary</span>
                </label>
              )}
            </div>
          </div>

          {/* Tabla */}
          <section className="rounded-2xl border border-brand-200/60 bg-white shadow-card overflow-hidden">
            {isLoading && (
              <p className="p-4 text-sm text-brand-500">Cargando recursos...</p>
            )}
            {error && (
              <p className="p-4 text-sm text-red-600">
                Error al cargar. Revisa la consola.
              </p>
            )}
            {!isLoading && resources.length === 0 && (
              <div className="p-12 text-center">
                <p className="text-sm font-bold text-primary">
                  No hay recursos.
                </p>
                <p className="mt-1 text-xs text-brand-600">
                  Añade el primer recurso para centralizar los enlaces de la
                  empresa.
                </p>
                <button
                  type="button"
                  onClick={openNew}
                  className="mt-4 inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-500 transition-all"
                >
                  <PlusCircle className="w-4 h-4" />
                  Add new resource
                </button>
              </div>
            )}
            {!isLoading && resources.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-brand-200/60 bg-brand-100/30">
                      <th className="text-left px-4 py-3 font-bold text-brand-700">
                        Title
                      </th>
                      <th className="text-left px-4 py-3 font-bold text-brand-700">
                        Type
                      </th>
                      <th className="text-left px-4 py-3 font-bold text-brand-700">
                        Linked to
                      </th>
                      <th className="text-left px-4 py-3 font-bold text-brand-700">
                        Status
                      </th>
                      <th className="text-left px-4 py-3 font-bold text-brand-700">
                        Source
                      </th>
                      <th className="text-left px-4 py-3 font-bold text-brand-700">
                        Version
                      </th>
                      <th className="text-left px-4 py-3 font-bold text-brand-700">
                        Primary
                      </th>
                      <th className="text-left px-4 py-3 font-bold text-brand-700">
                        Updated
                      </th>
                      <th className="text-right px-4 py-3 font-bold text-brand-700">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {resources.map((r) => (
                      <tr
                        key={r.id}
                        className="border-b border-brand-100 hover:bg-brand-100/30"
                      >
                        <td className="px-4 py-3 font-medium text-primary">
                          {r.title}
                        </td>
                        <td className="px-4 py-3 text-brand-600">
                          {TYPE_LABELS[r.type]}
                        </td>
                        <td className="px-4 py-3 text-brand-600 text-xs max-w-[120px] truncate">
                          {r.linkedTo || '—'}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                              r.status === 'final'
                                ? 'bg-emerald-100 text-emerald-800'
                                : r.status === 'archived'
                                  ? 'bg-brand-100 text-brand-500'
                                  : 'bg-amber-50 text-amber-800'
                            }`}
                          >
                            {STATUS_LABELS[r.status]}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-brand-600 text-xs">
                          {SOURCE_LABELS[r.source]}
                        </td>
                        <td className="px-4 py-3 text-brand-600 text-xs">
                          {r.version || '—'}
                        </td>
                        <td className="px-4 py-3">
                          {r.isPrimaryForEntity ? (
                            <span className="text-emerald-600 font-bold">Sí</span>
                          ) : (
                            <span className="text-brand-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-brand-500 text-xs">
                          {new Date(r.updatedAt).toLocaleDateString('es-ES', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => window.open(r.url, '_blank')}
                              className="p-1.5 rounded-xl text-brand-500 hover:bg-brand-100/50 transition-colors"
                              title="Open"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => copyLink(r.url)}
                              className="p-1.5 rounded-xl text-brand-500 hover:bg-brand-100/50 transition-colors"
                              title="Copy Link"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                            {r.status !== 'archived' && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => openEdit(r)}
                                  className="p-1.5 rounded-xl text-brand-500 hover:bg-brand-100/50 transition-colors"
                                  title="Edit"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleArchive(r)}
                                  className="p-1.5 rounded-xl text-brand-500 hover:bg-brand-100/50 transition-colors"
                                  title="Archive"
                                >
                                  <Archive className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </div>

      <ResourceFormModal
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingResource(null);
        }}
        onSave={handleSave}
        editingResource={editingResource}
      />
    </ToolLayout>
  );
}
