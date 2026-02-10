-- Add assigned_to_id to schools for user assignment
ALTER TABLE public.schools
  ADD COLUMN IF NOT EXISTS assigned_to_id UUID REFERENCES auth.users(id);

CREATE INDEX IF NOT EXISTS idx_schools_assigned_to_id ON public.schools(assigned_to_id);
