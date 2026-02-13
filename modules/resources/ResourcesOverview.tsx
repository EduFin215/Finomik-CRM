import React from 'react';
import {
  Folder,
  Link2,
  ExternalLink,
  Copy,
  Pencil,
  Trash2,
  PlusCircle,
  Clock,
  FileText,
  Image,
  Film,
  FileSpreadsheet,
  File,
} from 'lucide-react';
import type { ResourceFolder } from '../../types';
import type { ResourceWithLinks } from '../../types';
import type { ResourceSource, ResourceType } from '../../types';

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

function TypeIcon({ type }: { type: ResourceType }) {
  const iconClass = 'w-5 h-5 text-brand-500';
  switch (type) {
    case 'image':
    case 'logo':
      return <Image className={iconClass} />;
    case 'video':
      return <Film className={iconClass} />;
    case 'spreadsheet':
      return <FileSpreadsheet className={iconClass} />;
    case 'contract':
    case 'deck':
    case 'doc':
    case 'report':
      return <FileText className={iconClass} />;
    default:
      return <File className={iconClass} />;
  }
}

interface ResourcesOverviewProps {
  rootFolders: ResourceFolder[];
  recentResources: ResourceWithLinks[];
  onSelectFolder: (id: string) => void;
  onAddFile: () => void;
  onEdit: (r: ResourceWithLinks) => void;
  onArchive: (r: ResourceWithLinks) => void;
  onDelete: (r: ResourceWithLinks) => void;
  copyLink: (url: string) => void;
}

export function ResourcesOverview({
  rootFolders,
  recentResources,
  onSelectFolder,
  onAddFile,
  onEdit,
  onArchive: _onArchive,
  onDelete,
  copyLink,
}: ResourcesOverviewProps) {
  return (
    <div className="space-y-8">
      {/* Carpetas - grid compacto, escalable */}
      <section>
        <h2 className="text-xs font-bold text-brand-500 uppercase tracking-widest mb-3">
          Carpetas
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {rootFolders.map((folder) => (
            <button
              key={folder.id}
              type="button"
              onClick={() => onSelectFolder(folder.id)}
              className="group flex flex-col items-center gap-2 p-4 rounded-xl bg-white border border-brand-200/50 hover:border-primary/40 hover:shadow-md hover:shadow-primary/5 transition-all duration-200"
            >
              <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/15 transition-colors">
                <Folder className="w-6 h-6 text-primary" />
              </div>
              <span className="font-bold text-primary text-sm truncate w-full text-center px-1">
                {folder.name}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* Archivos recientes */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-bold text-brand-500 uppercase tracking-widest flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Archivos recientes
          </h2>
        </div>
        {recentResources.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-brand-200/60 bg-brand-50/30 p-10 text-center">
            <div className="w-14 h-14 rounded-xl bg-brand-100/50 flex items-center justify-center mx-auto mb-3">
              <Link2 className="w-7 h-7 text-brand-400" />
            </div>
            <p className="text-sm font-bold text-primary">No hay archivos aún</p>
            <p className="text-xs text-brand-500 mt-1">Añade tu primer recurso para empezar</p>
            <button
              type="button"
              onClick={onAddFile}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white hover:bg-brand-600 transition-colors shadow-md"
            >
              <PlusCircle size={16} />
              Añadir archivo
            </button>
          </div>
        ) : (
          <div className="rounded-xl border border-brand-200/50 bg-white overflow-hidden shadow-sm">
            <div className="divide-y divide-brand-100">
              {recentResources.slice(0, 8).map((r) => (
                <div
                  key={r.id}
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-brand-50/50 transition-colors group"
                >
                  <div className="w-9 h-9 rounded-lg bg-brand-100/50 flex items-center justify-center shrink-0">
                    <TypeIcon type={r.type} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-primary text-sm truncate">{r.title}</p>
                    <p className="text-[11px] text-brand-500">
                      {TYPE_LABELS[r.type]} · {SOURCE_LABELS[r.source]} ·{' '}
                      {new Date(r.updatedAt).toLocaleDateString('es-ES', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <button
                      type="button"
                      onClick={() => window.open(r.url, '_blank')}
                      className="p-1.5 rounded-lg text-brand-500 hover:bg-brand-100/80 hover:text-primary"
                      title="Abrir"
                    >
                      <ExternalLink size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => copyLink(r.url)}
                      className="p-1.5 rounded-lg text-brand-500 hover:bg-brand-100/80 hover:text-primary"
                      title="Copiar"
                    >
                      <Copy size={14} />
                    </button>
                    {r.status !== 'archived' && (
                      <button
                        type="button"
                        onClick={() => onEdit(r)}
                        className="p-1.5 rounded-lg text-brand-500 hover:bg-brand-100/80 hover:text-primary"
                        title="Editar"
                      >
                        <Pencil size={14} />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onDelete(r)}
                      className="p-1.5 rounded-lg text-red-500 hover:bg-red-50"
                      title="Eliminar"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
