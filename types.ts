export enum Phase {
  LEAD = 'Lead',
  CONTACTED = 'Contactado',
  INTERESTED = 'Interesado',
  NEGOTIATION = 'Negociación',
  CLOSED = 'Cerrado',
  SIGNED = 'Firmado'
}

export enum CommercialStatus {
  FREE = 'Periodo gratuito',
  PAYING = 'Cliente pagando',
  NONE = 'N/A'
}

export enum TaskPriority {
  LOW = 'Baja',
  MEDIUM = 'Media',
  HIGH = 'Alta'
}

export interface Activity {
  id: string;
  type: 'Llamada' | 'Email' | 'Reunión' | 'Nota';
  description: string;
  date: string;
}

export interface Task {
  id: string;
  schoolId: string;
  title: string;
  dueDate: string;
  dueTime?: string;
  priority: TaskPriority;
  completed: boolean;
  assignedTo: string;
  isMeeting?: boolean;
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  type: 'crm_task' | 'crm_meeting' | 'google_event';
  schoolId?: string;
  schoolName?: string;
  isAllDay?: boolean;
}

export interface Profile {
  id: string;
  email: string | null;
  displayName: string | null;
}

export interface School {
  id: string;
  name: string;
  city: string;
  region: string;
  phone: string;
  email: string;
  contactPerson: string;
  role: string;
  notes: string;
  phase: Phase;
  status: CommercialStatus;
  activities: Activity[];
  tasks: Task[];
  milestones: string[];
  assignedToId?: string | null;
}

export interface ImportMapping {
  csvField: string;
  crmField: keyof School | '';
}

export interface ReminderSettings {
  notificationsEnabled: boolean;
  checkIntervalMinutes: number;
  remindMinutesBefore: number;
  /** Minutos antes para reuniones y follow-ups (si no se usa, se usa remindMinutesBefore) */
  remindMinutesBeforeFollowUp: number;
  remindForTasks: boolean;
  remindForMeetings: boolean;
}

// --- CRM (clients, deals, projects) ---
export type ClientType = 'school' | 'company' | 'partner' | 'lead';
export type ClientStage = 'new' | 'contacted' | 'meeting' | 'proposal' | 'negotiation' | 'won' | 'lost';
export type ClientStatus = 'active' | 'archived';

