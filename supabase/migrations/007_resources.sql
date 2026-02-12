-- 007_resources.sql
-- Módulo Resources: enlaces centralizados con vinculación a entidades

-- ============================================================================
-- 1. Tabla resources
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  normalized_title TEXT,
  url TEXT NOT NULL CHECK (url ~ '^https?://'),
  source TEXT NOT NULL DEFAULT 'other'
    CHECK (source IN ('google_drive', 'canva', 'figma', 'notion', 'loom', 'other')),
  type TEXT NOT NULL
    CHECK (type IN ('logo', 'contract', 'deck', 'template', 'report', 'image', 'video', 'spreadsheet', 'doc', 'other')),
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'final', 'archived')),
  version TEXT,
  owner_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  description TEXT,
  ai_summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Trigger: normalized_title = lower(trim(title))
CREATE OR REPLACE FUNCTION public.resources_normalize_title()
RETURNS TRIGGER AS $$
BEGIN
  NEW.normalized_title = lower(trim(NEW.title));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS resources_normalize_title ON public.resources;
CREATE TRIGGER resources_normalize_title
  BEFORE INSERT OR UPDATE OF title ON public.resources
  FOR EACH ROW EXECUTE FUNCTION public.resources_normalize_title();

-- Trigger: updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS resources_updated_at ON public.resources;
CREATE TRIGGER resources_updated_at
  BEFORE UPDATE ON public.resources
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at();

-- ============================================================================
-- 2. Tabla resource_links
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.resource_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id UUID NOT NULL REFERENCES public.resources(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL
    CHECK (entity_type IN ('client', 'deal', 'project', 'task', 'internal')),
  entity_id UUID,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Trigger: al marcar is_primary=true, desmarcar otros del mismo (entity_type, entity_id, resource.type)
CREATE OR REPLACE FUNCTION public.resource_links_unset_other_primary()
RETURNS TRIGGER AS $$
DECLARE
  res_type TEXT;
BEGIN
  IF NEW.is_primary = true THEN
    SELECT r.type INTO res_type FROM public.resources r WHERE r.id = NEW.resource_id;
    UPDATE public.resource_links rl
    SET is_primary = false
    WHERE rl.id != NEW.id
      AND rl.entity_type = NEW.entity_type
      AND (rl.entity_id IS NOT DISTINCT FROM NEW.entity_id)
      AND EXISTS (
        SELECT 1 FROM public.resources r
        WHERE r.id = rl.resource_id AND r.type = res_type
      );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS resource_links_unset_other_primary ON public.resource_links;
CREATE TRIGGER resource_links_unset_other_primary
  BEFORE INSERT OR UPDATE OF is_primary ON public.resource_links
  FOR EACH ROW EXECUTE FUNCTION public.resource_links_unset_other_primary();

-- ============================================================================
-- 3. Tabla resource_aliases
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.resource_aliases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id UUID NOT NULL REFERENCES public.resources(id) ON DELETE CASCADE,
  alias TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- 4. Índices
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_resources_normalized_title ON public.resources(normalized_title);
CREATE INDEX IF NOT EXISTS idx_resources_type ON public.resources(type);
CREATE INDEX IF NOT EXISTS idx_resources_status ON public.resources(status);
CREATE INDEX IF NOT EXISTS idx_resources_created_at ON public.resources(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_resource_links_entity ON public.resource_links(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_resource_links_resource_id ON public.resource_links(resource_id);

CREATE INDEX IF NOT EXISTS idx_resource_aliases_resource_id ON public.resource_aliases(resource_id);
CREATE INDEX IF NOT EXISTS idx_resource_aliases_alias ON public.resource_aliases(lower(alias));

-- Full-text index para búsqueda
CREATE INDEX IF NOT EXISTS idx_resources_fts ON public.resources
  USING GIN (to_tsvector('spanish', coalesce(title, '') || ' ' || coalesce(description, '') || ' ' || coalesce(ai_summary, '')));

-- ============================================================================
-- 5. RLS y políticas
-- ============================================================================

ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resource_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resource_aliases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for resources" ON public.resources FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for resource_links" ON public.resource_links FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for resource_aliases" ON public.resource_aliases FOR ALL USING (true) WITH CHECK (true);
