-- Create shipping_selection_links table
CREATE TABLE public.shipping_selection_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.design_tasks(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  shipping_options JSONB NOT NULL DEFAULT '[]'::jsonb,
  dimension_info JSONB DEFAULT NULL,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  selected_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  selected_option JSONB DEFAULT NULL
);

-- Enable RLS
ALTER TABLE public.shipping_selection_links ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Public can view by token"
ON public.shipping_selection_links
FOR SELECT
USING (true);

CREATE POLICY "Public can update selection by token"
ON public.shipping_selection_links
FOR UPDATE
USING (token IS NOT NULL AND selected_at IS NULL);

CREATE POLICY "Authenticated users can insert"
ON public.shipping_selection_links
FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view all"
ON public.shipping_selection_links
FOR SELECT
USING (auth.role() = 'authenticated');

-- Create index for token lookups
CREATE INDEX idx_shipping_selection_links_token ON public.shipping_selection_links(token);
CREATE INDEX idx_shipping_selection_links_task_id ON public.shipping_selection_links(task_id);