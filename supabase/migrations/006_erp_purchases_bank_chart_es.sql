-- 006_erp_purchases_bank_chart_es.sql
-- Ampliación ERP Finomik - España
-- Compras/gastos, banco/conciliación, plan contable y diario general.

-- ============================================================================
-- 1. Compras / gastos (proveedores y facturas de compra)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.es_suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  tax_id TEXT,                     -- NIF/CIF proveedor
  country TEXT NOT NULL DEFAULT 'ES',
  city TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  postal_code TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  pay_terms TEXT NOT NULL DEFAULT '30 días',
  account_code TEXT NOT NULL DEFAULT '400', -- cuenta PGC por defecto: proveedores
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.es_purchase_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES public.es_suppliers(id),
  invoice_number TEXT NOT NULL,
  issue_date DATE NOT NULL,
  reception_date DATE,
  due_date DATE,
  currency TEXT NOT NULL DEFAULT 'EUR',
  total_base NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_tax NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'Pendiente'
    CHECK (status IN ('Pendiente', 'Parcialmente pagada', 'Pagada', 'Cancelada')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS es_purchase_invoices_unique_supplier_number
  ON public.es_purchase_invoices(supplier_id, invoice_number);

CREATE TABLE IF NOT EXISTS public.es_purchase_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_invoice_id UUID NOT NULL REFERENCES public.es_purchase_invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  expense_account TEXT NOT NULL DEFAULT '62', -- cuentas de servicios exteriores (genérico)
  quantity NUMERIC(12,3) NOT NULL DEFAULT 1,
  unit_price NUMERIC(12,4) NOT NULL,
  tax_rate_id UUID REFERENCES public.es_tax_rates(id),
  base_amount NUMERIC(12,2) NOT NULL,
  tax_amount NUMERIC(12,2) NOT NULL,
  total_amount NUMERIC(12,2) NOT NULL,
  position INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS public.es_purchase_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_invoice_id UUID NOT NULL REFERENCES public.es_purchase_invoices(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL,
  payment_date DATE NOT NULL,
  method TEXT NOT NULL CHECK (method IN ('Transferencia', 'Tarjeta', 'SEPA', 'Efectivo', 'Otro')),
  status TEXT NOT NULL DEFAULT 'Confirmado'
    CHECK (status IN ('Pendiente', 'Confirmado', 'Devuelto')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- 2. Banco y conciliación
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.es_bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,               -- nombre legible de la cuenta
  iban TEXT,                        -- opcional, según banco
  entity TEXT NOT NULL DEFAULT '',  -- banco
  account_code TEXT NOT NULL DEFAULT '572', -- cuenta PGC asociada
  currency TEXT NOT NULL DEFAULT 'EUR',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.es_bank_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_account_id UUID NOT NULL REFERENCES public.es_bank_accounts(id) ON DELETE CASCADE,
  operation_date DATE NOT NULL,
  value_date DATE,
  concept TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL,      -- positivo o negativo
  balance_after NUMERIC(14,2),
  reference TEXT,
  matched BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS es_bank_movements_account_date_idx
  ON public.es_bank_movements(bank_account_id, operation_date);

-- ============================================================================
-- 3. Plan contable editable y diario general
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.es_chart_of_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL,              -- p.ej. 430000, 705000, 572000
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('Activo', 'Pasivo', 'Patrimonio', 'Ingreso', 'Gasto')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  parent_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (code)
);

CREATE TABLE IF NOT EXISTS public.es_journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_date DATE NOT NULL,
  description TEXT NOT NULL,
  origin TEXT NOT NULL DEFAULT 'manual', -- manual, venta, compra, banco, etc.
  reference TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.es_journal_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id UUID NOT NULL REFERENCES public.es_journal_entries(id) ON DELETE CASCADE,
  account_code TEXT NOT NULL,              -- referencia a es_chart_of_accounts.code
  description TEXT NOT NULL DEFAULT '',
  debit NUMERIC(14,2) NOT NULL DEFAULT 0,
  credit NUMERIC(14,2) NOT NULL DEFAULT 0,
  position INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS es_journal_lines_entry_idx
  ON public.es_journal_lines(entry_id);

-- ============================================================================
-- 4. IVA: claves de operación y extensibilidad
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.es_vat_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL,        -- p.ej. 'S1', 'S2', 'E1' según criterio interno
  description TEXT NOT NULL, -- descripción libre de la clave
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (code)
);

-- Añadimos columnas opcionales en es_tax_rates para tipo de operación / clave
ALTER TABLE public.es_tax_rates
  ADD COLUMN IF NOT EXISTS operation_type TEXT, -- interior, intracomunitario, exportacion, inversion
  ADD COLUMN IF NOT EXISTS vat_key_id UUID REFERENCES public.es_vat_keys(id);

-- ============================================================================
-- 5. RLS básico (solo usuarios autenticados)
-- ============================================================================

ALTER TABLE public.es_suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.es_purchase_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.es_purchase_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.es_purchase_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.es_bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.es_bank_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.es_chart_of_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.es_journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.es_journal_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.es_vat_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users es_suppliers" ON public.es_suppliers
  FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users es_purchase_invoices" ON public.es_purchase_invoices
  FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users es_purchase_lines" ON public.es_purchase_lines
  FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users es_purchase_payments" ON public.es_purchase_payments
  FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users es_bank_accounts" ON public.es_bank_accounts
  FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users es_bank_movements" ON public.es_bank_movements
  FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users es_chart_of_accounts" ON public.es_chart_of_accounts
  FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users es_journal_entries" ON public.es_journal_entries
  FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users es_journal_lines" ON public.es_journal_lines
  FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users es_vat_keys" ON public.es_vat_keys
  FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

