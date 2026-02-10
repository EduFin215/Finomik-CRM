import { supabase } from './supabase';
import {
  EsTaxRate,
  EsInvoice,
  EsInvoiceSeries,
  EsProduct,
  EsContract,
  EsInvoiceLine,
  EsPayment,
  EsVatIssuedRow,
  EsSupplier,
  EsPurchaseInvoice,
  EsPurchaseLine,
  EsPurchasePayment,
  EsBankAccount,
  EsBankMovement,
} from '../types';

// Servicios básicos para el ERP contable España (lecturas y helpers).

export async function getEsTaxRates(): Promise<EsTaxRate[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('es_tax_rates')
    .select('*')
    .order('percentage', { ascending: true });
  if (error || !data) return [];
  return data.map((row) => ({
    id: row.id,
    code: row.code,
    name: row.name,
    percentage: Number(row.percentage),
    isExempt: row.is_exempt,
    isDefault: row.is_default,
  }));
}

export async function getEsInvoiceSeries(): Promise<EsInvoiceSeries[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('es_invoice_series')
    .select('*')
    .order('year', { ascending: false });
  if (error || !data) return [];
  return data.map((row) => ({
    id: row.id,
    code: row.code,
    description: row.description,
    year: row.year,
    isRectifying: row.is_rectifying,
    currentNumber: Number(row.current_number),
  }));
}

export async function getEsProducts(): Promise<EsProduct[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('es_products')
    .select('*')
    .order('name', { ascending: true });
  if (error || !data) return [];
  return data.map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    incomeAccount: row.income_account,
    taxRateId: row.tax_rate_id,
    isActive: row.is_active,
  }));
}

export async function getEsContractsBySchool(schoolId: string): Promise<EsContract[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('es_contracts')
    .select('*')
    .eq('school_id', schoolId)
    .order('start_date', { ascending: false });
  if (error || !data) return [];
  return data.map((row) => ({
    id: row.id,
    schoolId: row.school_id,
    externalRef: row.external_ref,
    startDate: row.start_date,
    endDate: row.end_date,
    frequency: row.frequency,
    status: row.status,
    defaultTaxRateId: row.default_tax_rate_id,
    paymentTerms: row.payment_terms,
  }));
}

export async function getEsContractsAll(): Promise<EsContract[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('es_contracts')
    .select('*, school:schools(name)')
    .order('start_date', { ascending: false });
  if (error || !data) return [];
  return data.map((row: any) => ({
    id: row.id,
    schoolId: row.school_id,
    externalRef: row.external_ref,
    startDate: row.start_date,
    endDate: row.end_date,
    frequency: row.frequency,
    status: row.status,
    defaultTaxRateId: row.default_tax_rate_id,
    paymentTerms: row.payment_terms,
    schoolName: row.school?.name ?? '',
  }));
}

export async function getEsInvoicesBySchool(schoolId: string): Promise<EsInvoice[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('es_invoices')
    .select('*')
    .eq('school_id', schoolId)
    .order('issue_date', { ascending: false });
  if (error || !data) return [];
  return data.map((row) => ({
    id: row.id,
    schoolId: row.school_id,
    contractId: row.contract_id,
    seriesId: row.series_id,
    invoiceNumber: Number(row.invoice_number),
    fullNumber: row.full_number,
    issueDate: row.issue_date,
    operationDate: row.operation_date,
    dueDate: row.due_date,
    currency: row.currency,
    totalBase: Number(row.total_base),
    totalTax: Number(row.total_tax),
    totalAmount: Number(row.total_amount),
    status: row.status,
  }));
}

export async function getEsInvoicesAll(): Promise<EsInvoice[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('es_invoices')
    .select('*, school:schools(name)')
    .order('issue_date', { ascending: false });
  if (error || !data) return [];
  return data.map((row: any) => ({
    id: row.id,
    schoolId: row.school_id,
    contractId: row.contract_id,
    seriesId: row.series_id,
    invoiceNumber: Number(row.invoice_number),
    fullNumber: row.full_number,
    issueDate: row.issue_date,
    operationDate: row.operation_date,
    dueDate: row.due_date,
    currency: row.currency,
    totalBase: Number(row.total_base),
    totalTax: Number(row.total_tax),
    totalAmount: Number(row.total_amount),
    status: row.status,
    schoolName: row.school?.name ?? '',
  }));
}

export async function getEsInvoiceLines(invoiceId: string): Promise<EsInvoiceLine[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('es_invoice_lines')
    .select('*')
    .eq('invoice_id', invoiceId)
    .order('position', { ascending: true });
  if (error || !data) return [];
  return data.map((row) => ({
    id: row.id,
    invoiceId: row.invoice_id,
    productId: row.product_id,
    description: row.description,
    quantity: Number(row.quantity),
    unitPrice: Number(row.unit_price),
    taxRateId: row.tax_rate_id,
    baseAmount: Number(row.base_amount),
    taxAmount: Number(row.tax_amount),
    totalAmount: Number(row.total_amount),
    position: row.position,
  }));
}

