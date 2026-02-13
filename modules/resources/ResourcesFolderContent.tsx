import React from 'react';
import {
  Folder,
  ChevronRight,
  ExternalLink,
  Copy,
  Pencil,
  Archive,
  Trash2,
  PlusCircle,
} from 'lucide-react';
import type { ResourceFolder } from '../../types';
import type { ResourceWithLinks } from '../../types';
import type { ResourceSource, ResourceType, ResourceStatus } from '../../types';

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

interface ResourcesFolderContentProps {
  folder: ResourceFolder;
  subfolders: ResourceFolder[];
  resources: ResourceWithLinks[];
  onSelectFolder: (id: string) => void;
  onNavigateUp?: () => void;
  onAddFile: () => void;
  onEdit: (r: ResourceWithLinks) => void;
  onArchive: (r: ResourceWithLinks) => void;
  onDelete: (r: ResourceWithLinks) => void;
  copyLink: (url: string) => void;
  isLoading: boolean;
  error: Error | null;
}

export function ResourcesFolderContent({
  folder,
  subfolders,
  resources,
  onSelectFolder,
  onNavigateUp,
  onAddFile,
  onEdit,
  onArchive,
  onDelete,
  copyLink,
  isLoading,
  error,
}: ResourcesFolderContentProps) {
  return (
    <div className="space-y-6">
      {/* Subcarpetas */}
      {subfolders.length > 0 && (
        <section>
          <h2 className="text-sm font-bold text-brand-600 uppercase tracking-wide mb-3">
            Subcarpetas
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {subfolders.map((sub) => (
              <button
                key={sub.id}
                type="button"
                onClick={() => onSelectFolder(sub.id)}
                className="flex items-center gap-3 p-4 rounded-xl border border-brand-200/60 bg-white hover:border-primary hover:bg-brand-100/30 transition-all text-left group"
              >
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Folder size={20} className="text-primary" />
                </div>
                <span className="font-bold text-primary text-sm truncate flex-1 min-w-0">
                  {sub.name}
                </span>
                <ChevronRight size={18} className="text-brand-400 group-hover:text-primary shrink-0" />
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Archivos en esta carpeta */}
      <section>
        <h2 className="text-sm font-bold text-brand-600 uppercase tracking-wide mb-3 flex items-center justify-between">
          <span>Archivos</span>
          <button
            type="button"
            onClick={onAddFile}
            className="text-xs font-bold text-primary hover:text-brand-600"
          >
            + Añadir archivo
          </button>
        </h2>
        {isLoading && (
          <p className="p-4 text-sm text-brand-500">Cargando...</p>
        )}
        {error && (
          <p className="p-4 text-sm text-red-600">Error al cargar.</p>
        )}
        {!isLoading && !error && resources.length === 0 && subfolders.length === 0 && (
          <div className="rounded-2xl border border-brand-200/60 bg-brand-100/20 p-8 text-center">
            <Folder className="w-10 h-10 text-brand-400 mx-auto mb-2" />
            <p className="text-sm font-bold text-primary">Carpeta vacía</p>
            <p className="text-xs text-brand-600 mt-1">Añade archivos o subcarpetas</p>
            <button
              type="button"
              onClick={onAddFile}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-600"
            >
              <PlusCircle size={18} />
              Añadir archivo
            </button>
          </div>
        )}
        {!isLoading && (resources.length > 0 || subfolders.length > 0) && resources.length === 0 && (
          <div className="rounded-2xl border border-brand-200/60 bg-white p-6 text-center">
            <p className="text-sm text-brand-600">No hay archivos en esta carpeta.</p>
            <button
              type="button"
              onClick={onAddFile}
              className="mt-3 text-sm font-bold text-primary hover:underline"
            >
              Añadir archivo
            </button>
          </div>
        )}
        {!isLoading && resources.length > 0 && (
          <div className="rounded-2xl border border-brand-200/60 bg-white overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-brand-200/60 bg-brand-100/30">
                    <th className="text-left px-4 py-3 font-bold text-brand-700">Nombre</th>
                    <th className="text-left px-4 py-3 font-bold text-brand-700">Tipo</th>
                    <th className="text-left px-4 py-3 font-bold text-brand-700">Origen</th>
                    <th className="text-left px-4 py-3 font-bold text-brand-700">Estado</th>
                    <th className="text-left px-4 py-3 font-bold text-brand-700">Actualizado</th>
                    <th className="text-right px-4 py-3 font-bold text-brand-700">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {resources.map((r) => (
                    <tr key={r.id} className="border-b border-brand-100 hover:bg-brand-100/30">
                      <td className="px-4 py-3 font-medium text-primary">{r.title}</td>
                      <td className="px-4 py-3 text-brand-600">{TYPE_LABELS[r.type]}</td>
                      <td className="px-4 py-3 text-brand-600 text-xs">{SOURCE_LABELS[r.source]}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            r.status === 'final'
                              ? 'bg-brand-100 text-brand-600'
                              : r.status === 'archived'
                                ? 'bg-brand-100 text-brand-500'
                                : 'bg-brand-100/80 text-brand-600'
                          }`}
                        >
                          {STATUS_LABELS[r.status]}
                        </span>
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
                            className="p-1.5 rounded-xl text-brand-500 hover:bg-brand-100/50"
                            title="Abrir"
                          >
                            <ExternalLink size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => copyLink(r.url)}
                            className="p-1.5 rounded-xl text-brand-500 hover:bg-brand-100/50"
                            title="Copiar"
                          >
                            <Copy size={14} />
                          </button>
                          {r.status !== 'archived' && (
                            <>
                              <button
                                type="button"
                                onClick={() => onEdit(r)}
                                className="p-1.5 rounded-xl text-brand-500 hover:bg-brand-100/50"
                                title="Editar"
                              >
                                <Pencil size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={() => onArchive(r)}
                                className="p-1.5 rounded-xl text-brand-500 hover:bg-brand-100/50"
                                title="Archivar"
                              >
                                <Archive size={14} />
                              </button>
                            </>
                          )}
                          <button
                            type="button"
                            onClick={() => onDelete(r)}
                            className="p-1.5 rounded-xl text-red-600 hover:bg-red-50"
                            title="Eliminar"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
