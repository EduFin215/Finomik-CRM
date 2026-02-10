-- Restrict audit_log inserts to the trigger only (SECURITY DEFINER).
-- Removes the permissive INSERT policy so users cannot insert directly.
DROP POLICY IF EXISTS "System can insert audit_log" ON public.audit_log;
