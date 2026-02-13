import React, { useState, useEffect } from 'react';
import { FolderPlus, X, Folder } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { createFolder, getFolders } from '../../services/resourceFolders';
import { ensureDefaultFolders } from '../../services/resourceFolders';

interface NewFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
  /** Carpeta actual (donde crear). Si null, se crea en la raíz. Como en Google Drive. */
  parentId?: string | null;
}

export function NewFolderModal({
  isOpen,
  onClose,
  onCreated,
  parentId = null,
}: NewFolderModalProps) {
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: folders = [], refetch } = useQuery({
    queryKey: ['resource_folders'],
    queryFn: getFolders,
    enabled: isOpen,
  });

  useEffect(() => {
    if (isOpen) {
      setName('');
      setError(null);
      ensureDefaultFolders().then(() => refetch());
    }
  }, [isOpen, refetch]);

  const parentFolder = parentId ? folders.find((f) => f.id === parentId) : null;
  const locationLabel = parentFolder ? parentFolder.name : 'Raíz (Mis carpetas)';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError('El nombre es obligatorio');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const result = await createFolder({
        name: trimmed,
        parentId: parentId ?? null,
      });
      if (result.folder) {
        onCreated();
        onClose();
      } else {
        setError(result.error ?? 'No se pudo crear la carpeta.');
      }
    } catch (err) {
      setError('Error al crear la carpeta');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-brand-200/60">
        <div className="flex items-center justify-between gap-2 mb-4">
          <h2 className="text-lg font-title text-primary flex items-center gap-2">
            <FolderPlus className="w-5 h-5 text-brand-600" />
            Nueva carpeta
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-brand-500 hover:bg-brand-100/50 transition-colors"
            aria-label="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center gap-2 py-2 px-3 rounded-xl bg-brand-100/40 text-brand-600 text-sm font-body">
            <Folder size={18} />
            <span>Se creará en: <strong>{locationLabel}</strong></span>
          </div>

          <div>
            <label className="block text-xs font-bold text-brand-700 uppercase tracking-wide mb-1">
              Nombre de la carpeta *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError(null);
              }}
              placeholder="Ej: Contratos 2026"
              className="w-full rounded-xl border border-brand-200/60 px-3 py-2.5 text-sm font-body text-primary focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none placeholder:text-brand-400"
              autoFocus
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 font-body">{error}</p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-brand-200/60 px-4 py-2.5 text-sm font-bold text-brand-700 hover:bg-brand-100/50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-600 transition-colors disabled:opacity-50"
            >
              {saving ? 'Creando...' : 'Crear'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
