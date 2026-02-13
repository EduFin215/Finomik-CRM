import { supabase, isSupabaseConfigured } from './supabase';
import type { ResourceFolder } from '../types';

interface ResourceFolderRow {
  id: string;
  parent_id: string | null;
  name: string;
  school_id: string | null;
  created_at: string;
  updated_at: string;
}

function mapFolder(row: ResourceFolderRow): ResourceFolder {
  return {
    id: String(row.id),
    parentId: row.parent_id ? String(row.parent_id) : null,
    name: String(row.name),
    schoolId: row.school_id ? String(row.school_id) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

/** Obtener todas las carpetas planas (para construir árbol en frontend) */
export async function getFolders(): Promise<ResourceFolder[]> {
  if (!isSupabaseConfigured() || !supabase) return [];

  const { data, error } = await supabase
    .from('resource_folders')
    .select('*')
    .order('name', { ascending: true });

  if (error) {
    console.error('getFolders error', error);
    return [];
  }

  return (data ?? []).map((r) => mapFolder(r as ResourceFolderRow));
}

/** Construir árbol de carpetas desde lista plana */
export function buildFolderTree(folders: ResourceFolder[]): (ResourceFolder & { children: (ResourceFolder & { children: ResourceFolder[] })[] })[] {
  const byParent = new Map<string | null, ResourceFolder[]>();
  byParent.set(null, []);
  for (const f of folders) {
    const key = f.parentId ?? null;
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key)!.push(f);
  }

  function build(parentId: string | null): (ResourceFolder & { children: (ResourceFolder & { children: ResourceFolder[] })[] })[] {
    const list = byParent.get(parentId) ?? [];
    return list.map((f) => ({
      ...f,
      children: build(f.id),
    }));
  }
  return build(null);
}

/** Obtener todos los IDs de carpetas que pertenecen a un cliente (carpetas con school_id = clientId y todas sus subcarpetas) */
export async function getFolderIdsForClient(clientId: string): Promise<string[]> {
  if (!isSupabaseConfigured() || !supabase) return [];

  const { data: folders, error } = await supabase
    .from('resource_folders')
    .select('id, parent_id, school_id');

  if (error || !folders) return [];

  const list = (folders as { id: string; parent_id: string | null; school_id: string | null }[]).map((r) => ({
    id: r.id,
    parentId: r.parent_id ?? null,
    schoolId: r.school_id ?? null,
  }));

  const byParent = new Map<string | null, typeof list>();
  for (const f of list) {
    const key = f.parentId;
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key)!.push(f);
  }

  const result = new Set<string>();
  let queue: string[] = list.filter((f) => f.schoolId === clientId).map((f) => f.id);
  while (queue.length > 0) {
    const next: string[] = [];
    for (const id of queue) {
      if (result.has(id)) continue;
      result.add(id);
      const children = byParent.get(id) ?? [];
      for (const c of children) next.push(c.id);
    }
    queue = next;
  }
  return Array.from(result);
}

/** Obtener una carpeta por id */
export async function getFolderById(id: string): Promise<ResourceFolder | null> {
  if (!isSupabaseConfigured() || !supabase) return null;

  const { data, error } = await supabase
    .from('resource_folders')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) return null;
  return mapFolder(data as ResourceFolderRow);
}

export interface CreateFolderData {
  name: string;
  parentId?: string | null;
  schoolId?: string | null;
}

export interface CreateFolderResult {
  folder: ResourceFolder | null;
  error?: string;
}

/** Crear carpeta */
export async function createFolder(data: CreateFolderData): Promise<CreateFolderResult> {
  if (!isSupabaseConfigured() || !supabase) {
    return { folder: null, error: 'Supabase no está configurado. Revisa .env (VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY).' };
  }

  const name = data.name.trim();
  if (!name) return { folder: null, error: 'El nombre no puede estar vacío' };

  const { data: row, error } = await supabase
    .from('resource_folders')
    .insert({
      name,
      parent_id: data.parentId ?? null,
      school_id: data.schoolId ?? null,
    })
    .select()
    .single();

  if (error) {
    console.error('createFolder error', error);
    const msg = error.message || error.code || 'Error desconocido';
    if (error.code === '42P01' || msg.includes('does not exist')) {
      return { folder: null, error: 'La tabla resource_folders no existe. Ejecuta la migración 014 en Supabase (SQL Editor).' };
    }
    if (error.code === '42501' || msg.toLowerCase().includes('permission')) {
      return { folder: null, error: 'Sin permiso. Revisa las políticas RLS en Supabase.' };
    }
    return { folder: null, error: msg };
  }
  if (!row) return { folder: null, error: 'No se recibió respuesta del servidor' };
  return { folder: mapFolder(row as ResourceFolderRow) };
}

/** Actualizar carpeta (renombrar) */
export async function updateFolder(
  id: string,
  partial: Partial<Pick<ResourceFolder, 'name'>>
): Promise<ResourceFolder | null> {
  if (!isSupabaseConfigured() || !supabase) return null;

  const row: Record<string, unknown> = {};
  if (partial.name !== undefined) row.name = partial.name.trim();

  const { data, error } = await supabase
    .from('resource_folders')
    .update(row)
    .eq('id', id)
    .select()
    .single();

  if (error || !data) return null;
  return mapFolder(data as ResourceFolderRow);
}

/** Eliminar carpeta (CASCADE en subcarpetas, resources.folder_id SET NULL) */
export async function deleteFolder(id: string): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) return false;

  const { error } = await supabase.from('resource_folders').delete().eq('id', id);

  if (error) {
    console.error('deleteFolder error', error);
    return false;
  }
  return true;
}

/** Asegurar carpetas predefinidas existen (Leads, Finanzas, Documentación Legal) */
export async function ensureDefaultFolders(): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return;

  const defaults = ['Leads', 'Finanzas', 'Documentación Legal'];
  const { data: existing } = await supabase
    .from('resource_folders')
    .select('name')
    .is('parent_id', null);

  const names = new Set((existing ?? []).map((r) => r.name));
  for (const name of defaults) {
    if (!names.has(name)) {
      await supabase.from('resource_folders').insert({ name, parent_id: null, school_id: null });
      names.add(name);
    }
  }
}

/** Crear subcarpetas bajo Leads para clientes (schools) que aún no tienen carpeta */
export async function ensureSchoolFoldersExist(): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return;

  const { data: leadsFolder } = await supabase
    .from('resource_folders')
    .select('id')
    .eq('name', 'Leads')
    .is('parent_id', null)
    .limit(1)
    .single();

  if (!leadsFolder?.id) return;

  const { data: schools } = await supabase.from('schools').select('id, name');
  if (!schools?.length) return;

  const { data: existingFolders } = await supabase
    .from('resource_folders')
    .select('school_id')
    .not('school_id', 'is', null);

  const schoolIdsWithFolder = new Set((existingFolders ?? []).map((f) => f.school_id));

  for (const school of schools) {
    if (!schoolIdsWithFolder.has(school.id)) {
      await supabase.from('resource_folders').insert({
        parent_id: leadsFolder.id,
        name: school.name,
        school_id: school.id,
      });
      schoolIdsWithFolder.add(school.id);
    }
  }
}
