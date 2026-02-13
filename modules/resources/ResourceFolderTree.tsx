import React from 'react';
import {
  Folder,
  ChevronRight,
  ChevronDown,
  Clock,
  PlusCircle,
  FolderPlus,
  HardDrive,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { getFolders, buildFolderTree } from '../../services/resourceFolders';
import type { ResourceFolder } from '../../types';

interface FolderNode extends ResourceFolder {
  children: FolderNode[];
}

interface ResourceFolderTreeProps {
  selectedFolderId: string | null;
  onSelectFolder: (id: string | null) => void;
  viewMode: 'all' | 'recent';
  onViewModeChange: (mode: 'all' | 'recent') => void;
  expandedFolderIds: Set<string>;
  onToggleExpand: (id: string) => void;
  onAddFile: () => void;
  onNewFolder: () => void;
  onNavigate?: () => void;
  className?: string;
}

function FolderTreeItem({
  node,
  depth,
  selectedFolderId,
  onSelectFolder,
  expandedFolderIds,
  onToggleExpand,
}: {
  node: FolderNode;
  depth: number;
  selectedFolderId: string | null;
  onSelectFolder: (id: string | null) => void;
  expandedFolderIds: Set<string>;
  onToggleExpand: (id: string) => void;
}) {
  const hasChildren = node.children.length > 0;
  const isExpanded = expandedFolderIds.has(node.id);
  const isSelected = selectedFolderId === node.id;

  return (
    <div className="select-none">
      <div
        className={`flex items-center gap-2 py-2 px-3 rounded-xl cursor-pointer transition-colors duration-200 text-sm font-body ${
          isSelected
            ? 'bg-white/15 text-white'
            : 'text-brand-200 hover:bg-white/10 hover:text-white'
        }`}
        style={{ paddingLeft: `${12 + depth * 16}px` }}
        onClick={() => onSelectFolder(node.id)}
      >
        <button
          type="button"
          className="p-0.5 -ml-1 rounded hover:bg-white/10 shrink-0"
          onClick={(e) => {
            e.stopPropagation();
            if (hasChildren) onToggleExpand(node.id);
          }}
          aria-label={isExpanded ? 'Colapsar' : 'Expandir'}
        >
          {hasChildren ? (
            isExpanded ? (
              <ChevronDown size={16} className={isSelected ? 'text-white' : 'text-brand-200'} />
            ) : (
              <ChevronRight size={16} className={isSelected ? 'text-white' : 'text-brand-200'} />
            )
          ) : (
            <span className="w-4 inline-block" />
          )}
        </button>
        <Folder
          size={18}
          className={`shrink-0 ${isSelected ? 'text-white' : 'text-brand-200'}`}
        />
        <span className="truncate font-bold">{node.name}</span>
      </div>
      {hasChildren && isExpanded && (
        <div className="ml-0">
          {node.children.map((child) => (
            <FolderTreeItem
              key={child.id}
              node={child}
              depth={depth + 1}
              selectedFolderId={selectedFolderId}
              onSelectFolder={onSelectFolder}
              expandedFolderIds={expandedFolderIds}
              onToggleExpand={onToggleExpand}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function ResourceFolderTree({
  selectedFolderId,
  onSelectFolder,
  viewMode,
  onViewModeChange,
  expandedFolderIds,
  onToggleExpand,
  onAddFile,
  onNewFolder,
  onNavigate,
  className = '',
}: ResourceFolderTreeProps) {
  const { data: folders = [], isLoading } = useQuery({
    queryKey: ['resource_folders'],
    queryFn: getFolders,
  });

  const tree = buildFolderTree(folders) as FolderNode[];
  const isOverview = selectedFolderId === null;

  return (
    <aside
      className={`w-64 flex flex-col shrink-0 h-full min-h-0 bg-brand-600 ${className}`}
      style={{ background: '#0B3064' }}
    >
      <div className="p-4 shrink-0 space-y-4">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              onNewFolder();
              onNavigate?.();
            }}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-white/15 hover:bg-white/25 text-white border border-white/20 px-2 py-2.5 text-xs font-bold transition-colors"
          >
            <FolderPlus size={16} />
            Carpeta
          </button>
          <button
            type="button"
            onClick={() => {
              onAddFile();
              onNavigate?.();
            }}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-white text-primary px-2 py-2.5 text-xs font-bold hover:bg-brand-100 transition-colors shadow-md"
          >
            <PlusCircle size={16} />
            Archivo
          </button>
        </div>
        <div>
          <h2 className="text-xs font-bold text-brand-200 uppercase tracking-wider mb-2">Storage</h2>
          <div className="space-y-0.5">
          <button
            type="button"
            onClick={() => {
              onViewModeChange('all');
              onSelectFolder(null);
            }}
            className={`w-full flex items-center gap-2 py-2.5 px-3 rounded-lg text-sm font-bold transition-colors ${
              isOverview
                ? 'bg-white/15 text-white border-b-2 border-white'
                : 'text-brand-200 hover:bg-white/10 hover:text-white'
            }`}
          >
            <HardDrive size={18} />
            Mis archivos
          </button>
          <button
            type="button"
            onClick={() => onViewModeChange('recent')}
            className={`w-full flex items-center gap-2 py-2.5 px-3 rounded-lg text-sm font-bold transition-colors ${
              viewMode === 'recent' && isOverview
                ? 'bg-white/15 text-white'
                : 'text-brand-200 hover:bg-white/10 hover:text-white'
            }`}
          >
            <Clock size={18} />
            Recientes
          </button>
        </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-2 px-2 min-h-0">
        <div className="text-[10px] font-bold uppercase tracking-wider text-brand-300 px-3 mb-2">
          Carpetas
        </div>
        {isLoading ? (
          <p className="px-3 py-2 text-xs text-brand-300">Cargando...</p>
        ) : (
          <div className="space-y-0.5">
            {tree.map((node) => (
              <FolderTreeItem
                key={node.id}
                node={node}
                depth={0}
                selectedFolderId={selectedFolderId}
                onSelectFolder={onSelectFolder}
                expandedFolderIds={expandedFolderIds}
                onToggleExpand={onToggleExpand}
              />
            ))}
            {tree.length === 0 && (
              <p className="px-3 py-2 text-xs text-brand-300">
                Ejecuta la migración 014 para crear carpetas.
              </p>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
