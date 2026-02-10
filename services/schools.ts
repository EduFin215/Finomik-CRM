import { supabase, isSupabaseConfigured } from './supabase';
import type { School, Activity, Task, Phase, CommercialStatus, TaskPriority } from '../types';

export interface SchoolRow {
  id: string;
  name: string;
  city: string;
  region: string;
  phone: string;
  email: string;
  contact_person: string;
  role: string;
  notes: string;
  phase: Phase;
  status: CommercialStatus;
  milestones: string[] | unknown;
  assigned_to_id?: string | null;
}

export interface ActivityRow {
  id: string;
  school_id: string;
  type: Activity['type'];
  description: string;
  date: string;
}

export interface TaskRow {
  id: string;
  school_id: string;
  title: string;
  due_date: string;
  due_time?: string | null;
  priority: TaskPriority;
  completed: boolean;
  assigned_to: string;
  is_meeting: boolean;
}

// Map DB row (snake_case) to Activity
function mapActivity(row: ActivityRow): Activity {
  return {
    id: String(row.id),
    type: row.type as Activity['type'],
    description: String(row.description),
    date: String(row.date),
  };
}

// Map DB row to Task
function mapTask(row: TaskRow): Task {
  return {
    id: String(row.id),
    schoolId: String(row.school_id),
    title: String(row.title),
    dueDate: String(row.due_date),
    dueTime: row.due_time != null ? String(row.due_time) : undefined,
    priority: row.priority ?? TaskPriority.MEDIUM,
    completed: Boolean(row.completed),
    assignedTo: String(row.assigned_to ?? 'Current User'),
    isMeeting: Boolean(row.is_meeting),
  };
}

// Map DB row to School (without nested; we'll attach activities/tasks in getSchools)
function mapSchoolRow(row: SchoolRow): Omit<School, 'activities' | 'tasks'> & { activities?: Activity[]; tasks?: Task[] } {
  const milestones = row.milestones;
  return {
    id: String(row.id),
    name: String(row.name),
    city: String(row.city ?? ''),
    region: String(row.region ?? ''),
    phone: String(row.phone ?? ''),
    email: String(row.email),
    contactPerson: String(row.contact_person ?? ''),
    role: String(row.role ?? ''),
    notes: String(row.notes ?? ''),
    phase: (row.phase as Phase) ?? 'Lead',
    status: (row.status as CommercialStatus) ?? 'N/A',
    activities: [],
    tasks: [],
    milestones: Array.isArray(milestones) ? milestones : [],
    assignedToId: row.assigned_to_id != null ? String(row.assigned_to_id) : null,
  };
}

function toSchoolRow(row: Record<string, unknown>): SchoolRow {
  return row as unknown as SchoolRow;
}
function toActivityRow(row: Record<string, unknown>): ActivityRow {
  return row as unknown as ActivityRow;
}
function toTaskRow(row: Record<string, unknown>): TaskRow {
  return row as unknown as TaskRow;
}

export async function getSchools(): Promise<School[]> {
  if (!isSupabaseConfigured() || !supabase) return [];

  const [schoolsRes, activitiesRes, tasksRes] = await Promise.all([
    supabase.from('schools').select('*').order('updated_at', { ascending: false }),
    supabase.from('activities').select('*').order('date', { ascending: false }),
    supabase.from('tasks').select('*').order('due_date', { ascending: true }),
  ]);

  if (schoolsRes.error) {
    console.error('getSchools error', schoolsRes.error);
    return [];
  }

  const schoolsRows = (schoolsRes.data ?? []) as Record<string, unknown>[];
  const allActivities = (activitiesRes.data ?? []) as Record<string, unknown>[];
  const allTasks = (tasksRes.data ?? []) as Record<string, unknown>[];

  const activitiesBySchool = new Map<string, Activity[]>();
  for (const row of allActivities) {
    const schoolId = String(row.school_id);
    if (!activitiesBySchool.has(schoolId)) activitiesBySchool.set(schoolId, []);
    activitiesBySchool.get(schoolId)!.push(mapActivity(toActivityRow(row)));
  }
  const tasksBySchool = new Map<string, Task[]>();
  for (const row of allTasks) {
    const schoolId = String(row.school_id);
    if (!tasksBySchool.has(schoolId)) tasksBySchool.set(schoolId, []);
    tasksBySchool.get(schoolId)!.push(mapTask(toTaskRow(row)));
  }

  return schoolsRows.map((row) => {
    const schoolId = String(row.id);
    const base = mapSchoolRow(toSchoolRow(row));
    const activities = (activitiesBySchool.get(schoolId) ?? []).sort((a, b) => b.date.localeCompare(a.date));
    const tasks = (tasksBySchool.get(schoolId) ?? []).sort((a, b) => a.dueDate.localeCompare(b.dueDate) || (a.dueTime ?? '').localeCompare(b.dueTime ?? ''));
    return { ...base, activities, tasks };
  });
}

