-- Mock data para el ERP de contabilidad España
-- Ejecuta este archivo en el SQL Editor de Supabase (en tu proyecto) DESPUÉS de aplicar las migraciones.

-- ============================================================================
-- 1. Centros (schools) de ejemplo
-- ============================================================================

-- Usa IDs fijos para poder referenciarlos desde contratos/facturas

INSERT INTO public.schools (id, name, city, region, phone, email, contact_person, role, notes, phase, status, milestones)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'Colegio San Martín', 'Madrid', 'Comunidad de Madrid', '+34 910 000 001', 'direccion@sanmartin.es', 'Laura Gómez', 'Directora', 'Cliente de demo', 'Firmado', 'Cliente pagando', '[]'::jsonb),
  ('22222222-2222-2222-2222-222222222222', 'IES Mediterráneo', 'Valencia', 'Comunitat Valenciana', '+34 960 000 002', 'info@iesmediterraneo.es', 'Carlos Ruiz', 'Jefe de estudios', 'Período de prueba', 'Interesado', 'Periodo gratuito', '[]'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 2. Tipos de IVA, series y productos
-- ============================================================================

INSERT INTO public.es_tax_rates (code, name, percentage, is_exempt, is_default)
VALUES
  ('IVA21', 'IVA 21%', 21.00, false, true),
  ('IVA10', 'IVA 10%', 10.00, false, false),
  ('EXENTO', 'Exento', 0.00, true, false)
ON CONFLICT (code) DO NOTHING;

-- Series de facturación para 2026
INSERT INTO public.es_invoice_series (code, description, year, is_rectifying, current_number)
VALUES
  ('F', 'Serie general 2026', 2026, false, 3),
  ('R', 'Rectificativas 2026', 2026, true, 0)
ON CONFLICT (code, year, is_rectifying) DO NOTHING;

-- Productos
INSERT INTO public.es_products (name, description, income_account, tax_rate_id, is_active)
SELECT
  'Licencia CRM anual',
  'Licencia anual de Finomik CRM para centros educativos',
  '705',
  id,
  true
FROM public.es_tax_rates
WHERE code = 'IVA21'
ON CONFLICT DO NOTHING;

INSERT INTO public.es_products (name, description, income_account, tax_rate_id, is_active)
SELECT
  'Implantación y formación',
  'Implantación inicial y formación del equipo',
  '705',
  id,
  true
FROM public.es_tax_rates
WHERE code = 'IVA21'
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 3. Contratos, facturas de venta y cobros
-- ============================================================================

-- Contratos
INSERT INTO public.es_contracts (id, school_id, external_ref, start_date, end_date, frequency, status, default_tax_rate_id, payment_terms)
SELECT
  '33333333-3333-3333-3333-333333333333',
  '11111111-1111-1111-1111-111111111111',
  'CRM-2026-SANMARTIN',
  DATE '2026-01-01',
  DATE '2026-12-31',
  'Anual',
  'Activo',
  tr.id,
  '30 días'
FROM public.es_tax_rates tr
WHERE tr.code = 'IVA21'
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.es_contracts (id, school_id, external_ref, start_date, end_date, frequency, status, default_tax_rate_id, payment_terms)
SELECT
  '44444444-4444-4444-4444-444444444444',
  '22222222-2222-2222-2222-222222222222',
  'CRM-2026-MEDITERRANEO',
  DATE '2026-03-01',
  DATE '2027-02-28',
  'Mensual',
  'Activo',
  tr.id,
  '30 días'
FROM public.es_tax_rates tr
WHERE tr.code = 'IVA21'
ON CONFLICT (id) DO NOTHING;

-- Facturas emitidas (dos para San Martín, una para Mediterráneo)
WITH serie AS (
  SELECT id FROM public.es_invoice_series WHERE code = 'F' AND year = 2026 AND is_rectifying = false LIMIT 1
),
iva AS (
  SELECT id AS tax_id FROM public.es_tax_rates WHERE code = 'IVA21' LIMIT 1
)
INSERT INTO public.es_invoices (
  id, school_id, contract_id, series_id, invoice_number, full_number,
  issue_date, operation_date, due_date, currency,
  total_base, total_tax, total_amount, status
)
SELECT
  '55555555-5555-5555-5555-555555555555',
  '11111111-1111-1111-1111-111111111111',
  '33333333-3333-3333-3333-333333333333',
  serie.id,
  1,
  'F2026-000001',
  DATE '2026-01-05',
  DATE '2026-01-05',
  DATE '2026-02-04',
  'EUR',
  2000.00,
  420.00,
  2420.00,
  'Pagada'
FROM serie
ON CONFLICT (id) DO NOTHING;

WITH serie AS (
  SELECT id FROM public.es_invoice_series WHERE code = 'F' AND year = 2026 AND is_rectifying = false LIMIT 1
)
INSERT INTO public.es_invoices (
  id, school_id, contract_id, series_id, invoice_number, full_number,
  issue_date, operation_date, due_date, currency,
  total_base, total_tax, total_amount, status
)
SELECT
  '66666666-6666-6666-6666-666666666666',
  '11111111-1111-1111-1111-111111111111',
  '33333333-3333-3333-3333-333333333333',
  serie.id,
  2,
  'F2026-000002',
  DATE '2026-06-01',
  DATE '2026-06-01',
  DATE '2026-07-01',
  'EUR',
  500.00,
  105.00,
  605.00,
  'Emitida'
FROM serie
ON CONFLICT (id) DO NOTHING;

WITH serie AS (
  SELECT id FROM public.es_invoice_series WHERE code = 'F' AND year = 2026 AND is_rectifying = false LIMIT 1
)
INSERT INTO public.es_invoices (
  id, school_id, contract_id, series_id, invoice_number, full_number,
  issue_date, operation_date, due_date, currency,
  total_base, total_tax, total_amount, status
)
SELECT
  '77777777-7777-7777-7777-777777777777',
  '22222222-2222-2222-2222-222222222222',
  '44444444-4444-4444-4444-444444444444',
  serie.id,
  3,
  'F2026-000003',
  DATE '2026-03-10',
  DATE '2026-03-10',
  DATE '2026-04-09',
  'EUR',
  300.00,
  63.00,
  363.00,
  'Pagada'
FROM serie
ON CONFLICT (id) DO NOTHING;

-- Líneas de factura
WITH prod AS (
  SELECT id FROM public.es_products WHERE name = 'Licencia CRM anual' LIMIT 1
),
iva AS (
  SELECT id AS tax_id FROM public.es_tax_rates WHERE code = 'IVA21' LIMIT 1
)
INSERT INTO public.es_invoice_lines (
  id, invoice_id, product_id, description, quantity, unit_price,
  tax_rate_id, base_amount, tax_amount, total_amount, position
)
SELECT
  '88888888-8888-8888-8888-888888888888',
  '55555555-5555-5555-5555-555555555555',
  prod.id,
  'Licencia CRM anual 2026',
  1,
  2000.00,
  iva.tax_id,
  2000.00,
  420.00,
  2420.00,
  1
FROM prod, iva
ON CONFLICT (id) DO NOTHING;

WITH prod AS (
  SELECT id FROM public.es_products WHERE name = 'Implantación y formación' LIMIT 1
),
iva AS (
  SELECT id AS tax_id FROM public.es_tax_rates WHERE code = 'IVA21' LIMIT 1
)
INSERT INTO public.es_invoice_lines (
  id, invoice_id, product_id, description, quantity, unit_price,
  tax_rate_id, base_amount, tax_amount, total_amount, position
)
SELECT
  '99999999-9999-9999-9999-999999999999',
  '66666666-6666-6666-6666-666666666666',
  prod.id,
  'Formación adicional equipo comercial',
  1,
  500.00,
  iva.tax_id,
  500.00,
  105.00,
  605.00,
  1
FROM prod, iva
ON CONFLICT (id) DO NOTHING;

-- Cobros
INSERT INTO public.es_payments (id, invoice_id, amount, payment_date, method, status)
VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '55555555-5555-5555-5555-555555555555', 2420.00, DATE '2026-01-20', 'Transferencia', 'Confirmado'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '77777777-7777-7777-7777-777777777777', 363.00, DATE '2026-03-25', 'SEPA', 'Confirmado')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 4. Proveedores, facturas de compra y pagos
-- ============================================================================

