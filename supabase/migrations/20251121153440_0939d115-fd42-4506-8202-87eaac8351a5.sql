-- Create tags table for reusable segment and model tags
CREATE TABLE IF NOT EXISTS public.tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tag_value TEXT NOT NULL UNIQUE,
  tag_type TEXT NOT NULL CHECK (tag_type IN ('segment_tag', 'model_tag')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default tags
INSERT INTO public.tags (tag_value, tag_type) VALUES
  ('energia_solar', 'segment_tag'),
  ('agro', 'segment_tag'),
  ('futevoelei', 'segment_tag'),
  ('ziper', 'model_tag'),
  ('manga_longa', 'model_tag'),
  ('manga_curta', 'model_tag'),
  ('regata', 'model_tag')
ON CONFLICT (tag_value) DO NOTHING;

-- Enable RLS
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins podem gerenciar tags"
  ON public.tags FOR ALL
  USING (auth.role() = 'authenticated');

CREATE POLICY "Tags são públicas para leitura"
  ON public.tags FOR SELECT
  USING (true);