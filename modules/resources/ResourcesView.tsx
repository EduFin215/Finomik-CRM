import React, { useState, useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link2, PlusCircle, Menu, ChevronRight } from 'lucide-react';
import {
  getResources,
  createResource,
  updateResource,
  archiveResource,
  deleteResource,
} from '../../services/resources';
import { getFolders, ensureDefaultFolders, ensureSchoolFoldersExist } from '../../services/resourceFolders';
import type {
  ResourceWithLinks,
  ResourceEntityType,
  ResourceType,
  ResourceStatus,
  ResourceSource,
  ResourceFolder,
} from '../../types';
import { ToolLayout } from '../../components/layout/ToolLayout';
import { ResourceFolderTree } from './ResourceFolderTree';
import { ResourceFormModal } from './ResourceFormModal';
import { NewFolderModal } from './NewFolderModal';
import { ResourcesOverview } from './ResourcesOverview';
import { ResourcesFolderContent } from './ResourcesFolderContent';
import type { ResourceFormState } from './ResourceFormModal';
import { TOOLS } from '../../config/tools';

function buildFolderPath(folderId: string, folders: ResourceFolder[]): ResourceFolder[] {
  const folder = folders.find((f) => f.id === folderId);
  if (!folder) return [];
  const parent = folder.parentId ? buildFolderPath(folder.parentId, folders) : [];
  return [...parent, folder];
}

