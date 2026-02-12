import { supabase, isSupabaseConfigured } from '../supabase';
import type { Client, ClientStage, ClientType } from '../../types';
import type { Activity, Task, School } from '../../types';

/** Map phase (legacy) to stage for backfill compatibility */
const PHASE_TO_STAGE: Record<string, ClientStage> = {
  Lead: 'new',
  Contactado: 'contacted',
  Interesado: 'meeting',
  Negociación: 'negotiation',
  Cerrado: 'lost',
  Firmado: 'won',
};

function rowToClient(
  row: Record<string, unknown>,
  activities: Activity[],
  tasks: Task[]
): Client {
  const id = String(row.id);
  const stage = (row.stage as ClientStage) ?? PHASE_TO_STAGE[String(row.phase)] ?? 'new';
  const status = row.archived === true ? 'archived' : 'active';
  return {
    id,
    name: String(row.name ?? ''),
    type: (row.type as ClientType) ?? 'school',
    stage,
    status,
    website: row.website != null ? String(row.website) : null,
    location: row.location != null ? String(row.location) : null,
    city: String(row.city ?? ''),
    region: String(row.region ?? ''),
    phone: String(row.phone ?? ''),
    email: String(row.email ?? ''),
    contactPerson: String(row.contact_person ?? ''),
    role: String(row.role ?? ''),
    notes: String(row.notes ?? ''),
    activities,
    tasks,
    milestones: Array.isArray(row.milestones) ? (row.milestones as string[]) : [],
    assignedToId: row.assigned_to_id != null ? String(row.assigned_to_id) : null,
    createdAt: row.created_at != null ? String(row.created_at) : undefined,
    updatedAt: row.updated_at != null ? String(row.updated_at) : undefined,
  };
}

export interface ListClientsFilters {
  type?: ClientType;
  stage?: ClientStage;
  status?: 'active' | 'archived';
  createdFrom?: string;
  createdTo?: string;
}

export interface ListClientsOptions {
  filters?: ListClientsFilters;
  search?: string;
  limit?: number;
  offset?: number;
}

/** List clients (schools with CRM columns). */
export async function listClients(options: ListClientsOptions = {}): Promise<Client[]> {
  if (!isSupabaseConfigured() || !supabase) return [];

  const activitiesRes = await supabase.from('activities').select('*').order('date', { ascending: false });
  const tasksRes = await supabase.from('tasks').select('*').order('due_date', { ascending: true });

  const allActivities = (activitiesRes.data ?? []) as Record<string, unknown>[];
  const allTasks = (tasksRes.data ?? []) as Record<string, unknown>[];

  const activitiesBySchool = new Map<string, Activity[]>();
  for (const row of allActivities) {
    const schoolId = String(row.school_id);
    if (!activitiesBySchool.has(schoolId)) activitiesBySchool.set(schoolId, []);
    activitiesBySchool.get(schoolId)!.push({
      id: String(row.id),
      type: row.type as Activity['type'],
      description: String(row.description),
      date: String(row.date),
    });
  }
  const tasksBySchool = new Map<string, Task[]>();
  for (const row of allTasks) {
    const schoolId = String(row.school_id);
    if (!tasksBySchool.has(schoolId)) tasksBySchool.set(schoolId, []);
    tasksBySchool.get(schoolId)!.push({
      id: String(row.id),
      schoolId,
      title: String(row.title),
      dueDate: String(row.due_date),
      dueTime: row.due_time != null ? String(row.due_time) : undefined,
      priority: (row.priority as Task['priority']) ?? 'Media',
      completed: Boolean(row.completed),
      assignedTo: String(row.assigned_to ?? 'Current User'),
      isMeeting: Boolean(row.is_meeting),
    });
  }

  const { data: rows } = await supabase
    .from('schools')
    .select('*')
    .order('updated_at', { ascending: false });

  const raw = (rows ?? []) as Record<string, unknown>[];
  let clients: Client[] = raw.map((row) => {
    const schoolId = String(row.id);
    const activities = (activitiesBySchool.get(schoolId) ?? []).sort((a, b) => b.date.localeCompare(a.date));
    const tasks = (tasksBySchool.get(schoolId) ?? []).sort(
      (a, b) => a.dueDate.localeCompare(b.dueDate) || (a.dueTime ?? '').localeCompare(b.dueTime ?? '')
    );
    return rowToClient(row, activities, tasks);
  });

  const { filters, search, limit = 1000, offset = 0 } = options;
  if (filters?.type) clients = clients.filter((c) => c.type === filters.type);
  if (filters?.stage) clients = clients.filter((c) => c.stage === filters.stage);
  if (filters?.status) clients = clients.filter((c) => c.status === filters.status);
  if (filters?.createdFrom) clients = clients.filter((c) => c.createdAt && c.createdAt >= filters.createdFrom!);
  if (filters?.createdTo) clients = clients.filter((c) => c.createdAt && c.createdAt.slice(0, 10) <= filters.createdTo!);
  if (search?.trim()) {
    const q = search.toLowerCase().trim();
    clients = clients.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.email && c.email.toLowerCase().includes(q)) ||
        (c.contactPerson && c.contactPerson.toLowerCase().includes(q)) ||
        (c.city && c.city.toLowerCase().includes(q)) ||
        (c.region && c.region.toLowerCase().includes(q)) ||
        (c.notes && c.notes.toLowerCase().includes(q))
    );
  }
  return clients.slice(offset, offset + limit);
}

