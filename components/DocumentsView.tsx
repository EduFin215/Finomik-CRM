import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Folder,
  FileText,
  PlusCircle,
  Pencil,
  Trash2,
  ExternalLink,
  Filter,
  X,
} from 'lucide-react';
import {
  getDocumentCategories,
  getDocuments,
  createDocument,
  updateDocument,
  deleteDocument,
  createDocumentCategory,
  updateDocumentCategory,
  deleteDocumentCategory,
} from '../services/documents';
import type { DocumentCategory, DocumentRecord } from '../types';

interface DocumentFormState {
  id?: string;
  title: string;
  url: string;
  description: string;
  owner: string;
  documentType: string;
  categoryId?: string | null;
}

const emptyForm: DocumentFormState = {
  title: '',
  url: '',
  description: '',
  owner: '',
  documentType: '',
  categoryId: null,
};

export default function DocumentsView() {
  const queryClient = useQueryClient();
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    null,
  );
  const [search, setSearch] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<DocumentFormState | null>(null);
  const [isCategoriesOpen, setIsCategoriesOpen] = useState(false);
  const [categoryName, setCategoryName] = useState('');
  const [categoryDescription, setCategoryDescription] = useState('');
  const [categoryBeingEdited, setCategoryBeingEdited] = useState<
    DocumentCategory | null
  >(null);

  const {
    data: categories = [],
    isLoading: categoriesLoading,
    error: categoriesError,
  } = useQuery({
    queryKey: ['document_categories'],
    queryFn: getDocumentCategories,
  });

  const {
    data: documents = [],
    isLoading: documentsLoading,
    error: documentsError,
  } = useQuery({
    queryKey: ['documents', { selectedCategoryId, search }],
    queryFn: () =>
      getDocuments({
        categoryId: selectedCategoryId ?? undefined,
        search: search.trim() || undefined,
      }),
  });

  const openNewDocument = () => {
    setEditingDoc(emptyForm);
    setIsFormOpen(true);
  };

  const openEditDocument = (doc: DocumentRecord) => {
    setEditingDoc({
      id: doc.id,
      title: doc.title,
      url: doc.url,
      description: doc.description,
      owner: doc.owner,
      documentType: doc.documentType,
      categoryId: doc.categoryId ?? null,
    });
    setIsFormOpen(true);
  };

  const handleSaveDocument = async () => {
    if (!editingDoc) return;
    const payload: DocumentFormState = {
      ...editingDoc,
      title: editingDoc.title.trim(),
      url: editingDoc.url.trim(),
      description: editingDoc.description.trim(),
      owner: editingDoc.owner.trim(),
      documentType: editingDoc.documentType.trim(),
    };
    if (!payload.title || !payload.url) {
      alert('Título y URL son obligatorios');
      return;
    }

    try {
      if (payload.id) {
        await updateDocument(payload.id, {
          title: payload.title,
          url: payload.url,
          description: payload.description,
          owner: payload.owner,
          documentType: payload.documentType,
          categoryId: payload.categoryId ?? null,
        });
      } else {
        await createDocument({
          title: payload.title,
          url: payload.url,
          description: payload.description,
          owner: payload.owner,
          documentType: payload.documentType,
          categoryId: payload.categoryId ?? null,
        });
      }
      // Invalida todas las queries de documentos (incluyendo filtros)
      queryClient.invalidateQueries({ queryKey: ['documents'], exact: false });
      setIsFormOpen(false);
      setEditingDoc(null);
    } catch (err) {
      console.error('handleSaveDocument error', err);
      alert('No se ha podido guardar el documento');
    }
  };

  const handleDeleteDocument = async (doc: DocumentRecord) => {
    if (
      !window.confirm(
        `¿Seguro que quieres eliminar el documento "${doc.title}"?`,
      )
    ) {
      return;
    }
    try {
      await deleteDocument(doc.id);
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    } catch (err) {
      console.error('handleDeleteDocument error', err);
      alert('No se ha podido eliminar el documento');
    }
  };

  const openCategoriesManager = () => {
    setIsCategoriesOpen(true);
    setCategoryBeingEdited(null);
    setCategoryName('');
    setCategoryDescription('');
  };

  const handleSaveCategory = async () => {
    const name = categoryName.trim();
    const description = categoryDescription.trim();
    if (!name) {
      alert('El nombre de la categoría es obligatorio');
      return;
    }

    try {
      if (categoryBeingEdited) {
        await updateDocumentCategory(categoryBeingEdited.id, {
          name,
          description,
        });
      } else {
        await createDocumentCategory(name, description);
      }
      queryClient.invalidateQueries({ queryKey: ['document_categories'] });
      setCategoryBeingEdited(null);
      setCategoryName('');
      setCategoryDescription('');
    } catch (err) {
      console.error('handleSaveCategory error', err);
      alert('No se ha podido guardar la categoría');
    }
  };

  const handleEditCategory = (cat: DocumentCategory) => {
    setCategoryBeingEdited(cat);
    setCategoryName(cat.name);
    setCategoryDescription(cat.description);
  };

  const handleDeleteCategory = async (cat: DocumentCategory) => {
    if (
      !window.confirm(
        `¿Seguro que quieres eliminar la categoría "${cat.name}"? Los documentos asociados quedarán sin categoría.`,
      )
    ) {
      return;
    }
    try {
      await deleteDocumentCategory(cat.id);
      queryClient.invalidateQueries({ queryKey: ['document_categories'] });
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      if (selectedCategoryId === cat.id) {
        setSelectedCategoryId(null);
      }
    } catch (err) {
      console.error('handleDeleteCategory error', err);
      alert('No se ha podido eliminar la categoría');
    }
  };

  const renderCategoryOptions = () => (
    <>
      <option value="">Sin categoría</option>
      {categories.map((cat) => (
        <option key={cat.id} value={cat.id}>
          {cat.name}
        </option>
      ))}
    </>
  );

  const renderFormModal = () => {
    if (!isFormOpen || !editingDoc) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
        <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl">
          <div className="flex items-center justify-between gap-2 mb-4">
            <h2 className="text-lg font-bold text-primary flex items-center gap-2">
              <FileText className="w-5 h-5 text-brand-600" />
              {editingDoc.id ? 'Editar documento' : 'Nuevo documento'}
            </h2>
            <button
              type="button"
              onClick={() => {
                setIsFormOpen(false);
                setEditingDoc(null);
              }}
              className="p-1.5 rounded-full text-brand-500 hover:bg-brand-100"
              aria-label="Cerrar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-brand-700 uppercase tracking-wide mb-1">
                  Título *
                </label>
                <input
                  type="text"
                  value={editingDoc.title}
                  onChange={(e) =>
                    setEditingDoc((prev) =>
                      prev ? { ...prev, title: e.target.value } : prev,
                    )
                  }
                  className="w-full rounded-lg border border-brand-200 px-3 py-2 text-sm text-primary focus:border-brand-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-brand-700 uppercase tracking-wide mb-1">
                  Categoría
                </label>
                <select
                  value={editingDoc.categoryId ?? ''}
                  onChange={(e) =>
                    setEditingDoc((prev) =>
                      prev
                        ? {
                            ...prev,
                            categoryId: e.target.value || null,
                          }
                        : prev,
                    )
                  }
                  className="w-full rounded-lg border border-brand-200 px-3 py-2 text-sm text-primary focus:border-brand-500 focus:outline-none"
                >
                  {renderCategoryOptions()}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-brand-700 uppercase tracking-wide mb-1">
                URL *
              </label>
              <input
                type="url"
                value={editingDoc.url}
                onChange={(e) =>
                  setEditingDoc((prev) =>
                    prev ? { ...prev, url: e.target.value } : prev,
                  )
                }
                placeholder="https://..."
                className="w-full rounded-lg border border-brand-200 px-3 py-2 text-sm text-primary focus:border-brand-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-brand-700 uppercase tracking-wide mb-1">
                Descripción
              </label>
              <textarea
                value={editingDoc.description}
                onChange={(e) =>
                  setEditingDoc((prev) =>
                    prev ? { ...prev, description: e.target.value } : prev,
                  )
                }
                rows={3}
                className="w-full rounded-lg border border-brand-200 px-3 py-2 text-sm text-primary focus:border-brand-500 focus:outline-none"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-brand-700 uppercase tracking-wide mb-1">
                  Tipo de documento
                </label>
                <input
                  type="text"
                  value={editingDoc.documentType}
                  onChange={(e) =>
                    setEditingDoc((prev) =>
                      prev
                        ? { ...prev, documentType: e.target.value }
                        : prev,
                    )
                  }
                  placeholder="Contrato, Política, Plantilla..."
                  className="w-full rounded-lg border border-brand-200 px-3 py-2 text-sm text-primary focus:border-brand-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-brand-700 uppercase tracking-wide mb-1">
                  Responsable
                </label>
                <input
                  type="text"
                  value={editingDoc.owner}
                  onChange={(e) =>
                    setEditingDoc((prev) =>
                      prev ? { ...prev, owner: e.target.value } : prev,
                    )
                  }
                  placeholder="Persona o equipo responsable"
                  className="w-full rounded-lg border border-brand-200 px-3 py-2 text-sm text-primary focus:border-brand-500 focus:outline-none"
                />
              </div>
            </div>
          </div>
          <div className="mt-6 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setIsFormOpen(false);
                setEditingDoc(null);
              }}
              className="rounded-lg border border-brand-200 px-4 py-2 text-sm font-bold text-brand-700 hover:bg-brand-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSaveDocument}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-bold text-white hover:bg-brand-500"
            >
              Guardar
            </button>
          </div>
        </div>
      </div>
    );
  };

  const totalDocuments = documents.length;
  const uncategorizedCount = documents.filter((d) => !d.categoryId).length;
  const getCountForCategory = (categoryId: string) =>
    documents.filter((d) => d.categoryId === categoryId).length;

  return (
    <>
      <div className="w-full flex justify-end mb-4 px-4 sm:px-0">
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-brand-600 hover:bg-brand-100/50 hover:text-primary text-xs sm:text-sm font-bold border border-transparent hover:border-brand-200 transition-colors"
          title="Volver al selector de herramientas"
        >
          <Folder className="w-4 h-4" />
          <span>Cambiar de herramienta</span>
        </Link>
      </div>

      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-primary flex items-center gap-2">
              <FileText className="w-6 h-6 text-brand-600" />
              Documentos de la empresa
            </h1>
            <p className="mt-1 text-sm text-brand-600 font-body">
              Organiza en un solo sitio los enlaces a contratos, plantillas,
              manuales y más.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={openCategoriesManager}
              className="inline-flex items-center gap-2 rounded-lg border border-brand-200 px-3 py-2 text-sm font-bold text-brand-700 hover:bg-brand-50 bg-white shadow-sm"
            >
              <Folder className="w-4 h-4" />
              Gestionar categorías
            </button>
            <button
              type="button"
              onClick={openNewDocument}
              className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-brand-500"
            >
              <PlusCircle className="w-4 h-4" />
              Nuevo documento
            </button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[260px,1fr]">
          {/* Sidebar de categorías */}
          <aside className="rounded-2xl border border-brand-100 bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-2">
              <h2 className="text-xs font-bold uppercase tracking-wide text-brand-500">
                Categorías
              </h2>
              <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-[11px] font-semibold text-brand-700 border border-brand-100">
                {totalDocuments} doc{totalDocuments === 1 ? '' : 's'}
              </span>
            </div>
            <ul className="space-y-1.5">
              <li>
                <button
                  type="button"
                  onClick={() => setSelectedCategoryId(null)}
                  className={`flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-xs font-semibold transition-colors ${
                    !selectedCategoryId
                      ? 'bg-brand-600 text-white shadow-sm'
                      : 'text-brand-700 hover:bg-brand-50'
                  }`}
                >
                  <span className="inline-flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-brand-50 text-[10px] font-bold text-brand-700 border border-brand-100">
                      All
                    </span>
                    <span>Todas las categorías</span>
                  </span>
                  <span className="text-[11px] opacity-80 text-brand-700">
                    {totalDocuments}
                  </span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setSelectedCategoryId('')}
                  className={`mt-1 flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-xs font-semibold transition-colors ${
                    selectedCategoryId === ''
                      ? 'bg-brand-100 text-primary'
                      : 'text-brand-700 hover:bg-brand-50'
                  }`}
                >
                  <span className="inline-flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-brand-50 text-[10px] font-bold text-brand-700 border border-brand-100">
                      —
                    </span>
                    <span>Sin categoría</span>
                  </span>
                  <span className="text-[11px] opacity-80 text-brand-700">
                    {uncategorizedCount}
                  </span>
                </button>
              </li>
              {categories.map((cat) => {
                const count = getCountForCategory(cat.id);
                const isActive = selectedCategoryId === cat.id;
                return (
                  <li key={cat.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedCategoryId(cat.id)}
                      className={`flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-xs font-semibold transition-colors ${
                        isActive
                          ? 'bg-brand-50 text-primary shadow-inner border border-brand-200'
                          : 'text-brand-700 hover:bg-brand-50'
                      }`}
                    >
                      <span className="inline-flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-brand-50 text-[10px] font-bold text-brand-700 border border-brand-100">
                          {cat.name.charAt(0).toUpperCase()}
                        </span>
                        <span className="truncate">{cat.name}</span>
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] ${
                          isActive
                            ? 'bg-brand-600 text-white'
                            : 'bg-brand-50 text-brand-700 border border-brand-100'
                        }`}
                      >
                        {count}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </aside>

          {/* Panel principal de documentos */}
          <section className="relative rounded-2xl border border-brand-100 bg-white p-4 sm:p-6 shadow-sm">
            <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 border border-brand-100">
                  <FileText className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-brand-500">
                    Biblioteca
                  </p>
                  <p className="text-[11px] font-body text-brand-500">
                    Vista tipo grid inspirada en Google Drive.
                  </p>
                </div>
              </div>
              <div className="flex flex-1 items-center gap-2 md:max-w-md">
                <div className="relative flex-1">
                  <Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-400" />
                  <input
                    type="text"
                    placeholder="Buscar por título, descripción, tipo o responsable..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full rounded-full border border-brand-200 bg-brand-50 px-9 py-2 text-xs text-primary placeholder:text-brand-400 focus:border-brand-500 focus:bg-white focus:outline-none"
                  />
                </div>
                <button
                  type="button"
                  onClick={openNewDocument}
                  className="hidden items-center gap-2 rounded-full bg-brand-600 px-3 py-2 text-[11px] font-bold text-white shadow-sm hover:bg-brand-500 sm:inline-flex"
                >
                  <PlusCircle className="h-3.5 w-3.5" />
                  <span>Nuevo</span>
                </button>
              </div>
            </div>

            {(categoriesLoading || documentsLoading) && (
              <p className="mt-4 text-xs font-body text-brand-500">
                Cargando documentos...
              </p>
            )}
            {(categoriesError || documentsError) && (
              <p className="mt-4 text-xs font-body text-red-600">
                Error al cargar datos. Revisa la consola.
              </p>
            )}

            {!documentsLoading && documents.length === 0 && (
              <div className="mt-8 rounded-2xl border border-dashed border-brand-200 bg-brand-50/60 px-6 py-10 text-center">
                <p className="text-sm font-bold text-primary">
                  Todavía no hay documentos.
                </p>
                <p className="mt-1 text-xs font-body text-brand-600">
                  Crea tu primer documento para empezar a centralizar la
                  documentación de la empresa.
                </p>
                <button
                  type="button"
                  onClick={openNewDocument}
                  className="mt-5 inline-flex items-center gap-2 rounded-full bg-brand-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-brand-500"
                >
                  <PlusCircle className="h-4 w-4" />
                  Nuevo documento
                </button>
              </div>
            )}

            {documents.length > 0 && (
              <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {documents.map((doc) => {
                  const createdDate = doc.createdAt
                    ? new Date(doc.createdAt).toLocaleDateString('es-ES', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })
                    : '';
                  return (
                    <div
                      key={doc.id}
                      className="group relative flex flex-col overflow-hidden rounded-2xl border border-brand-100 bg-white p-4 shadow-sm transition-transform duration-150 hover:-translate-y-0.5 hover:shadow-lg"
                    >
                      <div className="relative flex items-start justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => window.open(doc.url, '_blank')}
                          className="inline-flex max-w-[70%] items-center gap-2 text-left"
                        >
                          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-600 border border-brand-100">
                            <FileText className="h-4 w-4" />
                          </span>
                          <span className="flex flex-col">
                            <span className="line-clamp-2 text-sm font-semibold text-primary">
                              {doc.title}
                            </span>
                            {doc.categoryName && (
                              <span className="mt-1 inline-flex items-center rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-semibold text-brand-700 border border-brand-100">
                                {doc.categoryName}
                              </span>
                            )}
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => window.open(doc.url, '_blank')}
                          className="relative inline-flex h-8 w-8 items-center justify-center rounded-full bg-brand-50 text-brand-600 border border-brand-100 hover:bg-brand-100"
                          title="Abrir en una nueva pestaña"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      {doc.description && (
                        <p className="relative mt-3 line-clamp-3 text-[11px] font-body text-brand-700">
                          {doc.description}
                        </p>
                      )}

                      <div className="relative mt-4 flex flex-wrap items-center gap-2 text-[10px] text-brand-500">
                        {doc.documentType && (
                          <span className="inline-flex items-center rounded-full bg-brand-50 px-2 py-0.5 font-semibold text-brand-700 border border-brand-100">
                            {doc.documentType}
                          </span>
                        )}
                        {doc.owner && (
                          <span className="inline-flex items-center rounded-full bg-brand-50 px-2 py-0.5 font-medium text-brand-700 border border-brand-100">
                            {doc.owner}
                          </span>
                        )}
                        {createdDate && (
                          <span className="ml-auto text-[10px] text-brand-400">
                            Creado el {createdDate}
                          </span>
                        )}
                      </div>

                      <div className="relative mt-4 flex items-center justify-between border-t border-brand-100 pt-3">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEditDocument(doc)}
                            className="inline-flex items-center gap-1 rounded-full border border-brand-200 bg-white px-2.5 py-1 text-[10px] font-semibold text-primary hover:bg-brand-50"
                          >
                            <Pencil className="h-3 w-3" />
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteDocument(doc)}
                            className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-[10px] font-semibold text-red-600 hover:bg-red-100"
                          >
                            <Trash2 className="h-3 w-3" />
                            Eliminar
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>

      {renderFormModal()}

      {isCategoriesOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between gap-2 mb-4">
              <h2 className="text-lg font-bold text-primary flex items-center gap-2">
                <Folder className="w-5 h-5 text-brand-600" />
                Gestionar categorías
              </h2>
              <button
                type="button"
                onClick={() => {
                  setIsCategoriesOpen(false);
                  setCategoryBeingEdited(null);
                  setCategoryName('');
                  setCategoryDescription('');
                }}
                className="p-1.5 rounded-full text-brand-500 hover:bg-brand-100"
                aria-label="Cerrar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-brand-700 uppercase tracking-wide mb-1">
                  Nombre de la categoría
                </label>
                <input
                  type="text"
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  className="w-full rounded-lg border border-brand-200 px-3 py-2 text-sm text-primary focus:border-brand-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-brand-700 uppercase tracking-wide mb-1">
                  Descripción
                </label>
                <textarea
                  value={categoryDescription}
                  onChange={(e) => setCategoryDescription(e.target.value)}
                  rows={2}
                  className="w-full rounded-lg border border-brand-200 px-3 py-2 text-sm text-primary focus:border-brand-500 focus:outline-none"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setCategoryBeingEdited(null);
                    setCategoryName('');
                    setCategoryDescription('');
                  }}
                  className="rounded-lg border border-brand-200 px-4 py-2 text-sm font-bold text-brand-700 hover:bg-brand-50"
                >
                  Limpiar
                </button>
                <button
                  type="button"
                  onClick={handleSaveCategory}
                  className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-bold text-white hover:bg-brand-500"
                >
                  {categoryBeingEdited ? 'Guardar cambios' : 'Añadir categoría'}
                </button>
              </div>
              <div className="mt-4 border-t border-brand-100 pt-3">
                <p className="text-xs font-bold text-brand-700 uppercase tracking-wide mb-2">
                  Categorías existentes
                </p>
                {categories.length === 0 ? (
                  <p className="text-xs text-brand-500 font-body">
                    Todavía no hay categorías creadas.
                  </p>
                ) : (
                  <ul className="max-h-48 overflow-y-auto divide-y divide-brand-50">
                    {categories.map((cat) => (
                      <li
                        key={cat.id}
                        className="flex items-center justify-between gap-2 py-2"
                      >
                        <div>
                          <p className="text-sm font-bold text-primary">
                            {cat.name}
                          </p>
                          {cat.description && (
                            <p className="text-xs text-brand-600 font-body">
                              {cat.description}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleEditCategory(cat)}
                            className="inline-flex items-center gap-1 rounded-md border border-brand-200 px-2 py-1 text-[11px] font-bold text-brand-700 hover:bg-brand-100/70"
                          >
                            <Pencil className="w-3 h-3" />
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteCategory(cat)}
                            className="inline-flex items-center gap-1 rounded-md border border-red-200 px-2 py-1 text-[11px] font-bold text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="w-3 h-3" />
                            Eliminar
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

