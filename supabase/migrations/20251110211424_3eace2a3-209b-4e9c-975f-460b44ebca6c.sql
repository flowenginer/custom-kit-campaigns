-- Create workflow_templates table
CREATE TABLE public.workflow_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  workflow_config JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.workflow_templates ENABLE ROW LEVEL SECURITY;

-- Admin full access to workflow_templates
CREATE POLICY "Admin full access to workflow_templates"
ON public.workflow_templates
FOR ALL
USING (auth.role() = 'authenticated');

-- Create trigger for updated_at
CREATE TRIGGER update_workflow_templates_updated_at
BEFORE UPDATE ON public.workflow_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Update campaigns table default workflow_config to include new fields
ALTER TABLE public.campaigns 
ALTER COLUMN workflow_config 
SET DEFAULT '[
  {"id": "initial_data", "label": "Dados Iniciais", "order": 0, "enabled": true, "is_custom": false},
  {"id": "select_model", "label": "Selecionar Modelo", "order": 1, "enabled": true, "is_custom": false},
  {"id": "customize_front", "label": "Personalizar Frente", "order": 2, "enabled": true, "is_custom": false},
  {"id": "customize_back", "label": "Personalizar Costas", "order": 3, "enabled": true, "is_custom": false},
  {"id": "sleeve_right", "label": "Manga Direita", "order": 4, "enabled": true, "is_custom": false},
  {"id": "sleeve_left", "label": "Manga Esquerda", "order": 5, "enabled": true, "is_custom": false},
  {"id": "review", "label": "Revisão e Envio", "order": 6, "enabled": true, "is_custom": false}
]'::jsonb;