INSERT INTO public.es_suppliers (id, name, tax_id, country, city, address, postal_code, email, phone, pay_terms, account_code)
VALUES
  ('aaaaaaaa-1111-1111-1111-aaaaaaaaaaaa', 'Proveedor Hosting Cloud', 'B12345678', 'ES', 'Madrid', 'Calle Nube 10', '28001', 'facturacion@hostingcloud.es', '+34 910 111 111', '30 días', '410'),
  ('bbbbbbbb-2222-2222-2222-bbbbbbbbbbbb', 'Proveedor Formación Docente', 'B87654321', 'ES', 'Barcelona', 'Avenida Aulas 5', '08001', 'admin@formaciondocente.es', '+34 930 222 222', '60 días', '400')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.es_purchase_invoices (
  id, supplier_id, invoice_number, issue_date, reception_date, due_date,
  currency, total_base, total_tax, total_amount, status
)
VALUES
  ('cccccccc-3333-3333-3333-cccccccccccc', 'aaaaaaaa-1111-1111-1111-aaaaaaaaaaaa', 'HC-2026-001',
   DATE '2026-01-02', DATE '2026-01-03', DATE '2026-02-01',
   'EUR', 600.00, 126.00, 726.00, 'Pagada'),
  ('dddddddd-4444-4444-4444-dddddddddddd', 'bbbbbbbb-2222-2222-2222-bbbbbbbbbbbb', 'FD-2026-010',
   DATE '2026-03-05', DATE '2026-03-06', DATE '2026-04-04',
   'EUR', 400.00, 84.00, 484.00, 'Parcialmente pagada')
