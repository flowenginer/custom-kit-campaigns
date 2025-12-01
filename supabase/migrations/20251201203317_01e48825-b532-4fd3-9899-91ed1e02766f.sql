-- Criar tabela de segmentos de negócio
CREATE TABLE public.business_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT '🏢',
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Adicionar campos na tabela leads
ALTER TABLE public.leads 
ADD COLUMN business_segment_id UUID REFERENCES public.business_segments(id),
ADD COLUMN business_segment_other TEXT;

-- Habilitar RLS
ALTER TABLE public.business_segments ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Anyone can view active business segments"
ON public.business_segments FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage business segments"
ON public.business_segments FOR ALL
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION public.update_business_segments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER update_business_segments_updated_at
BEFORE UPDATE ON public.business_segments
FOR EACH ROW
EXECUTE FUNCTION public.update_business_segments_updated_at();

-- Inserir alguns segmentos iniciais
INSERT INTO public.business_segments (name, icon, display_order) VALUES
('Jardinagem', '🌱', 1),
('Lavanderia', '🧺', 2),
('Piscinas', '🏊', 3),
('Pedras Ornamentais', '🪨', 4),
('Limpeza', '🧹', 5),
('Alimentação', '🍽️', 6),
('Construção Civil', '🏗️', 7),
('Automotivo', '🚗', 8),
('Pet Shop', '🐕', 9),
('Academia', '💪', 10);