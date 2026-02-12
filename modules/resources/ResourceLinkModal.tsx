import React, { useState } from 'react';
import { Link2, X, Search } from 'lucide-react';
import type { Resource, ResourceEntityType } from '../../types';
import { getAllResourcesForPicker } from '../../services/resources';

interface ResourceLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLink: (resourceId: string, isPrimary: boolean) => Promise<void>;
  entityType: ResourceEntityType;
  entityId: string;
}

export function ResourceLinkModal({
  isOpen,
  onClose,
  onLink,
  entityType,
  entityId,
}: ResourceLinkModalProps) {
  const [resources, setResources] = useState<Resource[]>([]);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isPrimary, setIsPrimary] = useState(false);
  const [loading, setLoading] = useState(false);
  const [linking, setLinking] = useState(false);

  React.useEffect(() => {
    if (isOpen) {
      setLoading(true);
      getAllResourcesForPicker()
        .then(setResources)
        .finally(() => setLoading(false));
      setSearch('');
      setSelectedId(null);
      setIsPrimary(false);
    }
  }, [isOpen]);

  const filtered = resources.filter(
    (r) =>
      !search.trim() ||
      r.title.toLowerCase().includes(search.toLowerCase()) ||
      (r.description ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const handleLink = async () => {
    if (!selectedId) return;
    setLinking(true);
    try {
      await onLink(selectedId, isPrimary);
      onClose();
    } finally {
      setLinking(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between gap-2 mb-4">
          <h2 className="text-lg font-bold text-primary flex items-center gap-2">
            <Link2 className="w-5 h-5 text-brand-600" />
            Vincular recurso existente
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

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por título o descripción..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-brand-200 text-sm text-primary focus:border-brand-500 focus:outline-none"
          />
        </div>

        <div className="flex-1 overflow-y-auto min-h-[200px] border border-brand-100 rounded-lg">
          {loading ? (
            <p className="p-4 text-sm text-brand-500">Cargando recursos...</p>
          ) : filtered.length === 0 ? (
            <p className="p-4 text-sm text-brand-500">No hay recursos disponibles.</p>
          ) : (
            <ul className="divide-y divide-brand-50">
              {filtered.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(r.id === selectedId ? null : r.id)}
                    className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-colors ${
                      selectedId === r.id
                        ? 'bg-brand-100 border-l-2 border-brand-600'
                        : 'hover:bg-brand-50'
                    }`}
                  >
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold ${
                        selectedId === r.id
                          ? 'bg-brand-600 text-white'
                          : 'bg-brand-100 text-brand-600'
                      }`}
                    >
                      {r.type.charAt(0).toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-primary truncate">
                        {r.title}
                      </p>
                      <p className="text-[11px] text-brand-500 truncate">
                        {r.type} · {r.source}
                      </p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {selectedId && (
          <label className="flex items-center gap-2 mt-4">
            <input
              type="checkbox"
              checked={isPrimary}
              onChange={(e) => setIsPrimary(e.target.checked)}
              className="rounded border-brand-300"
            />
            <span className="text-sm text-brand-700">
              Marcar como recurso principal para este tipo
            </span>
          </label>
        )}

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-brand-200 px-4 py-2 text-sm font-bold text-brand-700 hover:bg-brand-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleLink}
            disabled={!selectedId || linking}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-bold text-white hover:bg-brand-500 disabled:opacity-50"
          >
            {linking ? 'Vinculando...' : 'Vincular'}
          </button>
        </div>
      </div>
    </div>
  );
}
