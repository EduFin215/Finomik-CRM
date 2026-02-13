import React, { useState } from 'react';
import { Link2, Search } from 'lucide-react';
import type { Resource, ResourceEntityType } from '../../types';
import { getAllResourcesForPicker } from '../../services/resources';
import { Modal } from '../../components/ui/Modal';

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

  const footer = (
    <>
      <button
        type="button"
        onClick={onClose}
        className="rounded-xl border border-brand-200/60 px-4 py-2 text-sm font-bold text-brand-700 hover:bg-brand-100/50 transition-colors"
      >
        Cancelar
      </button>
      <button
        type="button"
        onClick={handleLink}
        disabled={!selectedId || linking}
        className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-bold text-white hover:bg-brand-500 disabled:opacity-50 transition-colors shadow-md"
      >
        {linking ? 'Vinculando...' : 'Vincular'}
      </button>
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <Link2 className="w-5 h-5 text-brand-600" />
          <span>Vincular recurso existente</span>
        </div>
      }
      maxWidth="lg"
      footer={footer}
    >
      <div className="flex flex-col h-full min-h-[300px]">
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por título o descripción..."
            className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-brand-200/60 text-sm text-primary focus:border-brand-500 focus:outline-none placeholder:text-brand-soft"
          />
        </div>

        <div className="flex-1 overflow-y-auto border border-brand-100 rounded-xl bg-brand-50/30">
          {loading ? (
            <p className="p-4 text-sm text-brand-500 text-center">Cargando recursos...</p>
          ) : filtered.length === 0 ? (
            <p className="p-4 text-sm text-brand-500 text-center">No hay recursos disponibles.</p>
          ) : (
            <ul className="divide-y divide-brand-100/50">
              {filtered.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(r.id === selectedId ? null : r.id)}
                    className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-all ${selectedId === r.id
                        ? 'bg-brand-100/80 border-l-4 border-brand-600'
                        : 'hover:bg-white border-l-4 border-transparent'
                      }`}
                  >
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold ${selectedId === r.id
                          ? 'bg-brand-600 text-white'
                          : 'bg-white border border-brand-200 text-brand-600'
                        }`}
                    >
                      {r.type.charAt(0).toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm font-bold truncate ${selectedId === r.id ? 'text-brand-800' : 'text-primary'}`}>
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
          <label className="flex items-center gap-2 mt-4 px-1 py-2 rounded-lg hover:bg-brand-50/50 transition-colors cursor-pointer">
            <input
              type="checkbox"
              checked={isPrimary}
              onChange={(e) => setIsPrimary(e.target.checked)}
              className="rounded border-brand-300 text-brand-600 focus:ring-brand-500/20"
            />
            <span className="text-sm font-medium text-brand-700">
              Marcar como recurso principal para este tipo
            </span>
          </label>
        )}
      </div>
    </Modal>
  );
}
