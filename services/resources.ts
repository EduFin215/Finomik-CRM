import { supabase, isSupabaseConfigured } from './supabase';
import type {
  Resource,
  ResourceLink,
  ResourceAlias,
  ResourceWithLinks,
  ResourceLinkInfo,
  ResourceSource,
  ResourceType,
  ResourceStatus,
  ResourceEntityType,
} from '../types';

interface ResourceRow {
  id: string;
  title: string;
  normalized_title: string | null;
  url: string;
  source: string;
  type: string;
  status: string;
  version: string | null;
  owner_user_id: string | null;
  description: string | null;
  ai_summary: string | null;
  folder_id: string | null;
  created_at: string;
  updated_at: string;
}

interface ResourceLinkRow {
  id: string;
  resource_id: string;
  entity_type: string;
  entity_id: string | null;
  is_primary: boolean;
  created_at: string;
}

interface ResourceAliasRow {
  id: string;
  resource_id: string;
  alias: string;
  created_at: string;
}

function mapResource(row: ResourceRow): Resource {
  return {
    id: String(row.id),
    title: String(row.title),
    normalizedTitle: row.normalized_title ?? null,
    url: String(row.url),
    source: row.source as ResourceSource,
    type: row.type as ResourceType,
    status: row.status as ResourceStatus,
    version: row.version ?? null,
    ownerUserId: row.owner_user_id ?? null,
    description: row.description ?? null,
    aiSummary: row.ai_summary ?? null,
    folderId: row.folder_id ? String(row.folder_id) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapResourceLink(row: ResourceLinkRow): ResourceLink {
  return {
    id: String(row.id),
    resourceId: String(row.resource_id),
    entityType: row.entity_type as ResourceEntityType,
    entityId: row.entity_id ? String(row.entity_id) : null,
    isPrimary: Boolean(row.is_primary),
    createdAt: String(row.created_at),
  };
}

function mapResourceAlias(row: ResourceAliasRow): ResourceAlias {
  return {
    id: String(row.id),
    resourceId: String(row.resource_id),
    alias: String(row.alias),
    createdAt: String(row.created_at),
  };
}

export interface GetResourcesParams {
  type?: ResourceType;
  status?: ResourceStatus;
  source?: ResourceSource;
  entityType?: ResourceEntityType;
  entityId?: string | null;
  onlyPrimary?: boolean;
  search?: string;
  folderId?: string | null;
}

export async function getResources(
  params?: GetResourcesParams
): Promise<ResourceWithLinks[]> {
  if (!isSupabaseConfigured() || !supabase) return [];

  let resourceIds: string[] | null = null;

  if (params?.entityType !== undefined) {
    let linksQuery = supabase
      .from('resource_links')
      .select('resource_id')
      .eq('entity_type', params.entityType);
    if (params.entityId) {
      linksQuery = linksQuery.eq('entity_id', params.entityId);
    } else if (params.entityType === 'internal') {
      linksQuery = linksQuery.is('entity_id', null);
    }
    if (params?.onlyPrimary) {
      linksQuery = linksQuery.eq('is_primary', true);
    }
    const { data: linkRows } = await linksQuery;
    resourceIds = (linkRows ?? []).map((r) => r.resource_id);
    if (resourceIds.length === 0) return [];
  }

  let query = supabase
    .from('resources')
    .select(
      `
      *,
      resource_links (
        id,
        resource_id,
        entity_type,
        entity_id,
        is_primary,
        created_at
      )
    `
    )
    .order('updated_at', { ascending: false });

  if (resourceIds) {
    query = query.in('id', resourceIds);
  }
  if (params?.type) {
    query = query.eq('type', params.type);
  }
  if (params?.status) {
    query = query.eq('status', params.status);
  }
  if (params?.source) {
    query = query.eq('source', params.source);
  }
  if (params?.search && params.search.trim()) {
    const term = `%${params.search.trim()}%`;
    query = query.or(
      `title.ilike.${term},description.ilike.${term},ai_summary.ilike.${term}`
    );
  }
  if (params?.folderId !== undefined) {
    if (params.folderId === null) {
      query = query.is('folder_id', null);
    } else {
      query = query.eq('folder_id', params.folderId);
    }
  }

  const { data, error } = await query;

  if (error) {
    console.error('getResources error', error);
    return [];
  }

  const rows = (data ?? []) as (ResourceRow & { resource_links: ResourceLinkRow[] })[];
  const result: ResourceWithLinks[] = [];

  for (const row of rows) {
    const resource = mapResource(row);
    const links = Array.isArray(row.resource_links) ? row.resource_links : [];
    const linkInfos: ResourceLinkInfo[] = links.map((l) => ({
      id: String(l.id),
      entityType: l.entity_type as ResourceEntityType,
      entityId: l.entity_id ? String(l.entity_id) : null,
      isPrimary: Boolean(l.is_primary),
    }));
    const linkedTo = linkInfos
      .map((l) => `${l.entityType}${l.entityId ? ` (${l.entityId})` : ''}`)
      .join(', ');
    const isPrimaryForEntity = linkInfos.some((l) => l.isPrimary);

    result.push({
      ...resource,
      links: linkInfos,
      linkedTo: linkedTo || undefined,
      isPrimaryForEntity,
    });
  }

  return result;
}

export interface ResourcesByEntityResult {
  primary: ResourceWithLinks[];
  others: ResourceWithLinks[];
}

export async function getResourcesByEntity(
  entityType: ResourceEntityType,
  entityId: string
): Promise<ResourcesByEntityResult> {
  if (!isSupabaseConfigured() || !supabase) {
    return { primary: [], others: [] };
  }

  const { data: links, error: linksError } = await supabase
    .from('resource_links')
    .select('*, resources(*)')
    .eq('entity_type', entityType)
    .eq('entity_id', entityId);

  if (linksError || !links) {
    console.error('getResourcesByEntity links error', linksError);
    return { primary: [], others: [] };
  }

  const primary: ResourceWithLinks[] = [];
  const others: ResourceWithLinks[] = [];

  for (const linkRow of links as (ResourceLinkRow & { resources: ResourceRow })[]) {
    const res = linkRow.resources;
    if (!res) continue;
    const resource = mapResource(res);
    const linkInfo: ResourceLinkInfo = {
      id: String(linkRow.id),
      entityType: linkRow.entity_type as ResourceEntityType,
      entityId: linkRow.entity_id ? String(linkRow.entity_id) : null,
      isPrimary: Boolean(linkRow.is_primary),
    };
    const withLinks: ResourceWithLinks = {
      ...resource,
      links: [linkInfo],
      isPrimaryForEntity: linkRow.is_primary,
    };
    if (linkRow.is_primary) {
      primary.push(withLinks);
    } else {
      others.push(withLinks);
    }
  }

  return { primary, others };
}

/** Recursos visibles para un cliente: vinculados por resource_links Y recursos en carpetas del cliente (resource_folders.school_id) */
export async function getResourcesForClient(clientId: string): Promise<ResourceWithLinks[]> {
  if (!isSupabaseConfigured() || !supabase) return [];

  const { getFolderIdsForClient } = await import('./resourceFolders');
  const linked = await getResourcesByEntity('client', clientId);
  const linkedList: ResourceWithLinks[] = [...linked.primary, ...linked.others];
  const byId = new Map<string, ResourceWithLinks>();
  for (const r of linkedList) byId.set(r.id, r);

  const folderIds = await getFolderIdsForClient(clientId);
  if (folderIds.length > 0) {
    const { data: folderResources, error } = await supabase
      .from('resources')
      .select('*')
      .in('folder_id', folderIds)
      .order('updated_at', { ascending: false });

    if (!error && folderResources?.length) {
      for (const row of folderResources as ResourceRow[]) {
        if (byId.has(row.id)) continue;
        byId.set(row.id, {
          ...mapResource(row),
          links: [],
        });
      }
    }
  }

  return Array.from(byId.values());
}

export interface CreateResourceData {
  title: string;
  url: string;
  type: ResourceType;
  source?: ResourceSource;
  status?: ResourceStatus;
  version?: string | null;
  description?: string | null;
  ownerUserId?: string | null;
  folderId?: string | null;
  linkTo?: { entityType: ResourceEntityType; entityId: string | null };
  isPrimary?: boolean;
  aliases?: string[];
}

export async function createResource(
  data: CreateResourceData
): Promise<Resource | null> {
  if (!isSupabaseConfigured() || !supabase) return null;

  const { data: res, error } = await supabase
    .from('resources')
    .insert({
      title: data.title.trim(),
      url: data.url.trim(),
      type: data.type,
      source: data.source ?? 'other',
      status: data.status ?? 'draft',
      version: data.version ?? null,
      description: data.description ?? null,
      owner_user_id: data.ownerUserId ?? null,
      folder_id: data.folderId ?? null,
    })
    .select()
    .single();

  if (error || !res) {
    console.error('createResource error', error);
    return null;
  }

  const resource = mapResource(res as ResourceRow);

  if (data.linkTo) {
    await linkResource(
      resource.id,
      data.linkTo.entityType,
      data.linkTo.entityId,
      data.isPrimary ?? false
    );
  }

  if (data.aliases && data.aliases.length > 0) {
    for (const alias of data.aliases) {
      if (alias.trim()) await addAlias(resource.id, alias.trim());
    }
  }

  return resource;
}

export async function updateResource(
  id: string,
  partial: Partial<
    Pick<
      Resource,
      | 'title'
      | 'url'
      | 'source'
      | 'type'
      | 'status'
      | 'version'
      | 'description'
      | 'ownerUserId'
      | 'folderId'
    >
  >
): Promise<Resource | null> {
  if (!isSupabaseConfigured() || !supabase) return null;

  const row: Record<string, unknown> = {};
  if (partial.title !== undefined) row.title = partial.title;
  if (partial.url !== undefined) row.url = partial.url;
  if (partial.source !== undefined) row.source = partial.source;
  if (partial.type !== undefined) row.type = partial.type;
  if (partial.status !== undefined) row.status = partial.status;
  if (partial.version !== undefined) row.version = partial.version;
  if (partial.description !== undefined) row.description = partial.description;
  if (partial.ownerUserId !== undefined) row.owner_user_id = partial.ownerUserId;
  if (partial.folderId !== undefined) row.folder_id = partial.folderId;

  const { data, error } = await supabase
    .from('resources')
    .update(row)
    .eq('id', id)
    .select()
    .single();

  if (error || !data) {
    console.error('updateResource error', error);
    return null;
  }

  return mapResource(data as ResourceRow);
}

export async function archiveResource(id: string): Promise<boolean> {
  return updateResource(id, { status: 'archived' }) !== null;
}

/** Eliminar recurso permanentemente */
export async function deleteResource(id: string): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) return false;

  const { error } = await supabase.from('resources').delete().eq('id', id);

  if (error) {
    console.error('deleteResource error', error);
    return false;
  }
  return true;
}

