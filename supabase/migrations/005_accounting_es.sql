-- 005_accounting_es.sql
-- ERP contable Finomik - España
-- Tablas para facturación, IVA y cobros según contexto español (PGC / IVA).

-- Tipos de IVA españoles (21%, 10%, 4%, exento, etc.)
CREATE TABLE IF NOT EXISTS public.es_tax_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL,                 -- p.ej. IVA21, IVA10, IVA4, EXENTO
  name TEXT NOT NULL,                 -- p.ej. "IVA 21%"
  percentage NUMERIC(5,2) NOT NULL,   -- 21.00, 10.00, 4.00, 0.00
  is_exempt BOOLEAN NOT NULL DEFAULT false,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS es_tax_rates_code_unique
  ON public.es_tax_rates(code);

-- Series de facturación (por ejercicio y tipo)
CREATE TABLE IF NOT EXISTS public.es_invoice_series (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL,            -- p.ej. "F", "R"
  description TEXT,
  year SMALLINT NOT NULL,
  is_rectifying BOOLEAN NOT NULL DEFAULT false,
  current_number BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (code, year, is_rectifying)
);

-- Productos/servicios (planes, formaciones, etc.)
CREATE TABLE IF NOT EXISTS public.es_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  income_account TEXT NOT NULL DEFAULT '705', -- cuenta PGC por defecto: Prestación de servicios
  tax_rate_id UUID REFERENCES public.es_tax_rates(id),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Contratos / suscripciones a partir de ventas ganadas en el CRM
CREATE TABLE IF NOT EXISTS public.es_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  external_ref TEXT,                          -- referencia CRM / contrato externo
  start_date DATE NOT NULL,
  end_date DATE,
  frequency TEXT NOT NULL CHECK (frequency IN ('Mensual', 'Trimestral', 'Anual')),
  status TEXT NOT NULL DEFAULT 'Activo' CHECK (status IN ('Activo', 'Pendiente', 'Cancelado', 'Finalizado')),
  default_tax_rate_id UUID REFERENCES public.es_tax_rates(id),
  payment_terms TEXT NOT NULL DEFAULT '30 días',  -- condiciones de pago
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS es_contracts_school_id_idx
  ON public.es_contracts(school_id);

-- Facturas emitidas
CREATE TABLE IF NOT EXISTS public.es_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id),
  contract_id UUID REFERENCES public.es_contracts(id),
  series_id UUID NOT NULL REFERENCES public.es_invoice_series(id),
  invoice_number BIGINT NOT NULL,                 -- número correlativo dentro de la serie
  full_number TEXT NOT NULL,                      -- p.ej. "F2026-000123"
  issue_date DATE NOT NULL,                       -- fecha de expedición
  operation_date DATE NOT NULL,                   -- fecha de operación (devengo IVA)
  due_date DATE,
  currency TEXT NOT NULL DEFAULT 'EUR',
  total_base NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_tax NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'Borrador'
    CHECK (status IN ('Borrador', 'Emitida', 'Pagada', 'Vencida', 'Cancelada')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (series_id, invoice_number)
);

CREATE INDEX IF NOT EXISTS es_invoices_school_id_idx
  ON public.es_invoices(school_id);

CREATE INDEX IF NOT EXISTS es_invoices_issue_date_idx
  ON public.es_invoices(issue_date);

-- Líneas de factura
CREATE TABLE IF NOT EXISTS public.es_invoice_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.es_invoices(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.es_products(id),
  description TEXT NOT NULL,
  quantity NUMERIC(12,3) NOT NULL DEFAULT 1,
  unit_price NUMERIC(12,4) NOT NULL,
  tax_rate_id UUID REFERENCES public.es_tax_rates(id),
  base_amount NUMERIC(12,2) NOT NULL,
  tax_amount NUMERIC(12,2) NOT NULL,
  total_amount NUMERIC(12,2) NOT NULL,
  position INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS es_invoice_lines_invoice_id_idx
  ON public.es_invoice_lines(invoice_id);

-- Cobros asociados a facturas
CREATE TABLE IF NOT EXISTS public.es_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.es_invoices(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL,
  payment_date DATE NOT NULL,
  method TEXT NOT NULL CHECK (method IN ('Transferencia', 'Tarjeta', 'SEPA', 'Otro')),
  status TEXT NOT NULL DEFAULT 'Confirmado'
    CHECK (status IN ('Pendiente', 'Confirmado', 'Devuelto')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS es_payments_invoice_id_idx
  ON public.es_payments(invoice_id);

-- Vista básica para libro de facturas expedidas (base para modelos 303/390)
CREATE OR REPLACE VIEW public.es_vat_issued_view AS
SELECT
  inv.id                            AS invoice_id,
  inv.full_number,
  inv.issue_date,
  inv.operation_date,
  inv.school_id,
  sch.name                          AS school_name,
  sch.tax_id                        AS school_tax_id, -- requiere columna en schools si se desea
  ln.tax_rate_id,
  tr.code                           AS tax_code,
  tr.percentage                     AS tax_percentage,
  SUM(ln.base_amount)               AS base_amount,
  SUM(ln.tax_amount)                AS tax_amount
FROM public.es_invoices inv
JOIN public.es_invoice_lines ln ON ln.invoice_id = inv.id
LEFT JOIN public.es_tax_rates tr ON tr.id = ln.tax_rate_id
LEFT JOIN public.schools sch ON sch.id = inv.school_id
WHERE inv.status IN ('Emitida', 'Pagada', 'Vencida')
GROUP BY
  inv.id,
  inv.full_number,
  inv.issue_date,
  inv.operation_date,
  inv.school_id,
  sch.name,
  sch.tax_id,
  ln.tax_rate_id,
  tr.code,
  tr.percentage;

-- RLS: solo usuarios autenticados (política similar a CRM)
ALTER TABLE public.es_tax_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.es_invoice_series ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.es_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.es_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.es_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.es_invoice_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.es_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users es_tax_rates" ON public.es_tax_rates
  FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users es_invoice_series" ON public.es_invoice_series
  FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users es_products" ON public.es_products
  FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users es_contracts" ON public.es_contracts
  FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users es_invoices" ON public.es_invoices
  FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users es_invoice_lines" ON public.es_invoice_lines
  FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users es_payments" ON public.es_payments
  FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

