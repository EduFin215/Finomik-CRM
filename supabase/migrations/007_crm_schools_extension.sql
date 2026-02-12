-- CRM: Extend schools table to act as clients (type, stage, website, location, archived)
-- Non-breaking: all new columns nullable or with defaults.

ALTER TABLE public.schools
  ADD COLUMN IF NOT EXISTS type TEXT CHECK (type IN ('school', 'company', 'partner', 'lead')),
  ADD COLUMN IF NOT EXISTS stage TEXT CHECK (stage IN ('new', 'contacted', 'meeting', 'proposal', 'negotiation', 'won', 'lost')),
  ADD COLUMN IF NOT EXISTS website TEXT,
  ADD COLUMN IF NOT EXISTS location TEXT,
  ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT false;

-- Backfill: existing rows become type 'school', stage from phase, archived false
UPDATE public.schools
SET
  type = COALESCE(type, 'school'),
  stage = CASE phase
    WHEN 'Lead' THEN 'new'
    WHEN 'Contactado' THEN 'contacted'
    WHEN 'Interesado' THEN 'meeting'
    WHEN 'Negociación' THEN 'negotiation'
    WHEN 'Cerrado' THEN 'lost'
    WHEN 'Firmado' THEN 'won'
    ELSE 'new'
  END,
  archived = COALESCE(archived, false),
  location = COALESCE(location, NULLIF(TRIM(CONCAT(COALESCE(city, ''), ', ', COALESCE(region, ''))), ','))
WHERE type IS NULL OR stage IS NULL OR archived IS NULL;

-- Indexes for CRM queries
CREATE INDEX IF NOT EXISTS idx_schools_type ON public.schools(type);
CREATE INDEX IF NOT EXISTS idx_schools_stage ON public.schools(stage);
CREATE INDEX IF NOT EXISTS idx_schools_archived ON public.schools(archived);
CREATE INDEX IF NOT EXISTS idx_schools_updated_at ON public.schools(updated_at);
CREATE INDEX IF NOT EXISTS idx_schools_created_at ON public.schools(created_at);