export async function getEsPaymentsByInvoice(invoiceId: string): Promise<EsPayment[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('es_payments')
    .select('*')
    .eq('invoice_id', invoiceId)
    .order('payment_date', { ascending: false });
  if (error || !data) return [];
  return data.map((row) => ({
    id: row.id,
    invoiceId: row.invoice_id,
    amount: Number(row.amount),
    paymentDate: row.payment_date,
    method: row.method,
    status: row.status,
  }));
}

export interface EsVatIssuedParams {
  fromDate: string; // YYYY-MM-DD
  toDate: string;   // YYYY-MM-DD
}

export async function getEsVatIssued(params: EsVatIssuedParams): Promise<EsVatIssuedRow[]> {
  if (!supabase) return [];
  const { fromDate, toDate } = params;
  const { data, error } = await supabase
    .from('es_vat_issued_view')
    .select('*')
    .gte('issue_date', fromDate)
    .lte('issue_date', toDate);
  if (error || !data) return [];
  return data.map((row: any) => ({
    invoiceId: row.invoice_id,
    fullNumber: row.full_number,
    issueDate: row.issue_date,
    operationDate: row.operation_date,
    schoolId: row.school_id,
    schoolName: row.school_name,
    schoolTaxId: row.school_tax_id,
    taxRateId: row.tax_rate_id,
    taxCode: row.tax_code,
    taxPercentage: Number(row.tax_percentage ?? 0),
    baseAmount: Number(row.base_amount ?? 0),
    taxAmount: Number(row.tax_amount ?? 0),
  }));
}

// --- Proveedores y compras ---

export async function getEsSuppliers(): Promise<EsSupplier[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from('es_suppliers').select('*').order('name', { ascending: true });
  if (error || !data) return [];
  return data.map((row: any) => ({
    id: row.id,
    name: row.name,
    taxId: row.tax_id,
    country: row.country,
    city: row.city,
    address: row.address,
    postalCode: row.postal_code,
    email: row.email,
    phone: row.phone,
    payTerms: row.pay_terms,
    accountCode: row.account_code,
  }));
}

export async function getEsPurchaseInvoicesAll(): Promise<EsPurchaseInvoice[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('es_purchase_invoices')
    .select('*, supplier:es_suppliers(name)')
    .order('issue_date', { ascending: false });
  if (error || !data) return [];
  return data.map((row: any) => ({
    id: row.id,
    supplierId: row.supplier_id,
    supplierName: row.supplier?.name ?? '',
    invoiceNumber: row.invoice_number,
    issueDate: row.issue_date,
    receptionDate: row.reception_date,
    dueDate: row.due_date,
    currency: row.currency,
    totalBase: Number(row.total_base),
    totalTax: Number(row.total_tax),
    totalAmount: Number(row.total_amount),
    status: row.status,
  }));
}

export async function getEsPurchaseLines(purchaseInvoiceId: string): Promise<EsPurchaseLine[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('es_purchase_lines')
    .select('*')
    .eq('purchase_invoice_id', purchaseInvoiceId)
    .order('position', { ascending: true });
  if (error || !data) return [];
  return data.map((row: any) => ({
    id: row.id,
    purchaseInvoiceId: row.purchase_invoice_id,
    description: row.description,
    expenseAccount: row.expense_account,
    quantity: Number(row.quantity),
    unitPrice: Number(row.unit_price),
    taxRateId: row.tax_rate_id,
    baseAmount: Number(row.base_amount),
    taxAmount: Number(row.tax_amount),
    totalAmount: Number(row.total_amount),
    position: row.position,
  }));
}

export async function getEsPurchasePayments(purchaseInvoiceId: string): Promise<EsPurchasePayment[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('es_purchase_payments')
    .select('*')
    .eq('purchase_invoice_id', purchaseInvoiceId)
    .order('payment_date', { ascending: false });
  if (error || !data) return [];
  return data.map((row: any) => ({
    id: row.id,
    purchaseInvoiceId: row.purchase_invoice_id,
    amount: Number(row.amount),
    paymentDate: row.payment_date,
    method: row.method,
    status: row.status,
  }));
}

// --- Banco y conciliación ---

export async function getEsBankAccounts(): Promise<EsBankAccount[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from('es_bank_accounts').select('*').order('name', { ascending: true });
  if (error || !data) return [];
  return data.map((row: any) => ({
    id: row.id,
    name: row.name,
    iban: row.iban,
    entity: row.entity,
    accountCode: row.account_code,
    currency: row.currency,
  }));
}

export async function getEsBankMovements(
  bankAccountId: string,
  fromDate: string,
  toDate: string
): Promise<EsBankMovement[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('es_bank_movements')
    .select('*')
    .eq('bank_account_id', bankAccountId)
    .gte('operation_date', fromDate)
    .lte('operation_date', toDate)
    .order('operation_date', { ascending: true });
  if (error || !data) return [];
  return data.map((row: any) => ({
    id: row.id,
    bankAccountId: row.bank_account_id,
    operationDate: row.operation_date,
    valueDate: row.value_date,
    concept: row.concept,
    amount: Number(row.amount),
    balanceAfter: row.balance_after != null ? Number(row.balance_after) : null,
    reference: row.reference,
    matched: row.matched,
  }));
}



