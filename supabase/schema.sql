-- Finomik CRM: Schema for Supabase (PostgreSQL)
-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor)

-- Enum types matching TypeScript (stored as text with check)
-- Phase and CommercialStatus are application enums; we use text + check for simplicity.

-- Schools (centros/leads)
CREATE TABLE IF NOT EXISTS schools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  city TEXT NOT NULL DEFAULT '',
  region TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL,
  contact_person TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  phase TEXT NOT NULL DEFAULT 'Lead' CHECK (phase IN ('Lead', 'Contactado', 'Interesado', 'Negociación', 'Cerrado', 'Firmado')),
  status TEXT NOT NULL DEFAULT 'N/A' CHECK (status IN ('Periodo gratuito', 'Cliente pagando', 'N/A')),
  milestones JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Activities (historial por escuela)
CREATE TABLE IF NOT EXISTS activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('Llamada', 'Email', 'Reunión', 'Nota')),
  description TEXT NOT NULL,
  date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tasks (tareas/reuniones por escuela)
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  due_date DATE NOT NULL,
  due_time TEXT,
  priority TEXT NOT NULL DEFAULT 'Media' CHECK (priority IN ('Baja', 'Media', 'Alta')),
  completed BOOLEAN NOT NULL DEFAULT false,
  assigned_to TEXT NOT NULL DEFAULT 'Current User',
  is_meeting BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_activities_school_id ON activities(school_id);
CREATE INDEX IF NOT EXISTS idx_tasks_school_id ON tasks(school_id);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_schools_phase ON schools(phase);
CREATE INDEX IF NOT EXISTS idx_schools_email ON schools(email);

-- RLS: enable and allow all for anon (development). Restrict by auth.uid() when you add auth.
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Policies: allow read/write for anon (so the app works without login). Replace with auth.uid() later.
CREATE POLICY "Allow all for schools" ON schools FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for activities" ON activities FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for tasks" ON tasks FOR ALL USING (true) WITH CHECK (true);

-- Optional: trigger to update updated_at on schools
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS schools_updated_at ON schools;
CREATE TRIGGER schools_updated_at
  BEFORE UPDATE ON schools
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at();

-- ============================================================================
-- ERP contable España (facturación básica + IVA) - mínimas tablas de soporte
-- Nota: las versiones avanzadas viven en supabase/migrations/005_accounting_es.sql
-- ============================================================================

CREATE TABLE IF NOT EXISTS es_tax_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  percentage NUMERIC(5,2) NOT NULL,
  is_exempt BOOLEAN NOT NULL DEFAULT false,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS es_invoice_series (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL,
  description TEXT,
  year SMALLINT NOT NULL,
  is_rectifying BOOLEAN NOT NULL DEFAULT false,
  current_number BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS es_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  income_account TEXT NOT NULL DEFAULT '705',
  tax_rate_id UUID REFERENCES es_tax_rates(id),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS es_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  external_ref TEXT,
  start_date DATE NOT NULL,
  end_date DATE,
  frequency TEXT NOT NULL CHECK (frequency IN ('Mensual', 'Trimestral', 'Anual')),
  status TEXT NOT NULL DEFAULT 'Activo' CHECK (status IN ('Activo', 'Pendiente', 'Cancelado', 'Finalizado')),
  default_tax_rate_id UUID REFERENCES es_tax_rates(id),
  payment_terms TEXT NOT NULL DEFAULT '30 días',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- Módulo de gastos neutro (ERP-ready, exportable por CSV/Excel)
-- ============================================================================

CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Datos básicos del documento
  document_number TEXT,
  date DATE NOT NULL,
  due_date DATE,
  description TEXT NOT NULL,
  -- Contrapartes y clasificación
  supplier_name TEXT NOT NULL,
  supplier_tax_id TEXT,
  account_code TEXT NOT NULL DEFAULT '629', -- cuenta de gasto genérica por defecto
  cost_center TEXT,
  -- Importe y divisa
  currency TEXT NOT NULL DEFAULT 'EUR',
  amount_base NUMERIC(12,2) NOT NULL,
  tax_rate NUMERIC(5,2) NOT NULL DEFAULT 21.00,
  tax_amount NUMERIC(12,2) NOT NULL,
  total_amount NUMERIC(12,2) NOT NULL,
  -- Pago
  payment_method TEXT NOT NULL DEFAULT 'Transferencia',
  paid BOOLEAN NOT NULL DEFAULT false,
  paid_date DATE,
  -- Vínculo opcional con un centro del CRM
  school_id UUID REFERENCES schools(id) ON DELETE SET NULL,
  -- Export a ERP
  exported_at TIMESTAMPTZ,
  -- Auditoría mínima
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
CREATE INDEX IF NOT EXISTS idx_expenses_paid ON expenses(paid);
CREATE INDEX IF NOT EXISTS idx_expenses_school_id ON expenses(school_id);

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for expenses" ON expenses FOR ALL USING (true) WITH CHECK (true);

-- Trigger de updated_at para expenses reutilizando la función existente
DROP TRIGGER IF EXISTS expenses_updated_at ON expenses;
CREATE TRIGGER expenses_updated_at
  BEFORE UPDATE ON expenses
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at();

-- ============================================================================
-- Módulo de documentos de empresa (enlaces organizados por categoría)
-- ============================================================================

CREATE TABLE IF NOT EXISTS document_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES document_categories(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  owner TEXT NOT NULL DEFAULT '',
  document_type TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_documents_category_id ON documents(category_id);
CREATE INDEX IF NOT EXISTS idx_document_categories_name ON document_categories(name);

ALTER TABLE document_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for document_categories" ON document_categories FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for documents" ON documents FOR ALL USING (true) WITH CHECK (true);

DROP TRIGGER IF EXISTS documents_updated_at ON documents;
CREATE TRIGGER documents_updated_at
  BEFORE UPDATE ON documents
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at();