export async function getSchoolById(id: string): Promise<School | null> {
  if (!isSupabaseConfigured() || !supabase) return null;

  const { data: schoolRow, error: schoolError } = await supabase
    .from('schools')
    .select('*')
    .eq('id', id)
    .single();

  if (schoolError || !schoolRow) return null;

  const base = mapSchoolRow(toSchoolRow(schoolRow as Record<string, unknown>));
  const schoolId = String((schoolRow as Record<string, unknown>).id);

  const [activitiesRes, tasksRes] = await Promise.all([
    supabase.from('activities').select('*').eq('school_id', schoolId).order('date', { ascending: false }),
    supabase.from('tasks').select('*').eq('school_id', schoolId).order('due_date', { ascending: true }),
  ]);

  const activities = ((activitiesRes.data ?? []) as Record<string, unknown>[]).map((r) => mapActivity(toActivityRow(r)));
  const tasks = ((tasksRes.data ?? []) as Record<string, unknown>[]).map((r) => mapTask(toTaskRow(r)));

  return { ...base, activities, tasks };
}

function schoolToRow(school: School): Record<string, unknown> {
  return {
    id: school.id,
    name: school.name,
    city: school.city,
    region: school.region,
    phone: school.phone,
    email: school.email,
    contact_person: school.contactPerson,
    role: school.role,
    notes: school.notes,
    phase: school.phase,
    status: school.status,
    milestones: school.milestones,
    assigned_to_id: school.assignedToId ?? null,
  };
}

export async function createSchool(school: School): Promise<School | null> {
  if (!isSupabaseConfigured() || !supabase) return null;

  const row = schoolToRow(school);
  const { id: _id, ...insertRow } = row;
  const { data, error } = await supabase
    .from('schools')
    .insert(insertRow)
    .select()
    .single();

  if (error) {
    console.error('createSchool error', error);
    return null;
  }

  const created = mapSchoolRow(toSchoolRow(data as Record<string, unknown>));
  return { ...created, activities: school.activities ?? [], tasks: school.tasks ?? [] };
}

export async function updateSchool(id: string, partial: Partial<School>): Promise<School | null> {
  if (!isSupabaseConfigured() || !supabase) return null;

  const row: Record<string, unknown> = {};
  if (partial.name != null) row.name = partial.name;
  if (partial.city != null) row.city = partial.city;
  if (partial.region != null) row.region = partial.region;
  if (partial.phone != null) row.phone = partial.phone;
  if (partial.email != null) row.email = partial.email;
  if (partial.contactPerson != null) row.contact_person = partial.contactPerson;
  if (partial.role != null) row.role = partial.role;
  if (partial.notes != null) row.notes = partial.notes;
  if (partial.phase != null) row.phase = partial.phase;
  if (partial.status != null) row.status = partial.status;
  if (partial.milestones != null) row.milestones = partial.milestones;
  if (partial.assignedToId !== undefined) row.assigned_to_id = partial.assignedToId;

  const { data, error } = await supabase
    .from('schools')
    .update(row)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('updateSchool error', error);
    return null;
  }

  const base = mapSchoolRow(toSchoolRow(data as Record<string, unknown>));
  const schoolId = String((data as Record<string, unknown>).id);
  const [activitiesRes, tasksRes] = await Promise.all([
    supabase.from('activities').select('*').eq('school_id', schoolId).order('date', { ascending: false }),
    supabase.from('tasks').select('*').eq('school_id', schoolId).order('due_date', { ascending: true }),
  ]);
  const activities = ((activitiesRes.data ?? []) as Record<string, unknown>[]).map((r) => mapActivity(toActivityRow(r)));
  const tasks = ((tasksRes.data ?? []) as Record<string, unknown>[]).map((r) => mapTask(toTaskRow(r)));
  return { ...base, activities, tasks };
}