/** Get a single client by id. */
export async function getClientById(id: string): Promise<Client | null> {
  if (!isSupabaseConfigured() || !supabase) return null;

  const { data: row, error } = await supabase.from('schools').select('*').eq('id', id).single();
  if (error || !row) return null;

  const [activitiesRes, tasksRes] = await Promise.all([
    supabase.from('activities').select('*').eq('school_id', id).order('date', { ascending: false }),
    supabase.from('tasks').select('*').eq('school_id', id).order('due_date', { ascending: true }),
  ]);

  const activities = ((activitiesRes.data ?? []) as Record<string, unknown>[]).map((r) => ({
    id: String(r.id),
    type: r.type as Activity['type'],
    description: String(r.description),
    date: String(r.date),
  }));
  const tasks = ((tasksRes.data ?? []) as Record<string, unknown>[]).map((r) => ({
    id: String(r.id),
    schoolId: id,
    title: String(r.title),
    dueDate: String(r.due_date),
    dueTime: r.due_time != null ? String(r.due_time) : undefined,
    priority: (r.priority as Task['priority']) ?? 'Media',
    completed: Boolean(r.completed),
    assignedTo: String(r.assigned_to ?? 'Current User'),
    isMeeting: Boolean(r.is_meeting),
  }));

  return rowToClient(row as Record<string, unknown>, activities, tasks);
}

/** Adapter: School (from legacy getSchools) to Client. Use when row has type/stage/archived. */
export function schoolToClient(school: School & { type?: ClientType; stage?: ClientStage; archived?: boolean }): Client {
  const stage = school.stage ?? PHASE_TO_STAGE[school.phase] ?? 'new';
  const status = school.archived === true ? 'archived' : 'active';
  return {
    id: school.id,
    name: school.name,
    type: school.type ?? 'school',
    stage,
    status,
    website: (school as Record<string, unknown>).website != null ? String((school as Record<string, unknown>).website) : null,
    location: (school as Record<string, unknown>).location != null ? String((school as Record<string, unknown>).location) : null,
    city: school.city,
    region: school.region,
    phone: school.phone,
    email: school.email,
    contactPerson: school.contactPerson,
    role: school.role,
    notes: school.notes,
    activities: school.activities ?? [],
    tasks: school.tasks ?? [],
    milestones: school.milestones ?? [],
    assignedToId: school.assignedToId ?? null,
  };
}
