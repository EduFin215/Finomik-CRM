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

// --- Contabilidad España (ERP) ---

export type EsFrequency = 'Mensual' | 'Trimestral' | 'Anual';

export type EsInvoiceStatus = 'Borrador' | 'Emitida' | 'Pagada' | 'Vencida' | 'Cancelada';

export type EsPaymentMethod = 'Transferencia' | 'Tarjeta' | 'SEPA' | 'Otro';

export type EsPaymentStatus = 'Pendiente' | 'Confirmado' | 'Devuelto';

export interface EsTaxRate {
  id: string;
  code: string;
  name: string;
  percentage: number;
  isExempt: boolean;
  isDefault: boolean;
}

export interface EsInvoiceSeries {
  id: string;
  code: string;
  description?: string | null;
  year: number;
  isRectifying: boolean;
  currentNumber: number;
}

export interface EsProduct {
  id: string;
  name: string;
  description: string;
  incomeAccount: string;
  taxRateId?: string | null;
  isActive: boolean;
}

export interface EsContract {
  id: string;
  schoolId: string;
  externalRef?: string | null;
  startDate: string;
  endDate?: string | null;
  frequency: EsFrequency;
  status: 'Activo' | 'Pendiente' | 'Cancelado' | 'Finalizado';
  defaultTaxRateId?: string | null;
  paymentTerms: string;
  schoolName?: string;
}

export interface EsInvoiceLine {
  id: string;
  invoiceId: string;
  productId?: string | null;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRateId?: string | null;
  baseAmount: number;
  taxAmount: number;
  totalAmount: number;
  position: number;
}

export interface EsInvoice {
  id: string;
  schoolId: string;
  contractId?: string | null;
  seriesId: string;
  invoiceNumber: number;
  fullNumber: string;
  issueDate: string;
  operationDate: string;
  dueDate?: string | null;
  currency: string;
  totalBase: number;
  totalTax: number;
  totalAmount: number;
  status: EsInvoiceStatus;
  schoolName?: string;
}

export interface EsPayment {
  id: string;
  invoiceId: string;
  amount: number;
  paymentDate: string;
  method: EsPaymentMethod;
  status: EsPaymentStatus;
}

export interface EsVatIssuedRow {
  invoiceId: string;
  fullNumber: string;
  issueDate: string;
  operationDate: string;
  schoolId: string;
  schoolName: string;
  schoolTaxId: string | null;
  taxRateId: string | null;
  taxCode: string | null;
  taxPercentage: number;
  baseAmount: number;
  taxAmount: number;
}

// Proveedores y compras
export type EsPurchaseStatus = 'Pendiente' | 'Parcialmente pagada' | 'Pagada' | 'Cancelada';

export interface EsSupplier {
  id: string;
  name: string;
  taxId: string | null;
  country: string;
  city: string;
  address: string;
  postalCode: string;
  email: string;
  phone: string;
  payTerms: string;
  accountCode: string;
}

export interface EsPurchaseInvoice {
  id: string;
  supplierId: string;
  supplierName?: string;
  invoiceNumber: string;
  issueDate: string;
  receptionDate?: string | null;
  dueDate?: string | null;
  currency: string;
  totalBase: number;
  totalTax: number;
  totalAmount: number;
  status: EsPurchaseStatus;
}

export interface EsPurchaseLine {
  id: string;
  purchaseInvoiceId: string;
  description: string;
  expenseAccount: string;
  quantity: number;
  unitPrice: number;
  taxRateId?: string | null;
  baseAmount: number;
  taxAmount: number;
  totalAmount: number;
  position: number;
}

export interface EsPurchasePayment {
  id: string;
  purchaseInvoiceId: string;
  amount: number;
  paymentDate: string;
  method: 'Transferencia' | 'Tarjeta' | 'SEPA' | 'Efectivo' | 'Otro';
  status: EsPaymentStatus;
}

// Banco
export interface EsBankAccount {
  id: string;
  name: string;
  iban?: string | null;
  entity: string;
  accountCode: string;
  currency: string;
}

export interface EsBankMovement {
  id: string;
  bankAccountId: string;
  operationDate: string;
  valueDate?: string | null;
  concept: string;
  amount: number;
  balanceAfter?: number | null;
  reference?: string | null;
  matched: boolean;
}

// Gastos simples neutros (para exportar a cualquier ERP)
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