export interface Client {
  id: string;
  name: string;
  type: ClientType;
  stage: ClientStage;
  status: ClientStatus;
  website?: string | null;
  location?: string | null;
  city: string;
  region: string;
  phone: string;
  email: string;
  contactPerson: string;
  role: string;
  notes: string;
  activities: Activity[];
  tasks: Task[];
  milestones: string[];
  assignedToId?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export type ContactImportance = 'key' | 'normal';

export interface ClientContact {
  id: string;
  clientId: string;
  fullName: string;
  roleTitle?: string | null;
  email?: string | null;
  phone?: string | null;
  importance: ContactImportance;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type DealStage = 'new' | 'qualified' | 'proposal_sent' | 'negotiation' | 'won' | 'lost';

export interface Deal {
  id: string;
  clientId: string;
  title: string;
  stage: DealStage;
  valueEstimated?: number | null;
  currency: string;
  probability?: number | null;
  expectedCloseDate?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  clientName?: string;
}

export type ProjectStatus = 'planned' | 'active' | 'blocked' | 'done' | 'archived';

export interface Project {
  id: string;
  clientId: string;
  title: string;
  status: ProjectStatus;
  startDate?: string | null;
  dueDate?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  clientName?: string;
}

// --- Work tasks (Tasks tool; distinct from school-scoped Task) ---
export type WorkTaskStatus = 'open' | 'in_progress' | 'done' | 'archived';
export type WorkTaskPriority = 'low' | 'medium' | 'high';
export type WorkTaskLinkEntityType = 'client' | 'deal' | 'project' | 'internal';

export interface WorkTaskLink {
  id: string;
  taskId: string;
  entityType: WorkTaskLinkEntityType;
  entityId: string | null;
  createdAt: string;
}

export interface WorkTask {
  id: string;
  title: string;
  description: string | null;
  status: WorkTaskStatus;
  priority: WorkTaskPriority;
  dueAt: string | null;
  remindAt: string | null;
  assigneeUserId: string | null;
  createdByUserId: string | null;
  completedAt: string | null;
  reminderNotifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
  links?: WorkTaskLink[];
}

export interface WorkTaskNotification {
  id: string;
  userId: string;
  workTaskId: string;
  isRead: boolean;
  createdAt: string;
}

// --- Finance (simple: contracts, invoices, expenses, settings) ---

export type FinanceContractStatus = 'active' | 'pending' | 'cancelled' | 'ended';
export type FinanceContractFrequency = 'monthly' | 'quarterly' | 'yearly';

export interface FinanceContract {
  id: string;
  clientId: string | null;
  title: string;
  startDate: string;
  endDate: string | null;
  frequency: FinanceContractFrequency;
  amount: number;
  currency: string;
  status: FinanceContractStatus;
  externalSource?: string | null;
  externalId?: string | null;
  syncedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  clientName?: string;
}

export type FinanceInvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';

export interface FinanceInvoice {
  id: string;
  contractId: string | null;
  title: string;
  amount: number;
  currency: string;
  issueDate: string;
  dueDate: string | null;
  status: FinanceInvoiceStatus;
  externalSource?: string | null;
  externalId?: string | null;
  syncedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  contractTitle?: string;
}

export type FinanceExpenseStatus = 'pending' | 'paid' | 'cancelled';

export interface FinanceExpense {
  id: string;
  title: string;
  vendor: string;
  category: string;
  amount: number;
  currency: string;
  date: string;
  dueDate: string | null;
  status: FinanceExpenseStatus;
  isRecurring: boolean;
  recurrenceRule: string | null;
  externalSource?: string | null;
  externalId?: string | null;
  syncedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FinanceSettings {
  id: string;
  startingCash: number | null;
  defaultCurrency: string;
  updatedAt: string;
}

/** Legacy expense type (old expenses table). Kept for services/expenses.ts. New Finance uses FinanceExpense. */
export interface Expense {
  id: string;
  documentNumber?: string | null;
  date: string;
  dueDate?: string | null;
  description: string;
  supplierName: string;
  supplierTaxId?: string | null;
  accountCode: string;
  costCenter?: string | null;
  currency: string;
  amountBase: number;
  taxRate: number;
  taxAmount: number;
  totalAmount: number;
  paymentMethod: string;
  paid: boolean;
  paidDate?: string | null;
  schoolId?: string | null;
  exportedAt?: string | null;
  createdAt: string;
  createdBy?: string | null;
  updatedAt: string;
}

// --- Resources (módulo central de enlaces) ---

export type ResourceSource =
  | 'google_drive'
  | 'canva'
  | 'figma'
  | 'notion'
  | 'loom'
  | 'other';

export type ResourceType =
  | 'logo'
  | 'contract'
  | 'deck'
  | 'template'
  | 'report'
  | 'image'
  | 'video'
  | 'spreadsheet'
  | 'doc'
  | 'other';

export type ResourceStatus = 'draft' | 'final' | 'archived';

export type ResourceEntityType = 'client' | 'deal' | 'project' | 'task' | 'internal';

export interface Resource {
  id: string;
  title: string;
  normalizedTitle?: string | null;
  url: string;
  source: ResourceSource;
  type: ResourceType;
  status: ResourceStatus;
  version?: string | null;
  ownerUserId?: string | null;
  description?: string | null;
  aiSummary?: string | null;
  folderId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ResourceLink {
  id: string;
  resourceId: string;
  entityType: ResourceEntityType;
  entityId: string | null;
  isPrimary: boolean;
  createdAt: string;
}

export interface ResourceAlias {
  id: string;
  resourceId: string;
  alias: string;
  createdAt: string;
}

export interface ResourceFolder {
  id: string;
  parentId: string | null;
  name: string;
  schoolId: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Recurso con datos de links denormalizados (para listados) */
export interface ResourceWithLinks extends Resource {
  links?: ResourceLinkInfo[];
  linkedTo?: string; // resumen textual: "Cliente X, Deal Y"
  isPrimaryForEntity?: boolean;
}

export interface ResourceLinkInfo {
  id: string;
  entityType: ResourceEntityType;
  entityId: string | null;
  entityName?: string | null;
  isPrimary: boolean;
}

// Documentos de empresa
export interface DocumentCategory {
  id: string;
  name: string;
  description: string;
  createdAt: string;
}

export interface DocumentRecord {
  id: string;
  categoryId?: string | null;
  title: string;
  url: string;
  description: string;
  owner: string;
  documentType: string;
  createdAt: string;
  updatedAt: string;
  categoryName?: string | null;
}



