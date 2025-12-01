-- Create task_rejections table
CREATE TABLE public.task_rejections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES design_tasks(id) ON DELETE CASCADE,
  rejected_by UUID REFERENCES auth.users(id),
  reason_type TEXT NOT NULL,
  reason_text TEXT,
  resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.task_rejections ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can view task rejections"
ON public.task_rejections
FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Designers can insert task rejections"
ON public.task_rejections
FOR INSERT
WITH CHECK (auth.role() = 'authenticated' AND rejected_by = auth.uid());

CREATE POLICY "Authenticated users can update task rejections"
ON public.task_rejections
FOR UPDATE
USING (auth.role() = 'authenticated');

-- Add index for performance
CREATE INDEX idx_task_rejections_task_id ON public.task_rejections(task_id);
CREATE INDEX idx_task_rejections_resolved ON public.task_rejections(resolved);