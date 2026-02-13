-- 015_resource_folders_backfill.sql
-- Crea subcarpetas bajo Leads para todos los clientes (schools) existentes

DO $$
DECLARE
  leads_folder_id UUID;
  s RECORD;
BEGIN
  SELECT id INTO leads_folder_id
  FROM public.resource_folders
  WHERE name = 'Leads' AND parent_id IS NULL
  LIMIT 1;

  IF leads_folder_id IS NULL THEN
    RAISE NOTICE 'Carpeta Leads no encontrada. Ejecuta 014_resource_folders.sql primero.';
    RETURN;
  END IF;

  FOR s IN SELECT id, name FROM public.schools
  WHERE NOT EXISTS (
    SELECT 1 FROM public.resource_folders rf
    WHERE rf.school_id = schools.id
  )
  LOOP
    INSERT INTO public.resource_folders (parent_id, name, school_id)
    VALUES (leads_folder_id, s.name, s.id);
  END LOOP;
END $$;
