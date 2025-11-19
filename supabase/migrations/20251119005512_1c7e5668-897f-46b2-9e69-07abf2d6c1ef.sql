-- Tabela para armazenar configurações de tema por campanha
CREATE TABLE IF NOT EXISTS public.campaign_themes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL UNIQUE REFERENCES public.campaigns(id) ON DELETE CASCADE,
  
  -- Cores principais
  theme_primary_color VARCHAR(7) DEFAULT '#4F9CF9',
  theme_background_color VARCHAR(7) DEFAULT '#FAFBFF',
  theme_text_color VARCHAR(7) DEFAULT '#1A1F36',
  theme_accent_color VARCHAR(7) DEFAULT '#34A853',
  
  -- Tipografia
  theme_heading_font VARCHAR(100) DEFAULT 'Inter',
  theme_body_font VARCHAR(100) DEFAULT 'Inter',
  theme_font_size_base VARCHAR(10) DEFAULT '16px',
  
  -- Espaçamento e layout
  theme_border_radius VARCHAR(10) DEFAULT '12px',
  theme_spacing_unit VARCHAR(10) DEFAULT '8px',
  
  -- Botões
  theme_button_style VARCHAR(20) DEFAULT 'rounded' CHECK (theme_button_style IN ('rounded', 'square', 'pill')),
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.campaign_themes ENABLE ROW LEVEL SECURITY;

-- Políticas RLS - todos podem ler temas (pois são públicos nas campanhas)
CREATE POLICY "Temas são públicos para leitura"
ON public.campaign_themes
FOR SELECT
USING (true);

-- Apenas admins podem criar/editar temas (será validado pela aplicação)
CREATE POLICY "Admins podem gerenciar temas"
ON public.campaign_themes
FOR ALL
USING (true)
WITH CHECK (true);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_campaign_themes_updated_at
BEFORE UPDATE ON public.campaign_themes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Índice para melhor performance
CREATE INDEX idx_campaign_themes_campaign_id ON public.campaign_themes(campaign_id);