export async function linkResource(
  resourceId: string,
  entityType: ResourceEntityType,
  entityId: string | null,
  isPrimary = false
): Promise<ResourceLink | null> {
  if (!isSupabaseConfigured() || !supabase) return null;

  const { data, error } = await supabase
    .from('resource_links')
    .insert({
      resource_id: resourceId,
      entity_type: entityType,
      entity_id: entityId,
      is_primary: isPrimary,
    })
    .select()
    .single();

  if (error || !data) {
    console.error('linkResource error', error);
    return null;
  }

  return mapResourceLink(data as ResourceLinkRow);
}

export async function unlinkResource(linkId: string): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) return false;

  const { error } = await supabase
    .from('resource_links')
    .delete()
    .eq('id', linkId);

  if (error) {
    console.error('unlinkResource error', error);
    return false;
  }
  return true;
}

export async function setPrimaryLink(linkId: string): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) return false;

  const { error } = await supabase
    .from('resource_links')
    .update({ is_primary: true })
    .eq('id', linkId);

  if (error) {
    console.error('setPrimaryLink error', error);
    return false;
  }
  return true;
}

export async function addAlias(
  resourceId: string,
  alias: string
): Promise<ResourceAlias | null> {
  if (!isSupabaseConfigured() || !supabase) return null;

  const trimmed = alias.trim();
  if (!trimmed) return null;

  const { data, error } = await supabase
    .from('resource_aliases')
    .insert({ resource_id: resourceId, alias: trimmed })
    .select()
    .single();

  if (error || !data) {
    console.error('addAlias error', error);
    return null;
  }

  return mapResourceAlias(data as ResourceAliasRow);
}

export async function removeAlias(aliasId: string): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) return false;

  const { error } = await supabase
    .from('resource_aliases')
    .delete()
    .eq('id', aliasId);

  if (error) {
    console.error('removeAlias error', error);
    return false;
  }
  return true;
}

/** Vincular un recurso existente a una entidad */
export async function linkExistingResource(
  resourceId: string,
  entityType: ResourceEntityType,
  entityId: string,
  isPrimary = false
): Promise<ResourceLink | null> {
  return linkResource(resourceId, entityType, entityId, isPrimary);
}

/** Obtener todos los recursos (para selector "link existing") */
export async function getAllResourcesForPicker(): Promise<Resource[]> {
  if (!isSupabaseConfigured() || !supabase) return [];

  const { data, error } = await supabase
    .from('resources')
    .select('*')
    .neq('status', 'archived')
    .order('title', { ascending: true });

  if (error || !data) {
    console.error('getAllResourcesForPicker error', error);
    return [];
  }

  return (data as ResourceRow[]).map(mapResource);
}