export async function deleteSchool(id: string): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) return false;
  const { error } = await supabase.from('schools').delete().eq('id', id);
  return !error;
}

// Activities
export async function getActivitiesBySchoolId(schoolId: string): Promise<Activity[]> {
  if (!isSupabaseConfigured() || !supabase) return [];
  const { data, error } = await supabase
    .from('activities')
    .select('*')
    .eq('school_id', schoolId)
    .order('date', { ascending: false });
  if (error) return [];
  return ((data ?? []) as Record<string, unknown>[]).map((r) => mapActivity(toActivityRow(r)));
}

export async function addActivity(schoolId: string, activity: Omit<Activity, 'id'>): Promise<Activity | null> {
  if (!isSupabaseConfigured() || !supabase) return null;
  const { data, error } = await supabase
    .from('activities')
    .insert({
      school_id: schoolId,
      type: activity.type,
      description: activity.description,
      date: activity.date,
    })
    .select()
    .single();
  if (error) return null;
  return mapActivity(toActivityRow(data as Record<string, unknown>));
}

export async function updateActivity(id: string, partial: Partial<Activity>): Promise<Activity | null> {
  if (!isSupabaseConfigured() || !supabase) return null;
  const row: Record<string, unknown> = {};
  if (partial.type != null) row.type = partial.type;
  if (partial.description != null) row.description = partial.description;
  if (partial.date != null) row.date = partial.date;
  const { data, error } = await supabase.from('activities').update(row).eq('id', id).select().single();
  return error ? null : mapActivity(toActivityRow(data as Record<string, unknown>));
}

export async function deleteActivity(id: string): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) return false;
  const { error } = await supabase.from('activities').delete().eq('id', id);
  return !error;
}

// Tasks
export async function getTasksBySchoolId(schoolId: string): Promise<Task[]> {
  if (!isSupabaseConfigured() || !supabase) return [];
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('school_id', schoolId)
    .order('due_date', { ascending: true });
  if (error) return [];
  return ((data ?? []) as Record<string, unknown>[]).map((r) => mapTask(toTaskRow(r)));
}

export async function getAllTasks(): Promise<Task[]> {
  if (!isSupabaseConfigured() || !supabase) return [];
  const { data, error } = await supabase.from('tasks').select('*').order('due_date', { ascending: true });
  if (error) return [];
  return ((data ?? []) as Record<string, unknown>[]).map((r) => mapTask(toTaskRow(r)));
}

function taskToRow(task: Task): Record<string, unknown> {
  return {
    school_id: task.schoolId,
    title: task.title,
    due_date: task.dueDate,
    due_time: task.dueTime ?? null,
    priority: task.priority,
    completed: task.completed,
    assigned_to: task.assignedTo,
    is_meeting: task.isMeeting ?? false,
  };
}

export async function createTask(task: Task): Promise<Task | null> {
  if (!isSupabaseConfigured() || !supabase) return null;
  const row = taskToRow(task);
  const { data, error } = await supabase.from('tasks').insert(row).select().single();
  if (error) return null;
  return mapTask(toTaskRow(data as Record<string, unknown>));
}

export async function updateTask(id: string, partial: Partial<Task>): Promise<Task | null> {
  if (!isSupabaseConfigured() || !supabase) return null;
  const row: Record<string, unknown> = {};
  if (partial.schoolId != null) row.school_id = partial.schoolId;
  if (partial.title != null) row.title = partial.title;
  if (partial.dueDate != null) row.due_date = partial.dueDate;
  if (partial.dueTime != null) row.due_time = partial.dueTime;
  if (partial.priority != null) row.priority = partial.priority;
  if (partial.completed != null) row.completed = partial.completed;
  if (partial.assignedTo != null) row.assigned_to = partial.assignedTo;
  if (partial.isMeeting != null) row.is_meeting = partial.isMeeting;
  const { data, error } = await supabase.from('tasks').update(row).eq('id', id).select().single();
  return error ? null : mapTask(toTaskRow(data as Record<string, unknown>));
}

export async function deleteTask(id: string): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) return false;
  const { error } = await supabase.from('tasks').delete().eq('id', id);
  return !error;
}

export async function toggleTaskCompleted(id: string, completed: boolean): Promise<Task | null> {
  return updateTask(id, { completed });
}
