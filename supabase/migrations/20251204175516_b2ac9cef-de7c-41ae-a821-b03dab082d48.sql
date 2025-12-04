-- Create table for storing size selections per quote item
CREATE TABLE public.quote_size_selections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  layout_id UUID REFERENCES design_task_layouts(id),
  item_index INTEGER NOT NULL,
  size_grid JSONB NOT NULL DEFAULT '{}',
  total_quantity INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(quote_id, item_index)
);

-- Enable RLS
ALTER TABLE public.quote_size_selections ENABLE ROW LEVEL SECURITY;

-- Public can insert size selections (for customers via link)
CREATE POLICY "Public can insert size selections"
  ON public.quote_size_selections FOR INSERT WITH CHECK (true);

-- Public can update size selections
CREATE POLICY "Public can update size selections"
  ON public.quote_size_selections FOR UPDATE USING (true);

-- Anyone can view size selections
CREATE POLICY "Anyone can view size selections"
  ON public.quote_size_selections FOR SELECT USING (true);

-- Authenticated full access
CREATE POLICY "Authenticated full access to size selections"
  ON public.quote_size_selections FOR ALL 
  USING (auth.role() = 'authenticated');

-- Trigger for updated_at
CREATE TRIGGER update_quote_size_selections_updated_at
  BEFORE UPDATE ON public.quote_size_selections
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();