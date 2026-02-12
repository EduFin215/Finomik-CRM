-- Finance tool (simple): contracts, invoices, expenses, settings
-- No accounting/ERP/tax logic. Optional external sync fields.

-- finance_contracts
CREATE TABLE IF NOT EXISTS public.finance_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.schools(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  frequency TEXT NOT NULL CHECK (frequency IN ('monthly', 'quarterly', 'yearly')),
  amount NUMERIC(14, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'pending', 'cancelled', 'ended')),
  external_source TEXT,
  external_id TEXT,
  synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_finance_contracts_client_id ON public.finance_contracts(client_id);
CREATE INDEX IF NOT EXISTS idx_finance_contracts_status ON public.finance_contracts(status);
CREATE INDEX IF NOT EXISTS idx_finance_contracts_start_date ON public.finance_contracts(start_date);

-- finance_invoices
CREATE TABLE IF NOT EXISTS public.finance_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID REFERENCES public.finance_contracts(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  amount NUMERIC(14, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR',
  issue_date DATE NOT NULL,
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')),
  external_source TEXT,
  external_id TEXT,
  synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_finance_invoices_contract_id ON public.finance_invoices(contract_id);
CREATE INDEX IF NOT EXISTS idx_finance_invoices_issue_date ON public.finance_invoices(issue_date);
CREATE INDEX IF NOT EXISTS idx_finance_invoices_due_date ON public.finance_invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_finance_invoices_status ON public.finance_invoices(status);

-- finance_expenses (new simple schema; distinct from existing expenses table)
CREATE TABLE IF NOT EXISTS public.finance_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  vendor TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'other',
  amount NUMERIC(14, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR',
  date DATE NOT NULL,
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled')),
  is_recurring BOOLEAN NOT NULL DEFAULT false,
  recurrence_rule TEXT,
  external_source TEXT,
  external_id TEXT,
  synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_finance_expenses_date ON public.finance_expenses(date);
CREATE INDEX IF NOT EXISTS idx_finance_expenses_category ON public.finance_expenses(category);
CREATE INDEX IF NOT EXISTS idx_finance_expenses_status ON public.finance_expenses(status);
CREATE INDEX IF NOT EXISTS idx_finance_expenses_is_recurring ON public.finance_expenses(is_recurring);

-- finance_settings (singleton row)
CREATE TABLE IF NOT EXISTS public.finance_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  starting_cash NUMERIC(14, 2),
  default_currency TEXT NOT NULL DEFAULT 'EUR',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ensure single row (application uses first row)
INSERT INTO public.finance_settings (id, default_currency, updated_at)
SELECT gen_random_uuid(), 'EUR', now()
WHERE NOT EXISTS (SELECT 1 FROM public.finance_settings LIMIT 1);

ALTER TABLE public.finance_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users finance_contracts" ON public.finance_contracts
  FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users finance_invoices" ON public.finance_invoices
  FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users finance_expenses" ON public.finance_expenses
  FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users finance_settings" ON public.finance_settings
  FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

DROP TRIGGER IF EXISTS finance_contracts_updated_at ON public.finance_contracts;
CREATE TRIGGER finance_contracts_updated_at
  BEFORE UPDATE ON public.finance_contracts
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at();

DROP TRIGGER IF EXISTS finance_invoices_updated_at ON public.finance_invoices;
CREATE TRIGGER finance_invoices_updated_at
  BEFORE UPDATE ON public.finance_invoices
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at();

DROP TRIGGER IF EXISTS finance_expenses_updated_at ON public.finance_expenses;
CREATE TRIGGER finance_expenses_updated_at
  BEFORE UPDATE ON public.finance_expenses
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at();

DROP TRIGGER IF EXISTS finance_settings_updated_at ON public.finance_settings;
CREATE TRIGGER finance_settings_updated_at
  BEFORE UPDATE ON public.finance_settings
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at();
