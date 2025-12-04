-- Create layout_approval_links table
CREATE TABLE public.layout_approval_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.design_tasks(id) ON DELETE CASCADE,
  layout_id UUID REFERENCES public.design_task_layouts(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '30 days'),
  approved_at TIMESTAMPTZ,
  changes_requested_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create index for token lookup
CREATE INDEX idx_layout_approval_links_token ON public.layout_approval_links(token);

-- Enable RLS
ALTER TABLE public.layout_approval_links ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Public can view by token"
  ON public.layout_approval_links
  FOR SELECT
  USING (true);

CREATE POLICY "Public can update by token"
  ON public.layout_approval_links
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can insert"
  ON public.layout_approval_links
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Add source field to change_requests
ALTER TABLE public.change_requests 
ADD COLUMN source TEXT NOT NULL DEFAULT 'internal';

-- Add comment for documentation
COMMENT ON COLUMN public.change_requests.source IS 'Origin of the change request: internal (staff) or client';