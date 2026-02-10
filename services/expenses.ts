import { supabase, isSupabaseConfigured } from './supabase';
import type { Expense } from '../types';

export interface ExpenseRow {
  id: string;
  document_number: string | null;
  date: string;
  due_date: string | null;
  description: string;
  supplier_name: string;
  supplier_tax_id: string | null;
  account_code: string;
  cost_center: string | null;
  currency: string;
  amount_base: number;
  tax_rate: number;
  tax_amount: number;
  total_amount: number;
  payment_method: string;
  paid: boolean;
  paid_date: string | null;
  school_id: string | null;
  exported_at: string | null;
  created_at: string;
  created_by: string | null;
  updated_at: string;
}

function mapExpense(row: ExpenseRow): Expense {
  return {
    id: String(row.id),
    documentNumber: row.document_number,
    date: String(row.date),
    dueDate: row.due_date,
    description: String(row.description),
    supplierName: String(row.supplier_name),
    supplierTaxId: row.supplier_tax_id,
    accountCode: String(row.account_code),
    costCenter: row.cost_center,
    currency: String(row.currency),
    amountBase: Number(row.amount_base),
    taxRate: Number(row.tax_rate),
    taxAmount: Number(row.tax_amount),
    totalAmount: Number(row.total_amount),
    paymentMethod: String(row.payment_method),
    paid: Boolean(row.paid),
    paidDate: row.paid_date,
    schoolId: row.school_id,
    exportedAt: row.exported_at,
    createdAt: String(row.created_at),
    createdBy: row.created_by,
    updatedAt: String(row.updated_at),
  };
}

function toExpenseRow(row: Record<string, unknown>): ExpenseRow {
  return row as unknown as ExpenseRow;
}

function expenseToInsertRow(expense: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>): Record<string, unknown> {
  return {
    document_number: expense.documentNumber ?? null,
    date: expense.date,
    due_date: expense.dueDate ?? null,
    description: expense.description,
    supplier_name: expense.supplierName,
    supplier_tax_id: expense.supplierTaxId ?? null,
    account_code: expense.accountCode,
    cost_center: expense.costCenter ?? null,
    currency: expense.currency,
    amount_base: expense.amountBase,
    tax_rate: expense.taxRate,
    tax_amount: expense.taxAmount,
    total_amount: expense.totalAmount,
    payment_method: expense.paymentMethod,
    paid: expense.paid,
    paid_date: expense.paidDate ?? null,
    school_id: expense.schoolId ?? null,
  };
}

export async function getExpenses(params?: {
  fromDate?: string;
  toDate?: string;
  onlyUnexported?: boolean;
}): Promise<Expense[]> {
  if (!isSupabaseConfigured() || !supabase) return [];

  let query = supabase.from('expenses').select('*').order('date', { ascending: false });

  if (params?.fromDate) {
    query = query.gte('date', params.fromDate);
  }
  if (params?.toDate) {
    query = query.lte('date', params.toDate);
  }
  if (params?.onlyUnexported) {
    query = query.is('exported_at', null);
  }

  const { data, error } = await query;
  if (error || !data) {
    console.error('getExpenses error', error);
    return [];
  }
  return (data as Record<string, unknown>[]).map((r) => mapExpense(toExpenseRow(r)));
}

export async function createExpense(
  partial: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<Expense | null> {
  if (!isSupabaseConfigured() || !supabase) return null;

  const row = expenseToInsertRow(partial);
  const { data, error } = await supabase.from('expenses').insert(row).select().single();
  if (error || !data) {
    console.error('createExpense error', error);
    return null;
  }
  return mapExpense(toExpenseRow(data as Record<string, unknown>));
}

export async function updateExpense(
  id: string,
  partial: Partial<Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>>,
): Promise<Expense | null> {
  if (!isSupabaseConfigured() || !supabase) return null;

  const row: Record<string, unknown> = {};
  if (partial.documentNumber !== undefined) row.document_number = partial.documentNumber;
  if (partial.date !== undefined) row.date = partial.date;
  if (partial.dueDate !== undefined) row.due_date = partial.dueDate;
  if (partial.description !== undefined) row.description = partial.description;
  if (partial.supplierName !== undefined) row.supplier_name = partial.supplierName;
  if (partial.supplierTaxId !== undefined) row.supplier_tax_id = partial.supplierTaxId;
  if (partial.accountCode !== undefined) row.account_code = partial.accountCode;
  if (partial.costCenter !== undefined) row.cost_center = partial.costCenter;
  if (partial.currency !== undefined) row.currency = partial.currency;
  if (partial.amountBase !== undefined) row.amount_base = partial.amountBase;
  if (partial.taxRate !== undefined) row.tax_rate = partial.taxRate;
  if (partial.taxAmount !== undefined) row.tax_amount = partial.taxAmount;
  if (partial.totalAmount !== undefined) row.total_amount = partial.totalAmount;
  if (partial.paymentMethod !== undefined) row.payment_method = partial.paymentMethod;
  if (partial.paid !== undefined) row.paid = partial.paid;
  if (partial.paidDate !== undefined) row.paid_date = partial.paidDate;
  if (partial.schoolId !== undefined) row.school_id = partial.schoolId;
  if (partial.exportedAt !== undefined) row.exported_at = partial.exportedAt;

  const { data, error } = await supabase.from('expenses').update(row).eq('id', id).select().single();
  if (error || !data) {
    console.error('updateExpense error', error);
    return null;
  }
  return mapExpense(toExpenseRow(data as Record<string, unknown>));
}

export async function markExpensesExported(ids: string[]): Promise<void> {
  if (!isSupabaseConfigured() || !supabase || ids.length === 0) return;
  const now = new Date().toISOString();
  const { error } = await supabase.from('expenses').update({ exported_at: now }).in('id', ids);
  if (error) {
    console.error('markExpensesExported error', error);
  }
}

// Construye filas neutrales para exportar o enviar por API en el futuro
export function buildAccountingExportRows(expenses: Expense[]): Array<Record<string, unknown>> {
  return expenses.map((e) => ({
    Date: e.date,
    DocumentNumber: e.documentNumber ?? '',
    SupplierName: e.supplierName,
    SupplierTaxId: e.supplierTaxId ?? '',
    AccountCode: e.accountCode,
    Description: e.description,
    BaseAmount: e.amountBase,
    TaxAmount: e.taxAmount,
    TaxRate: e.taxRate,
    TotalAmount: e.totalAmount,
    Currency: e.currency,
    CostCenter: e.costCenter ?? '',
    Paid: e.paid,
    PaymentMethod: e.paymentMethod,
    SchoolId: e.schoolId ?? '',
    ExportedAt: e.exportedAt ?? '',
  }));
}

