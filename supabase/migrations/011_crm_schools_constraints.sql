-- CRM: Tighten schools columns after backfill (defaults for new rows)
ALTER TABLE public.schools
  ALTER COLUMN type SET DEFAULT 'school',
  ALTER COLUMN archived SET DEFAULT false;

-- Ensure stage has default for new inserts (existing rows already backfilled)
UPDATE public.schools SET stage = COALESCE(stage, 'new') WHERE stage IS NULL;
