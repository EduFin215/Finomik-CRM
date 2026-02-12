-- Work tasks: daily execution engine (separate from school-scoped tasks)
-- Tables: work_tasks, work_task_links, work_task_notifications

-- work_tasks
CREATE TABLE IF NOT EXISTS public.work_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'done', 'archived')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  due_at TIMESTAMPTZ,
  remind_at TIMESTAMPTZ,
  assignee_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  completed_at TIMESTAMPTZ,
  reminder_notified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_work_tasks_status ON public.work_tasks(status);
CREATE INDEX IF NOT EXISTS idx_work_tasks_due_at ON public.work_tasks(due_at);
CREATE INDEX IF NOT EXISTS idx_work_tasks_remind_at ON public.work_tasks(remind_at);
CREATE INDEX IF NOT EXISTS idx_work_tasks_assignee_user_id ON public.work_tasks(assignee_user_id);
CREATE INDEX IF NOT EXISTS idx_work_tasks_updated_at ON public.work_tasks(updated_at);

ALTER TABLE public.work_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users work_tasks"
  ON public.work_tasks FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- Trigger for updated_at (reuse existing function)
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS work_tasks_updated_at ON public.work_tasks;
CREATE TRIGGER work_tasks_updated_at
  BEFORE UPDATE ON public.work_tasks
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at();

-- work_task_links
CREATE TABLE IF NOT EXISTS public.work_task_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.work_tasks(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('client', 'deal', 'project', 'internal')),
  entity_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_work_task_links_task_id ON public.work_task_links(task_id);
CREATE INDEX IF NOT EXISTS idx_work_task_links_entity ON public.work_task_links(entity_type, entity_id);

ALTER TABLE public.work_task_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users work_task_links"
  ON public.work_task_links FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- work_task_notifications (for reminders)
CREATE TABLE IF NOT EXISTS public.work_task_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  work_task_id UUID NOT NULL REFERENCES public.work_tasks(id) ON DELETE CASCADE,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_work_task_notifications_user_id ON public.work_task_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_work_task_notifications_work_task_id ON public.work_task_notifications(work_task_id);

ALTER TABLE public.work_task_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users work_task_notifications"
  ON public.work_task_notifications FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);
