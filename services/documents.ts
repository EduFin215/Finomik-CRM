import { supabase, isSupabaseConfigured } from './supabase';
import type { DocumentCategory, DocumentRecord } from '../types';

export interface DocumentCategoryRow {
  id: string;
  name: string;
  description: string;
  created_at: string;
}

export interface DocumentRow {
  id: string;
  category_id: string | null;
  title: string;
  url: string;
  description: string;
  owner: string;
  document_type: string;
  created_at: string;
  updated_at: string;
}

function mapCategory(row: DocumentCategoryRow): DocumentCategory {
  return {
    id: String(row.id),
    name: String(row.name),
    description: String(row.description ?? ''),
    createdAt: String(row.created_at),
  };
}

function mapDocument(
  row: DocumentRow & { category_name?: string | null },
): DocumentRecord {
  return {
    id: String(row.id),
    categoryId: row.category_id,
    title: String(row.title),
    url: String(row.url),
    description: String(row.description ?? ''),
    owner: String(row.owner ?? ''),
    documentType: String(row.document_type ?? ''),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    categoryName: row.category_name ?? null,
  };
}

function toCategoryRow(row: Record<string, unknown>): DocumentCategoryRow {
  return row as unknown as DocumentCategoryRow;
}

function toDocumentRow(
  row: Record<string, unknown>,
): DocumentRow & { category_name?: string | null } {
  return row as unknown as DocumentRow & { category_name?: string | null };
}

// Categories CRUD

export async function getDocumentCategories(): Promise<DocumentCategory[]> {
  if (!isSupabaseConfigured() || !supabase) return [];

  const { data, error } = await supabase
    .from('document_categories')
    .select('*')
    .order('name', { ascending: true });

  if (error || !data) {
    console.error('getDocumentCategories error', error);
    return [];
  }

  return (data as Record<string, unknown>[]).map((row) =>
    mapCategory(toCategoryRow(row)),
  );
}

export async function createDocumentCategory(
  name: string,
  description = '',
): Promise<DocumentCategory | null> {
  if (!isSupabaseConfigured() || !supabase) return null;

  const { data, error } = await supabase
    .from('document_categories')
    .insert({ name, description })
    .select()
    .single();

  if (error || !data) {
    console.error('createDocumentCategory error', error);
    return null;
  }

  return mapCategory(toCategoryRow(data as Record<string, unknown>));
}

export async function updateDocumentCategory(
  id: string,
  partial: Partial<Pick<DocumentCategory, 'name' | 'description'>>,
): Promise<DocumentCategory | null> {
  if (!isSupabaseConfigured() || !supabase) return null;

  const row: Record<string, unknown> = {};
  if (partial.name !== undefined) row.name = partial.name;
  if (partial.description !== undefined) row.description = partial.description;

  const { data, error } = await supabase
    .from('document_categories')
    .update(row)
    .eq('id', id)
    .select()
    .single();

  if (error || !data) {
    console.error('updateDocumentCategory error', error);
    return null;
  }

  return mapCategory(toCategoryRow(data as Record<string, unknown>));
}

export async function deleteDocumentCategory(id: string): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) return false;
  const { error } = await supabase
    .from('document_categories')
    .delete()
    .eq('id', id);
  if (error) {
    console.error('deleteDocumentCategory error', error);
    return false;
  }
  return true;
}

// Documents CRUD

export interface GetDocumentsParams {
  categoryId?: string | null;
  search?: string;
}

export async function getDocuments(
  params?: GetDocumentsParams,
): Promise<DocumentRecord[]> {
  if (!isSupabaseConfigured() || !supabase) return [];

  let query = supabase
    .from('documents')
    .select(
      `
        *,
        document_categories!left (
          name
        )
      `,
    )
    .order('created_at', { ascending: false });

  if (params?.categoryId) {
    query = query.eq('category_id', params.categoryId);
  }

  if (params?.search) {
    const term = `%${params.search}%`;
    query = query.or(
      `title.ilike.${term},description.ilike.${term},document_type.ilike.${term},owner.ilike.${term}`,
    );
  }

  const { data, error } = await query;

  if (error || !data) {
    console.error('getDocuments error', error);
    return [];
  }

  return (data as any[]).map((row) => {
    const flatRow: Record<string, unknown> = { ...row };
    const category = row.document_categories?.[0] ?? row.document_categories;
    if (category && typeof category === 'object') {
      (flatRow as any).category_name = (category as any).name ?? null;
    }
    return mapDocument(
      toDocumentRow(flatRow as unknown as Record<string, unknown>),
    );
  });
}

export async function createDocument(
  partial: Omit<
    DocumentRecord,
    'id' | 'createdAt' | 'updatedAt' | 'categoryName'
  >,
): Promise<DocumentRecord | null> {
  if (!isSupabaseConfigured() || !supabase) return null;

  const { data, error } = await supabase
    .from('documents')
    .insert({
      category_id: partial.categoryId ?? null,
      title: partial.title,
      url: partial.url,
      description: partial.description,
      owner: partial.owner,
      document_type: partial.documentType,
    })
    .select(
      `
        *,
        document_categories!left (
          name
        )
      `,
    )
    .single();

  if (error || !data) {
    console.error('createDocument error', error);
    return null;
  }

  const flatRow: Record<string, unknown> = { ...(data as any) };
  const category = (data as any).document_categories?.[0] ??
    (data as any).document_categories;
  if (category && typeof category === 'object') {
    (flatRow as any).category_name = (category as any).name ?? null;
  }

  return mapDocument(
    toDocumentRow(flatRow as unknown as Record<string, unknown>),
  );
}

export async function updateDocument(
  id: string,
  partial: Partial<Omit<DocumentRecord, 'id' | 'createdAt' | 'updatedAt'>>,
): Promise<DocumentRecord | null> {
  if (!isSupabaseConfigured() || !supabase) return null;

  const row: Record<string, unknown> = {};
  if (partial.categoryId !== undefined) row.category_id = partial.categoryId;
  if (partial.title !== undefined) row.title = partial.title;
  if (partial.url !== undefined) row.url = partial.url;
  if (partial.description !== undefined) row.description = partial.description;
  if (partial.owner !== undefined) row.owner = partial.owner;
  if (partial.documentType !== undefined)
    row.document_type = partial.documentType;

  const { data, error } = await supabase
    .from('documents')
    .update(row)
    .eq('id', id)
    .select(
      `
        *,
        document_categories!left (
          name
        )
      `,
    )
    .single();

  if (error || !data) {
    console.error('updateDocument error', error);
    return null;
  }

  const flatRow: Record<string, unknown> = { ...(data as any) };
  const category = (data as any).document_categories?.[0] ??
    (data as any).document_categories;
  if (category && typeof category === 'object') {
    (flatRow as any).category_name = (category as any).name ?? null;
  }

  return mapDocument(
    toDocumentRow(flatRow as unknown as Record<string, unknown>),
  );
}

export async function deleteDocument(id: string): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) return false;
  const { error } = await supabase.from('documents').delete().eq('id', id);
  if (error) {
    console.error('deleteDocument error', error);
    return false;
  }
  return true;
}