ON CONFLICT (id) DO NOTHING;

WITH iva AS (
  SELECT id AS tax_id FROM public.es_tax_rates WHERE code = 'IVA21' LIMIT 1
)
INSERT INTO public.es_purchase_lines (
  id, purchase_invoice_id, description, expense_account,
  quantity, unit_price, tax_rate_id, base_amount, tax_amount, total_amount, position
)
SELECT
  'eeeeeeee-5555-5555-5555-eeeeeeeeeeee',
  'cccccccc-3333-3333-3333-cccccccccccc',
  'Servicio de hosting cloud enero 2026',
  '622',
  1,
  600.00,
  iva.tax_id,
  600.00,
  126.00,
  726.00,
  1
FROM iva
ON CONFLICT (id) DO NOTHING;

WITH iva AS (
  SELECT id AS tax_id FROM public.es_tax_rates WHERE code = 'IVA21' LIMIT 1
)
INSERT INTO public.es_purchase_lines (
  id, purchase_invoice_id, description, expense_account,
  quantity, unit_price, tax_rate_id, base_amount, tax_amount, total_amount, position
)
SELECT
  'ffffffff-6666-6666-6666-ffffffffffff',
  'dddddddd-4444-4444-4444-dddddddddddd',
  'Formación metodologías activas docentes',
  '627',
  1,
  400.00,
  iva.tax_id,
  400.00,
  84.00,
  484.00,
  1
FROM iva
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.es_purchase_payments (id, purchase_invoice_id, amount, payment_date, method, status)
VALUES
  ('cccccccc-aaaa-aaaa-aaaa-ccccccccaaaa', 'cccccccc-3333-3333-3333-cccccccccccc', 726.00, DATE '2026-01-20', 'Transferencia', 'Confirmado'),
  ('dddddddd-bbbb-bbbb-bbbb-ddddddddbbbb', 'dddddddd-4444-4444-4444-dddddddddddd', 242.00, DATE '2026-03-25', 'Tarjeta', 'Confirmado')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 5. Banco y movimientos
-- ============================================================================

INSERT INTO public.es_bank_accounts (id, name, iban, entity, account_code, currency)
VALUES
  ('eeeeeeee-7777-7777-7777-eeeeeeee7777', 'Cuenta principal BBVA', 'ES91 0182 0001 0201 2345 6789', 'BBVA', '572000', 'EUR')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.es_bank_movements (
  id, bank_account_id, operation_date, value_date, concept,
  amount, balance_after, reference, matched
)
VALUES
  ('ffffaaaa-8888-8888-8888-ffffaaaa8888',
   'eeeeeeee-7777-7777-7777-eeeeeeee7777',
   DATE '2026-01-20', DATE '2026-01-20',
   'Cobro factura F2026-000001 Colegio San Martín',
   2420.00, 5000.00, 'F2026-000001', true),
  ('ffffbbbb-9999-9999-9999-ffffbbbb9999',
   'eeeeeeee-7777-7777-7777-eeeeeeee7777',
   DATE '2026-01-22', DATE '2026-01-22',
   'Pago factura proveedor HC-2026-001',
   -726.00, 4274.00, 'HC-2026-001', true),
  ('ffffcccc-aaaa-bbbb-cccc-ffffccccaaaa',
   'eeeeeeee-7777-7777-7777-eeeeeeee7777',
   DATE '2026-03-25', DATE '2026-03-25',
   'Cobro factura F2026-000003 IES Mediterráneo',
   363.00, 4637.00, 'F2026-000003', true),
  ('ffffdddd-bbbb-cccc-dddd-ffffddddbbbb',
   'eeeeeeee-7777-7777-7777-eeeeeeee7777',
   DATE '2026-03-25', DATE '2026-03-25',
   'Pago parcial factura FD-2026-010',
   -242.00, 4395.00, 'FD-2026-010', true)
ON CONFLICT (id) DO NOTHING;

