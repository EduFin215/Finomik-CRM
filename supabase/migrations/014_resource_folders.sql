-- 014_resource_folders.sql
-- Carpetas para Resources: Leads, Finanzas, Documentación Legal, subcarpetas por cliente

-- ============================================================================
-- 1. Tabla resource_folders
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.resource_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID REFERENCES public.resource_folders(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  school_id UUID REFERENCES public.schools(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_resource_folders_parent_id ON public.resource_folders(parent_id);
CREATE INDEX IF NOT EXISTS idx_resource_folders_school_id ON public.resource_folders(school_id);

ALTER TABLE public.resource_folders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for resource_folders" ON public.resource_folders FOR ALL USING (true) WITH CHECK (true);

DROP TRIGGER IF EXISTS resource_folders_updated_at ON public.resource_folders;
CREATE TRIGGER resource_folders_updated_at
  BEFORE UPDATE ON public.resource_folders
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at();

-- ============================================================================
-- 2. Añadir folder_id a resources
-- ============================================================================

ALTER TABLE public.resources
  ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES public.resource_folders(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_resources_folder_id ON public.resources(folder_id);

-- ============================================================================
-- 3. Insertar carpetas predefinidas (Leads, Finanzas, Documentación Legal)
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.resource_folders WHERE name = 'Leads' AND parent_id IS NULL) THEN
    INSERT INTO public.resource_folders (name, parent_id, school_id) VALUES ('Leads', NULL, NULL);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.resource_folders WHERE name = 'Finanzas' AND parent_id IS NULL) THEN
    INSERT INTO public.resource_folders (name, parent_id, school_id) VALUES ('Finanzas', NULL, NULL);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.resource_folders WHERE name = 'Documentación Legal' AND parent_id IS NULL) THEN
    INSERT INTO public.resource_folders (name, parent_id, school_id) VALUES ('Documentación Legal', NULL, NULL);
  END IF;
END $$;

-- ============================================================================
-- 4. Trigger: crear subcarpeta bajo Leads al insertar un school (cliente)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.on_school_insert_create_folder()
RETURNS TRIGGER AS $$
DECLARE
  leads_folder_id UUID;
BEGIN
  SELECT id INTO leads_folder_id
  FROM public.resource_folders
  WHERE name = 'Leads' AND parent_id IS NULL
  LIMIT 1;
  IF leads_folder_id IS NOT NULL THEN
    INSERT INTO public.resource_folders (parent_id, name, school_id)
    VALUES (leads_folder_id, NEW.name, NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_school_insert_create_folder ON public.schools;
CREATE TRIGGER on_school_insert_create_folder
  AFTER INSERT ON public.schools
  FOR EACH ROW EXECUTE FUNCTION public.on_school_insert_create_folder();