export default function ResourcesView() {
  const queryClient = useQueryClient();

  React.useEffect(() => {
    const run = async () => {
      await ensureDefaultFolders();
      await ensureSchoolFoldersExist();
      queryClient.invalidateQueries({ queryKey: ['resource_folders'] });
    };
    run();
  }, [queryClient]);

  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'all' | 'recent'>('all');
  const [expandedFolderIds, setExpandedFolderIds] = useState<Set<string>>(new Set());
  const [filterType, setFilterType] = useState<ResourceType | ''>('');
  const [filterStatus, setFilterStatus] = useState<ResourceStatus | ''>('');
  const [filterSource, setFilterSource] = useState<ResourceSource | ''>('');
  const [filterEntity, setFilterEntity] = useState<ResourceEntityType | ''>('');
  const [onlyPrimary, setOnlyPrimary] = useState(false);
  const [search, setSearch] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isNewFolderOpen, setIsNewFolderOpen] = useState(false);
  const [editingResource, setEditingResource] = useState<ResourceWithLinks | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleExpand = useCallback((id: string) => {
    setExpandedFolderIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const params = {
    type: filterType || undefined,
    status: filterStatus || undefined,
    source: filterSource || undefined,
    entityType: filterEntity || undefined,
    entityId: undefined,
    onlyPrimary: onlyPrimary && !!filterEntity ? true : undefined,
    search: search.trim() || undefined,
    folderId: selectedFolderId ?? undefined,
  };

  const {
    data: resources = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['resources', params],
    queryFn: () => getResources(params),
  });

  const { data: folders = [] } = useQuery({
    queryKey: ['resource_folders'],
    queryFn: getFolders,
  });

  React.useEffect(() => {
    const leadsFolder = folders.find((f) => !f.parentId && f.name === 'Leads');
    if (leadsFolder) {
      setExpandedFolderIds((prev) => new Set([...prev, leadsFolder.id]));
    }
  }, [folders.length]);

  const selectedFolder = folders.find((f) => f.id === selectedFolderId);
  const breadcrumbPath = useMemo(
    () => (selectedFolderId ? buildFolderPath(selectedFolderId, folders) : []),
    [selectedFolderId, folders]
  );
  const rootFolders = folders.filter((f) => !f.parentId);
  const subfolders = selectedFolderId
    ? folders.filter((f) => f.parentId === selectedFolderId)
    : [];

  const recentResourcesParams = {
    type: filterType || undefined,
    status: filterStatus || undefined,
    source: filterSource || undefined,
    search: search.trim() || undefined,
    folderId: undefined,
  };
  const { data: recentResources = [] } = useQuery({
    queryKey: ['resources', 'recent', recentResourcesParams],
    queryFn: () => getResources(recentResourcesParams),
    enabled: !selectedFolderId,
  });

  const handleSave = async (form: ResourceFormState) => {
    const effectiveFolderId =
      editingResource
        ? (form.folderId || null)
        : (selectedFolderId || form.folderId || null);
    if (editingResource) {
      await updateResource(editingResource.id, {
        title: form.title.trim(),
        url: form.url.trim(),
        type: form.type,
        source: form.source,
        status: form.status,
        version: form.version || null,
        description: form.description || null,
        folderId: effectiveFolderId,
      });
    } else {
      const folder = effectiveFolderId ? folders.find((f) => f.id === effectiveFolderId) : null;
      const linkFromFolder =
        folder?.schoolId
          ? { entityType: 'client' as const, entityId: folder.schoolId }
          : undefined;
      const linkFromForm =
        form.linkToEntityType && (form.linkToEntityType === 'internal' || form.linkToEntityId.trim())
          ? {
            entityType: form.linkToEntityType,
            entityId: form.linkToEntityType === 'internal' ? null : form.linkToEntityId.trim(),
          }
          : undefined;
      const linkTo = linkFromFolder ?? linkFromForm;
      await createResource({
        title: form.title.trim(),
        url: form.url.trim(),
        type: form.type,
        source: form.source,
        status: form.status,
        version: form.version || null,
        description: form.description || null,
        folderId: effectiveFolderId,
        linkTo,
        isPrimary: form.isPrimary,
      });
      if (linkTo) {
        queryClient.invalidateQueries({ queryKey: ['resourcesByEntity'] });
      }
    }
    await queryClient.invalidateQueries({ queryKey: ['resources'], exact: false });
    await queryClient.refetchQueries({ queryKey: ['resources'], type: 'active' });
  };

  const handleArchive = async (r: ResourceWithLinks) => {
    if (!window.confirm(`¿Archivar "${r.title}"?`)) return;
    await archiveResource(r.id);
    queryClient.invalidateQueries({ queryKey: ['resources'], exact: false });
  };

  const handleDelete = async (r: ResourceWithLinks) => {
    if (!window.confirm(`¿Eliminar permanentemente "${r.title}"? Esta acción no se puede deshacer.`)) return;
    const ok = await deleteResource(r.id);
    if (ok) queryClient.invalidateQueries({ queryKey: ['resources'], exact: false });
  };

  const copyLink = (url: string) => {
    navigator.clipboard.writeText(url);
  };

  const openNew = () => {
    setEditingResource(null);
    setIsFormOpen(true);
  };

  const openEdit = (r: ResourceWithLinks) => {
    setEditingResource(r);
    setIsFormOpen(true);
  };

  const handleFolderCreated = () => {
    queryClient.invalidateQueries({ queryKey: ['resource_folders'] });
  };

  const resourcesTool = TOOLS.find((t) => t.id === 'resources')!;

  const sidebarContent = (
    <ResourceFolderTree
      selectedFolderId={selectedFolderId}
      onSelectFolder={setSelectedFolderId}
      viewMode={viewMode}
      onViewModeChange={setViewMode}
      expandedFolderIds={expandedFolderIds}
      onToggleExpand={toggleExpand}
      onAddFile={openNew}
      onNewFolder={() => setIsNewFolderOpen(true)}
      onNavigate={() => setSidebarOpen(false)}
    />
  );

  return (
    <ToolLayout currentTool={resourcesTool}>
      <div className="flex h-full w-full overflow-hidden bg-white">
        {sidebarOpen && (
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 lg:hidden" onClick={() => setSidebarOpen(false)} aria-hidden />
        )}
        <div
          className={`
            sidebar-dark fixed lg:static inset-y-0 left-0 z-50 w-64 transform transition-transform duration-200 ease-out h-full flex flex-col
            bg-gradient-sidebar text-white shadow-2xl border-r-0
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          `}
        >
          <div className="flex-1 overflow-y-auto min-h-0 pt-4">
            {sidebarContent}
          </div>
        </div>
        <main className="flex-1 flex flex-col h-full overflow-hidden min-w-0">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-brand-100 lg:hidden shrink-0">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="p-2 text-brand-600 hover:bg-brand-100/50 rounded-xl shrink-0"
              aria-label="Abrir menú"
            >
              <Menu size={24} />
            </button>
          </div>
          {/* Barra fija de ruta (siempre visible) */}
          <div
            className="shrink-0 px-4 sm:px-6 py-3 flex items-center justify-between gap-4 bg-primary text-white shadow-md relative z-10"
          >
            <nav className="flex items-center gap-1 flex-wrap min-w-0" aria-label="Ruta de carpetas">
              {breadcrumbPath.length === 0 ? (
                <span className="text-sm font-bold text-white">Inicio</span>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setSelectedFolderId(null)}
                    className="text-sm font-bold text-white/90 hover:text-white transition-colors py-1 px-2 rounded-lg hover:bg-white/10"
                  >
                    Inicio
                  </button>
                  {breadcrumbPath.map((f, i) => (
                    <React.Fragment key={f.id}>
                      <ChevronRight size={16} className="text-white/60 shrink-0" />
                      <button
                        type="button"
                        onClick={() => setSelectedFolderId(f.id)}
                        className={`text-sm font-bold py-1 px-2 rounded-lg transition-colors ${i === breadcrumbPath.length - 1
                            ? 'text-white bg-white/15'
                            : 'text-white/90 hover:text-white hover:bg-white/10'
                          }`}
                      >
                        {f.name}
                      </button>
                    </React.Fragment>
                  ))}
                </>
              )}
            </nav>
            <button
              type="button"
              onClick={openNew}
              className="shrink-0 inline-flex items-center gap-2 rounded-lg bg-white/20 hover:bg-white/30 text-white px-3 py-2 text-sm font-bold transition-colors border border-white/30"
            >
              <PlusCircle className="w-4 h-4" />
              Añadir archivo
            </button>
          </div>
          <div className="flex-1 overflow-auto p-4 sm:p-6">
            <div className="max-w-6xl mx-auto">
              {!selectedFolderId ? (
                <ResourcesOverview
                  rootFolders={rootFolders}
                  recentResources={recentResources}
                  onSelectFolder={setSelectedFolderId}
                  onAddFile={openNew}
                  onEdit={openEdit}
                  onArchive={handleArchive}
                  onDelete={handleDelete}
                  copyLink={copyLink}
                />
              ) : selectedFolder ? (
                <ResourcesFolderContent
                  folder={selectedFolder}
                  subfolders={subfolders}
                  resources={resources}
                  onSelectFolder={setSelectedFolderId}
                  onNavigateUp={() => setSelectedFolderId(selectedFolder.parentId ?? null)}
                  onAddFile={openNew}
                  onEdit={openEdit}
                  onArchive={handleArchive}
                  onDelete={handleDelete}
                  copyLink={copyLink}
                  isLoading={isLoading}
                  error={error}
                />
              ) : (
                <p className="text-brand-500">Carpeta no encontrada.</p>
              )}
            </div>
          </div>
        </main>
      </div>

      <ResourceFormModal
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingResource(null);
        }}
        onSave={handleSave}
        editingResource={editingResource}
        defaultFolderId={selectedFolderId}
        folders={folders}
      />

      <NewFolderModal
        isOpen={isNewFolderOpen}
        onClose={() => setIsNewFolderOpen(false)}
        onCreated={handleFolderCreated}
        parentId={selectedFolderId}
      />
    </ToolLayout>
  );
}
